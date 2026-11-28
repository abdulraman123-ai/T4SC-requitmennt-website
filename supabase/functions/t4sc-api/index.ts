import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { scoreObjectiveAnswers } from "./_shared/assessment-scoring.ts";
import { hashAttemptToken, isResponsePayload, isResponseVersion } from "./_shared/attempt-security.ts";
import { validateApplicationV1 } from "./_shared/application-validation.ts";
import { constantTimeEqual, sha256Hex } from "./_shared/proxy-security.ts";

const departments = ["AI & Machine Learning","Game Development","Full Stack Development & System Architecture","Cybersecurity & Systems Security"];
const levels = ["Beginner","Developing","Experienced","Advanced"];
const allowedPathways = ["general","department","practical"];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});
function validEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function validUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
async function ensureApplicationOwner(
  db: ReturnType<typeof createClient>,
  application: { id: string; auth_user_id?: string | null },
  user: { id: string; email?: string | null },
  requestedEmail: string,
): Promise<boolean> {
  const normalizedEmail = requestedEmail.trim().toLowerCase();
  if (!user.email || user.email.trim().toLowerCase() !== normalizedEmail) return false;
  if (application.auth_user_id) return application.auth_user_id === user.id;

  const { data: claimed, error: claimError } = await db.from("applications")
    .update({ auth_user_id: user.id })
    .eq("id", application.id)
    .is("auth_user_id", null)
    .select("id")
    .maybeSingle();
  if (claimError) return false;
  if (claimed) return true;

  const { data: current, error: currentError } = await db.from("applications")
    .select("auth_user_id")
    .eq("id", application.id)
    .maybeSingle();
  return !currentError && current?.auth_user_id === user.id;
}

