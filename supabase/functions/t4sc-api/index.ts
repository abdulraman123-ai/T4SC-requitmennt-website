import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { scoreObjectiveAnswers } from "../_shared/assessment-scoring.ts";

const departments = ["AI & Machine Learning","Game Development","Full Stack Development & System Architecture","Cybersecurity & Systems Security"];
const levels = ["Beginner","Developing","Advanced"];
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
    const body = await request.json();

    if (body.action === "application_submit") {
      const required = ["preferredName","email","country","region","primaryDepartment","whyDepartment","experienceLevel","triedBuilt","motivation","problemToSolve","weeklyAvailability","sessionAvailability","deviceAccess","internetAccess"];
      for (const field of required) if (typeof body[field] !== "string" || !body[field].trim()) return json({ error: "Please complete all required fields." }, 400);
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
      }).select("reference").single();
      if (error) return json({ error: "We could not save your application. Please try again later." }, 503);
      return json({ reference: data.reference }, 201);
    }

    if (body.action === "status_lookup") {
      if (typeof body.reference !== "string" || !validEmail(body.email)) return json({ error: "Enter your application reference and a valid email address." }, 400);
      const { data, error } = await db.from("applications").select("reference,preferred_name,status,created_at,updated_at")
        .eq("reference", body.reference.trim().toUpperCase())
        .eq("email", body.email.trim().toLowerCase()).maybeSingle();
      if (error || !data) return json({ error: "We could not find an application matching those details." }, 404);
      return json({ application: data });
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
        .select("id,reference,department,assessment_level")
        .eq("reference", body.reference.trim().toUpperCase())
        .eq("email", body.email.trim().toLowerCase()).maybeSingle();
      if (lookupError || !application) return json({ error: "We could not verify this application. Check your reference and email." }, 404);

      const level = application.assessment_level;
      const department = application.department;
      if (!levels.includes(level) || !departments.includes(department)) return json({ error: "The application assessment route is not configured correctly." }, 409);
      if (body.pathway === "department" && body.department !== department) {
        return json({ error: "This assessment does not match the primary department on your application." }, 403);
      }

      const pathway = body.pathway === "department" ? "department: " + department : body.pathway;
      const idempotencyKey = validUuid(body.idempotencyKey) ? body.idempotencyKey : null;

      const { data: existing, error: existingError } = await db.from("assessment_submissions")
        .select("id,submitted_at,scoring_status,submission_idempotency_key")
        .eq("application_id", application.id).eq("pathway", pathway).maybeSingle();
      if (existingError) return json({ error: "We could not verify the assessment state. Please retry." }, 503);
      if (existing) {
        if (idempotencyKey && existing.submission_idempotency_key === idempotencyKey) {
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

      let objectiveScore: number | null = null;
      let objectiveMax: number | null = null;
      let scoringStatus = "pending_rubric_scoring";
      let scoringVersion = "t4sc-rubric-evaluator-not-configured";

      if (body.pathway === "general" || body.pathway === "department") {
        const keyLevel = body.pathway === "general" ? "shared" : level;
        const { data: answerKeys, error: keysError } = await db.from("assessment_answer_keys")
          .select("question_id,correct_value")
          .eq("pathway", body.pathway).eq("level", keyLevel)
          .order("question_id", { ascending: true });
        if (keysError || !answerKeys?.length) {
          scoringStatus = "technical_review_required";
          scoringVersion = "answer-key-unavailable";
        } else {
          try {
            const objective = scoreObjectiveAnswers(body.answers.multipleChoice, answerKeys);
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
        answers: body.answers,
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
            return json({ ...receipt(raced, pathway), repeatedRequest: true }, 200);
          }
          return json({ error: "This assessment has already been submitted and the official attempt is locked." }, 409);
        }
        return json({ error: "We could not confirm your submission. Your attempt was not marked as failed; please retry or contact T4SC support." }, 503);
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