function receipt(data: { id: string; submitted_at: string; scoring_status: string }, pathway: string) {
  return {
    ok: true,
    receipt: { id: data.id, submittedAt: data.submitted_at, pathway },
    scoringStatus: data.scoring_status,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 250_000) return json({ error: "Request is too large." }, 413);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "The private T4SC database connection is not ready." }, 503);
    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const authorization = request.headers.get("authorization") || "";
    const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
    let authenticatedApplicant: { id: string; email?: string | null; email_confirmed_at?: string | null } | null = null;
    if (bearerToken && bearerToken !== serviceRoleKey) {
      const { data: authData, error: authError } = await db.auth.getUser(bearerToken);
      if (!authError && authData.user?.email_confirmed_at) {
        authenticatedApplicant = authData.user;
      }
    }

    const body = await request.json();

    const proxyProtectedAction =
      (body.action === "application_submit" && body.applicationSchemaVersion === "t4sc-application-v1") ||
      ["attempt_start", "attempt_read", "attempt_save", "offer_respond", "community_access"].includes(body.action) ||
      (body.action === "assessment_submit" && (body.attemptId !== undefined || body.attemptToken !== undefined));

    if (proxyProtectedAction) {
      const suppliedProxySecret = request.headers.get("x-t4sc-api-proxy-secret") || "";
      if (suppliedProxySecret.length < 32) {
        return json({ error: "This request must use the authorised T4SC application server." }, 401);
      }
      const suppliedHash = await sha256Hex(suppliedProxySecret);
      const { data: proxySecret, error: proxySecretError } = await db.from("private_system_secrets")
        .select("secret_sha256")
        .eq("secret_name", "next_api_proxy")
        .maybeSingle();
      if (proxySecretError || !proxySecret || !constantTimeEqual(suppliedHash, proxySecret.secret_sha256)) {
        return json({ error: "This request must use the authorised T4SC application server." }, 401);
      }
    }

    if (body.action === "application_submit") {
      const newSchema = body.applicationSchemaVersion === "t4sc-application-v1";
      if (body.applicationSchemaVersion && !newSchema) {
        return json({ error: "This application form version is no longer supported. Refresh the page and try again." }, 400);
      }

      if (newSchema) {
        const validation = validateApplicationV1(body);
        if (!validation.ok) return json({ error: validation.error }, 400);
        const app = validation.value;
        if (!authenticatedApplicant || !authenticatedApplicant.email ||
            authenticatedApplicant.email.trim().toLowerCase() !== app.email) {
          return json({ error: "Sign in with the verified email address used in this application." }, 401);
        }

        const { data, error } = await db.from("applications").insert({
          auth_user_id: authenticatedApplicant.id,
          full_name: app.preferredName,
          preferred_name: app.preferredName,
          email: app.email,
          country: app.country,
          region: app.region,
          department: app.primaryDepartment,
          secondary_interest: app.alternativeDepartment,
          why_department: null,
          assessment_level: app.experienceLevel,
          experience: app.experienceDescription,
          tools_topics: null,
          motivation: app.motivation,
          problem_to_solve: null,
          learning_goals: app.learningGoals,
          work_sample_url: app.workSampleUrl,
          weekly_availability: app.weeklyAvailability,
          session_availability: null,
          session_details: null,
          device_access: null,
          internet_access: null,
          alternative_contact: null,
          rules_accepted: true,
          honesty_accepted: true,
          privacy_accepted: true,
          accessibility_needs: app.accessibilityNeeds,
          application_schema_version: app.applicationSchemaVersion,
          declaration_version: app.declarationVersion,
          privacy_notice_version: app.privacyNoticeVersion,
          status: "submitted",
        }).select("reference").single();
        if (error) return json({ error: "We could not save your application. Please try again later." }, 503);
        return json({ reference: data.reference }, 201);
      }

      // Backward compatibility for the older production form while this feature
      // branch is reviewed and merged. New-form submissions use the versioned
      // schema above; the legacy path is removed after the old client is retired.
      const legacyRequired = ["preferredName","email","country","region","primaryDepartment","whyDepartment","experienceLevel","triedBuilt","motivation","problemToSolve","weeklyAvailability","sessionAvailability","deviceAccess","internetAccess"];
      for (const field of legacyRequired) if (typeof body[field] !== "string" || !body[field].trim()) return json({ error: "Please complete all required fields." }, 400);
      if (!validEmail(body.email)) return json({ error: "Enter a valid email address." }, 400);
      if (!departments.includes(body.primaryDepartment) || !levels.includes(body.experienceLevel)) return json({ error: "Choose a valid department and experience level." }, 400);
      if (body.secondaryInterest && (!departments.includes(body.secondaryInterest) || body.secondaryInterest === body.primaryDepartment)) return json({ error: "Choose a different alternative department." }, 400);
      if (!body.rulesAccepted || !body.honestyAccepted || !body.privacyAccepted) return json({ error: "Please accept the community rules and honesty declaration." }, 400);
      const { data, error } = await db.from("applications").insert({
        full_name: body.preferredName.trim(), preferred_name: body.preferredName.trim(),
        email: body.email.trim().toLowerCase(), country: body.country.trim(), region: body.region.trim(),
        alternative_contact: body.alternativeContact || null, department: body.primaryDepartment,
        secondary_interest: body.secondaryInterest || null, why_department: body.whyDepartment,
        assessment_level: body.experienceLevel, experience: body.triedBuilt, tools_topics: body.toolsTopics || null,
        motivation: body.motivation, problem_to_solve: body.problemToSolve,
        weekly_availability: body.weeklyAvailability, session_availability: body.sessionAvailability,
        session_details: body.sessionDetails || null, device_access: body.deviceAccess, internet_access: body.internetAccess,
        rules_accepted: true, honesty_accepted: true, privacy_accepted: true,
        accessibility_needs: body.accessibilityNeeds || null, status: "submitted",
        application_schema_version: "legacy-v2",
      }).select("reference").single();
      if (error) return json({ error: "We could not save your application. Please try again later." }, 503);
      return json({ reference: data.reference }, 201);
    }


    if (body.action === "community_access") {
      if (!authenticatedApplicant) {
        return json({ error: "Sign in with your verified applicant account to access the community." }, 401);
      }

      // Resolve the application from the verified Auth identity, never from a
      // client-supplied reference, email, application ID or status.
      const { data: ownedApplications, error: ownedApplicationsError } = await db.from("applications")
        .select("id")
        .eq("auth_user_id", authenticatedApplicant.id)
        .limit(100);
      if (ownedApplicationsError) {
        return json({ error: "We could not verify your T4SC membership. Please retry." }, 503);
      }
      const applicationIds = (ownedApplications ?? []).map((item: { id: string }) => item.id);
      if (applicationIds.length === 0) {
        return json({ error: "Community access is available only to applicants who have accepted a T4SC offer." }, 403);
      }

      const [admissionsResult, offersResult] = await Promise.all([
        db.from("application_admissions")
          .select("application_id")
          .in("application_id", applicationIds)
          .eq("status", "offer_accepted"),
        db.from("admission_offers")
          .select("application_id")
          .in("application_id", applicationIds)
          .eq("status", "accepted"),
      ]);
      if (admissionsResult.error || offersResult.error) {
        return json({ error: "We could not verify your accepted offer. Please retry." }, 503);
      }

      const acceptedOfferApplicationIds = new Set(
        (offersResult.data ?? []).map((item: { application_id: string }) => item.application_id)
      );
      const hasAcceptedOffer = (admissionsResult.data ?? []).some(
        (item: { application_id: string }) => acceptedOfferApplicationIds.has(item.application_id)
      );
      if (!hasAcceptedOffer) {
        return json({ error: "Community access is available only after your T4SC admission offer has been accepted." }, 403);
      }

      return json({ eligible: true });
    }

    if (body.action === "status_lookup") {
      if (typeof body.reference !== "string" || !validEmail(body.email)) return json({ error: "Enter your application reference and a valid email address." }, 400);
      const { data, error } = await db.from("applications").select("id,auth_user_id,reference,preferred_name,status,created_at,updated_at")
        .eq("reference", body.reference.trim().toUpperCase())
        .eq("email", body.email.trim().toLowerCase()).maybeSingle();
      if (error || !data) return json({ error: "We could not find an application matching those details." }, 404);

      let verifiedOwner = false;
      if (data.auth_user_id || authenticatedApplicant) {
        if (!authenticatedApplicant || !(await ensureApplicationOwner(db, data, authenticatedApplicant, body.email))) {
          return json({ error: "We could not find an application matching those details." }, 404);
        }
        verifiedOwner = true;
      }

      let admissions: Record<string, unknown> | null = null;
      let offer: Record<string, unknown> | null = null;
      if (verifiedOwner) {
        const [admissionsResult, offerResult] = await Promise.all([
          db.from("application_admissions")
            .select("status,active_department,reason_codes,ruleset_version,updated_at")
            .eq("application_id", data.id).maybeSingle(),
          db.from("admission_offers")
            .select("id,department,status,issued_at,expires_at,responded_at,resolved_at,notification_status")
            .eq("application_id", data.id).maybeSingle(),
        ]);
        if (admissionsResult.error || offerResult.error) {
          return json({ error: "We could not load your private admissions details. Please retry." }, 503);
        }
        admissions = admissionsResult.data ? {
          status: admissionsResult.data.status,
          activeDepartment: admissionsResult.data.active_department,
          reasonCodes: admissionsResult.data.reason_codes,
          rulesetVersion: admissionsResult.data.ruleset_version,
          updatedAt: admissionsResult.data.updated_at,
        } : null;
        offer = offerResult.data ? {
          id: offerResult.data.id,
          department: offerResult.data.department,
          status: offerResult.data.status,
          issuedAt: offerResult.data.issued_at,
          expiresAt: offerResult.data.expires_at,
          respondedAt: offerResult.data.responded_at,
          resolvedAt: offerResult.data.resolved_at,
          notificationStatus: offerResult.data.notification_status,
        } : null;
      }

      return json({
        application: {
          reference: data.reference, preferred_name: data.preferred_name, status: data.status,
          created_at: data.created_at, updated_at: data.updated_at,
        },
        admissions,
        offer,
      });
    }

    if (body.action === "offer_respond") {
      if (typeof body.reference !== "string" || !validEmail(body.email) ||
          !validUuid(body.offerId) || !["accept","decline"].includes(body.response)) {
        return json({ error: "Offer response details are incomplete." }, 400);
      }
      if (!authenticatedApplicant ||
          authenticatedApplicant.email?.trim().toLowerCase() !== body.email.trim().toLowerCase()) {
        return json({ error: "Sign in with the verified applicant account linked to this offer." }, 403);
      }

      const { data: application, error: applicationError } = await db.from("applications")
        .select("id,auth_user_id")
        .eq("reference", body.reference.trim().toUpperCase())
        .eq("email", body.email.trim().toLowerCase()).maybeSingle();
      if (applicationError || !application) return json({ error: "We could not verify this application." }, 404);
      if (!(await ensureApplicationOwner(db, application, authenticatedApplicant, body.email))) {
        return json({ error: "We could not verify this application." }, 404);
      }

      const { data: offer, error: responseError } = await db.rpc("t4sc_respond_to_admission_offer", {
        p_offer_id: body.offerId,
        p_application_id: application.id,
        p_response: body.response,
      });
      if (responseError) {
        return json({ error: "We could not process this offer response. Refresh the portal to check its current status." }, 409);
      }
      const record = Array.isArray(offer) ? offer[0] : offer;
      if (!record || typeof record !== "object") {
        return json({ error: "The offer response could not be confirmed. Refresh the portal before trying again." }, 503);
      }

      const [{ data: admissionsState, error: stateError }, { data: currentApplication, error: currentApplicationError }] = await Promise.all([
        db.from("application_admissions").select("status,active_department,reason_codes,ruleset_version,updated_at")
          .eq("application_id", application.id).maybeSingle(),
        db.from("applications").select("status").eq("id", application.id).maybeSingle(),
      ]);
      if (stateError || currentApplicationError) {
        return json({ error: "Your offer response was recorded, but the latest status could not be loaded. Refresh the portal." }, 503);
      }

      return json({
        offer: {
          id: record.id, department: record.department, status: record.status,
          issuedAt: record.issued_at, expiresAt: record.expires_at,
          respondedAt: record.responded_at, resolvedAt: record.resolved_at,
        },
        admissions: admissionsState ? {
          status: admissionsState.status, activeDepartment: admissionsState.active_department,
          reasonCodes: admissionsState.reason_codes, rulesetVersion: admissionsState.ruleset_version,
          updatedAt: admissionsState.updated_at,
        } : null,
        applicationStatus: currentApplication?.status ?? null,
      });
    }

    
if (body.action === "attempt_start") {
      if (typeof body.reference !== "string" || !validEmail(body.email) ||
          !allowedPathways.includes(body.pathway) ||
          !validUuid(body.idempotencyKey) || !validUuid(body.attemptToken)) {
        return json({ error: "Assessment start details are incomplete." }, 400);
      }

      const { data: application, error: lookupError } = await db.from("applications")
        .select("id,reference,department,assessment_level,auth_user_id")
        .eq("reference", body.reference.trim().toUpperCase())
        .eq("email", body.email.trim().toLowerCase()).maybeSingle();
      if (lookupError || !application) return json({ error: "We could not verify this application. Check your reference and email." }, 404);
      if (!authenticatedApplicant || !(await ensureApplicationOwner(db, application, authenticatedApplicant, body.email))) {
        return json({ error: "Sign in with the verified account linked to this application." }, 403);
      }

      const level = application.assessment_level;
      const department = application.department;
      if (!levels.includes(level) || !departments.includes(department)) return json({ error: "The application assessment route is not configured correctly." }, 409);
      if (body.pathway === "department" && body.department !== department) {
        return json({ error: "This assessment does not match the primary department on your application." }, 403);
      }

      const pathway = body.pathway === "department" ? "department: " + department : body.pathway;
      const { data: finalSubmission, error: submissionLookupError } = await db.from("assessment_submissions")
        .select("id").eq("application_id", application.id).eq("pathway", pathway).maybeSingle();
      if (submissionLookupError) return json({ error: "We could not verify whether this assessment was already submitted." }, 503);
      if (finalSubmission) return json({ error: "This assessment has already been submitted. Its official attempt is locked." }, 409);

      if (body.pathway === "department" || body.pathway === "practical") {
        const prerequisite = body.pathway === "department" ? "general" : "department: " + department;
        const { data: previous, error } = await db.from("assessment_submissions").select("id")
          .eq("application_id", application.id).eq("pathway", prerequisite).maybeSingle();
        if (error || !previous) return json({ error: "Complete the previous assessment before starting this component." }, 409);
      }

      const tokenHash = await hashAttemptToken(body.attemptToken);
      const { data: existing, error: existingError } = await db.from("assessment_attempts")
        .select("id,pathway,level,status,idempotency_key,attempt_token_hash,response,response_version,started_at,expires_at,last_saved_at,submitted_at")
        .eq("application_id", application.id).eq("pathway", pathway).maybeSingle();
      if (existingError) return json({ error: "We could not verify the assessment attempt. Please retry." }, 503);
      if (existing) {
        if (existing.idempotency_key === body.idempotencyKey && existing.attempt_token_hash === tokenHash) {
          return json({
            attempt: {
              id: existing.id, pathway: existing.pathway, level: existing.level, status: existing.status,
              response: existing.response, responseVersion: existing.response_version,
              startedAt: existing.started_at, expiresAt: existing.expires_at,
              lastSavedAt: existing.last_saved_at, submittedAt: existing.submitted_at,
            },
            repeatedRequest: true,
          }, 200);
        }
        return json({ error: "An official attempt already exists for this component. Resume it on the device where it was started, or contact T4SC support for a verified technical/accessibility issue." }, 409);
      }

      const now = new Date().toISOString();
      const { data: attempt, error: insertError } = await db.from("assessment_attempts").insert({
        application_id: application.id,
        pathway,
        level,
        attempt_number: 1,
        status: "active",
        idempotency_key: body.idempotencyKey,
        attempt_token_hash: tokenHash,
        response: {},
        response_version: 0,
        started_at: now,
        expires_at: null,
      }).select("id,pathway,level,status,response,response_version,started_at,expires_at,last_saved_at,submitted_at").single();

      if (insertError) {
        if (insertError.code === "23505") {
          const { data: raced } = await db.from("assessment_attempts")
            .select("id,pathway,level,status,idempotency_key,attempt_token_hash,response,response_version,started_at,expires_at,last_saved_at,submitted_at")
            .eq("application_id", application.id).eq("pathway", pathway).maybeSingle();
          if (raced && raced.idempotency_key === body.idempotencyKey && raced.attempt_token_hash === tokenHash) {
            return json({
              attempt: {
                id: raced.id, pathway: raced.pathway, level: raced.level, status: raced.status,
                response: raced.response, responseVersion: raced.response_version,
                startedAt: raced.started_at, expiresAt: raced.expires_at,
                lastSavedAt: raced.last_saved_at, submittedAt: raced.submitted_at,
              },
              repeatedRequest: true,
            }, 200);
          }
          return json({ error: "An official attempt already exists for this component." }, 409);
        }
        return json({ error: "We could not create your assessment attempt. No attempt was started; please retry." }, 503);
      }

      return json({
        attempt: {
          id: attempt.id, pathway: attempt.pathway, level: attempt.level, status: attempt.status,
          response: attempt.response, responseVersion: attempt.response_version,
          startedAt: attempt.started_at, expiresAt: attempt.expires_at,
          lastSavedAt: attempt.last_saved_at, submittedAt: attempt.submitted_at,
        },
      }, 201);
    }

    if (body.action === "attempt_read" || body.action === "attempt_save") {
      if (typeof body.reference !== "string" || !validEmail(body.email) ||
          !validUuid(body.attemptId) || !validUuid(body.attemptToken)) {
        return json({ error: "Assessment attempt credentials are incomplete." }, 400);
      }

      const { data: application, error: lookupError } = await db.from("applications").select("id,auth_user_id")
        .eq("reference", body.reference.trim().toUpperCase())
        .eq("email", body.email.trim().toLowerCase()).maybeSingle();
      if (lookupError || !application) return json({ error: "We could not verify this application. Check your reference and email." }, 404);
      if (!authenticatedApplicant || !(await ensureApplicationOwner(db, application, authenticatedApplicant, body.email))) {
        return json({ error: "Sign in with the verified account linked to this application." }, 403);
      }

      const tokenHash = await hashAttemptToken(body.attemptToken);
      const { data: attempt, error: attemptError } = await db.from("assessment_attempts")
        .select("id,pathway,level,status,attempt_number,attempt_token_hash,response,response_version,started_at,expires_at,last_saved_at,submitted_at")
        .eq("id", body.attemptId).eq("application_id", application.id).maybeSingle();
      if (attemptError || !attempt || attempt.attempt_token_hash !== tokenHash) {
        return json({ error: "We could not verify this assessment attempt. Return to the applicant portal or contact T4SC support." }, 403);
      }

      if (body.action === "attempt_read") {
        return json({
          attempt: {
            id: attempt.id, pathway: attempt.pathway, level: attempt.level, status: attempt.status,
            attemptNumber: attempt.attempt_number, response: attempt.response,
            responseVersion: attempt.response_version, startedAt: attempt.started_at,
            expiresAt: attempt.expires_at, lastSavedAt: attempt.last_saved_at,
            submittedAt: attempt.submitted_at,
          },
        });
      }

      if (attempt.status !== "active") {
        return json({ error: "This assessment attempt is not active and cannot be changed." }, 409);
      }
      const { data: existingFinalSubmission, error: finalSubmissionError } = await db.from("assessment_submissions")
        .select("id").eq("application_id", application.id).eq("pathway", attempt.pathway).maybeSingle();
      if (finalSubmissionError) return json({ error: "We could not verify the final submission state. Retry after refreshing the attempt." }, 503);
      if (existingFinalSubmission) {
        const submittedAt = new Date().toISOString();
        await db.from("assessment_attempts").update({
          status: "submitted", submitted_at: submittedAt, updated_at: submittedAt,
        }).eq("id", attempt.id).eq("status", "active");
        return json({ error: "This assessment has already been submitted. The official attempt is locked." }, 409);
      }
      if (!isResponseVersion(body.responseVersion) || !isResponsePayload(body.response)) {
        return json({ error: "The response checkpoint is invalid or too large. Your previous confirmed save is unchanged." }, 400);
      }
      if (body.responseVersion <= attempt.response_version) {
        return json({
          saved: true, stale: true, responseVersion: attempt.response_version,
          lastSavedAt: attempt.last_saved_at, status: attempt.status,
        }, 200);
      }

      const savedAt = new Date().toISOString();
      const { data: saved, error: saveError } = await db.from("assessment_attempts")
        .update({
          response: body.response,
          response_version: body.responseVersion,
          last_saved_at: savedAt,
          updated_at: savedAt,
        })
        .eq("id", attempt.id)
        .eq("application_id", application.id)
        .eq("attempt_token_hash", tokenHash)
        .eq("status", "active")
        .lt("response_version", body.responseVersion)
        .select("response_version,last_saved_at,status")
        .maybeSingle();

      if (saveError) return json({ error: "We could not confirm that save. Your previous confirmed checkpoint remains available; please retry." }, 503);
      if (!saved) {
        const { data: latest, error: latestError } = await db.from("assessment_attempts")
          .select("response_version,last_saved_at,status")
          .eq("id", attempt.id).eq("application_id", application.id).maybeSingle();
        if (latestError || !latest || latest.status !== "active") {
          return json({ error: "The assessment state changed before this save could be confirmed. Reload the attempt state." }, 409);
        }
        if (latest.response_version >= body.responseVersion) {
          return json({ saved: true, stale: true, responseVersion: latest.response_version, lastSavedAt: latest.last_saved_at, status: latest.status }, 200);
        }
        return json({ error: "The save was not confirmed. Please retry." }, 503);
      }

      return json({
        saved: true, stale: false, responseVersion: saved.response_version,
        lastSavedAt: saved.last_saved_at, status: saved.status,
      }, 200);
    }

    if (body.action === "assessment_submit") {
      if (typeof body.reference !== "string" || !validEmail(body.email) ||
          !allowedPathways.includes(body.pathway) ||
          !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) {
        return json({ error: "Assessment details are incomplete." }, 400);
      }
      if (body.idempotencyKey !== undefined && !validUuid(body.idempotencyKey)) {
        return json({ error: "Invalid submission reference. Refresh the assessment and try again." }, 400);
      }

      const { data: application, error: lookupError } = await db.from("applications")
        .select("id,reference,department,assessment_level,auth_user_id")
        .eq("reference", body.reference.trim().toUpperCase())
        .eq("email", body.email.trim().toLowerCase()).maybeSingle();
      if (lookupError || !application) return json({ error: "We could not verify this application. Check your reference and email." }, 404);
      if (body.attemptId !== undefined || body.attemptToken !== undefined) {
        if (!authenticatedApplicant || !(await ensureApplicationOwner(db, application, authenticatedApplicant, body.email))) {
          return json({ error: "Sign in with the verified account linked to this application." }, 403);
        }
      }

      const level = application.assessment_level;
      const department = application.department;
      if (!levels.includes(level) || !departments.includes(department)) return json({ error: "The application assessment route is not configured correctly." }, 409);
      if (body.pathway === "department" && body.department !== department) {
        return json({ error: "This assessment does not match the primary department on your application." }, 403);
      }

      const pathway = body.pathway === "department" ? "department: " + department : body.pathway;
      const idempotencyKey = validUuid(body.idempotencyKey) ? body.idempotencyKey : null;

      let activeAttempt: { id: string; status: string; response: Record<string, unknown>; responseVersion: number } | null = null;
      if (body.attemptId !== undefined || body.attemptToken !== undefined) {
        if (!validUuid(body.attemptId) || !validUuid(body.attemptToken)) {
          return json({ error: "Assessment attempt credentials are incomplete." }, 400);
        }
        const tokenHash = await hashAttemptToken(body.attemptToken);
        const { data: attempt, error: attemptError } = await db.from("assessment_attempts")
          .select("id,pathway,status,attempt_token_hash,response,response_version")
          .eq("id", body.attemptId).eq("application_id", application.id).maybeSingle();
        if (attemptError || !attempt || attempt.attempt_token_hash !== tokenHash || attempt.pathway !== pathway) {
          return json({ error: "We could not verify this assessment attempt. Resume from the applicant portal or contact T4SC support." }, 403);
        }
        if (attempt.status !== "active" && attempt.status !== "submitted") {
          return json({ error: "This assessment attempt is not active and cannot be submitted." }, 409);
        }
        if (!attempt.response || typeof attempt.response !== "object" || Array.isArray(attempt.response) || attempt.response_version < 1) {
          return json({ error: "Save your latest answers and wait for the confirmed checkpoint before submitting." }, 409);
        }
        activeAttempt = {
          id: attempt.id,
          status: attempt.status,
          response: attempt.response as Record<string, unknown>,
          responseVersion: attempt.response_version,
        };
      }

      const { data: existing, error: existingError } = await db.from("assessment_submissions")
        .select("id,submitted_at,scoring_status,submission_idempotency_key")
        .eq("application_id", application.id).eq("pathway", pathway).maybeSingle();
      if (existingError) return json({ error: "We could not verify the assessment state. Please retry." }, 503);
      if (existing) {
        if (idempotencyKey && existing.submission_idempotency_key === idempotencyKey) {
          if (activeAttempt && activeAttempt.status === "active") {
            const submittedAt = new Date().toISOString();
            await db.from("assessment_attempts")
              .update({ status: "submitted", submitted_at: submittedAt, updated_at: submittedAt })
              .eq("id", activeAttempt.id).eq("status", "active");
          }
          return json({ ...receipt(existing, pathway), repeatedRequest: true }, 200);
        }
        return json({ error: "This assessment has already been submitted and the official attempt is locked. Contact T4SC support if a verified technical problem affected you." }, 409);
      }

      if (body.pathway === "department") {
        const { data: previous, error } = await db.from("assessment_submissions").select("id")
          .eq("application_id", application.id).eq("pathway", "general").maybeSingle();
        if (error || !previous) return json({ error: "Complete the common screening before opening the department assessment." }, 409);
      }
      if (body.pathway === "practical") {
        const { data: previous, error } = await db.from("assessment_submissions").select("id")
          .eq("application_id", application.id).eq("pathway", "department: " + department).maybeSingle();
        if (error || !previous) return json({ error: "Complete the primary-department assessment before submitting the practical task." }, 409);
      }

      if (activeAttempt?.status === "submitted" && !existing) {
        return json({ error: "This attempt is already submitted, but its submission receipt could not be found. Contact T4SC support." }, 409);
      }

      const submittedAnswers = activeAttempt ? activeAttempt.response : body.answers;

      let objectiveScore: number | null = null;
      let objectiveMax: number | null = null;
      let scoringStatus = "pending_rubric_scoring";
      let scoringVersion = "t4sc-rubric-evaluator-not-configured";

      if (body.pathway === "general" || body.pathway === "department") {
        const keyLevel = body.pathway === "general" ? "shared" : (level === "Advanced" ? "Experienced" : level);
        const { data: answerKeys, error: keysError } = await db.from("assessment_answer_keys")
          .select("question_id,correct_value")
          .eq("pathway", body.pathway).eq("department", body.pathway === "general" ? "*" : department).eq("level", keyLevel)
          .order("question_id", { ascending: true });
        if (keysError || !answerKeys?.length) {
          scoringStatus = "technical_review_required";
          scoringVersion = "answer-key-unavailable";
        } else {
          try {
            const objective = scoreObjectiveAnswers(submittedAnswers.multipleChoice, answerKeys);
            objectiveScore = objective.score;
            objectiveMax = objective.maximum;
            scoringStatus = "objective_only";
            scoringVersion = "legacy-ui-sample-v0";
          } catch {
            return json({ error: "Your answers did not match the active assessment format. Your work has not been submitted; contact T4SC support if this persists." }, 400);
          }
        }
      }

      const { data: saved, error: insertError } = await db.from("assessment_submissions").insert({
        application_id: application.id,
        pathway,
        level,
        answers: submittedAnswers,
        score: null,
        objective_score: objectiveScore,
        objective_max: objectiveMax,
        scoring_status: scoringStatus,
        scoring_version: scoringVersion,
        submission_idempotency_key: idempotencyKey,
      }).select("id,submitted_at,scoring_status").single();

      if (insertError) {
        if (insertError.code === "23505") {
          const { data: raced } = await db.from("assessment_submissions")
            .select("id,submitted_at,scoring_status,submission_idempotency_key")
            .eq("application_id", application.id).eq("pathway", pathway).maybeSingle();
          if (raced && idempotencyKey && raced.submission_idempotency_key === idempotencyKey) {
            if (activeAttempt && activeAttempt.status === "active") {
              const submittedAt = new Date().toISOString();
              await db.from("assessment_attempts")
                .update({ status: "submitted", submitted_at: submittedAt, updated_at: submittedAt })
                .eq("id", activeAttempt.id).eq("status", "active");
            }
            return json({ ...receipt(raced, pathway), repeatedRequest: true }, 200);
          }
          return json({ error: "This assessment has already been submitted and the official attempt is locked." }, 409);
        }
        return json({ error: "We could not confirm your submission. Your attempt was not marked as failed; please retry or contact T4SC support." }, 503);
      }

      if (activeAttempt && activeAttempt.status === "active") {
        const submittedAt = new Date().toISOString();
        const { error: attemptUpdateError } = await db.from("assessment_attempts")
          .update({ status: "submitted", submitted_at: submittedAt, updated_at: submittedAt })
          .eq("id", activeAttempt.id).eq("application_id", application.id).eq("status", "active");
        if (attemptUpdateError) {
          return json({
            ...receipt(saved, pathway),
            warning: "Your submission receipt was saved, but the attempt state could not be refreshed. Do not submit again; contact T4SC support.",
          }, 201);
        }
      }

      const nextStatus = body.pathway === "general" ? "department_assessment" :
        body.pathway === "department" ? "practical_task" : "under_review";
      // Progress only; no pass/fail or admission decision is made here.
      const { error: statusError } = await db.from("applications")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", application.id);
      if (statusError) {
        return json({
          ...receipt(saved, pathway),
          warning: "Your assessment was safely received, but the application progress label could not be refreshed. Contact T4SC support if your dashboard does not update.",
        }, 201);
      }
      return json({ ...receipt(saved, pathway), nextStatus, objectiveScoring: scoringStatus }, 201);
    }
    return json({ error: "Unknown request action." }, 400);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
});
