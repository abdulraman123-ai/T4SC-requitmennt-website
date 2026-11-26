import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const departments = ["AI & Machine Learning","Game Development","Full Stack Development & System Architecture","Cybersecurity & Systems Security"];
const levels = ["Beginner","Developing","Advanced"];
const allowedPathways = ["general","department","practical"];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});
function validEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
      if (body.secondaryInterest && !departments.includes(body.secondaryInterest)) return json({ error: "Choose a valid secondary interest." }, 400);
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
      const { data, error } = await db.from("applications")
        .select("reference,preferred_name,status,created_at,updated_at")
        .eq("reference", body.reference.trim().toUpperCase())
        .eq("email", body.email.trim().toLowerCase()).maybeSingle();
      if (error || !data) return json({ error: "We could not find an application matching those details." }, 404);
      return json({ application: data });
    }

    if (body.action === "assessment_submit") {
      if (typeof body.reference !== "string" || !validEmail(body.email) || !allowedPathways.includes(body.pathway) ||
          typeof body.level !== "string" || !levels.includes(body.level) || !body.answers ||
          typeof body.answers !== "object" || Array.isArray(body.answers)) {
        return json({ error: "Assessment details are incomplete." }, 400);
      }
      if (body.pathway === "department" && !departments.includes(body.department)) return json({ error: "Invalid department." }, 400);
      const { data: application, error: lookupError } = await db.from("applications").select("id,reference")
        .eq("reference", body.reference.trim().toUpperCase()).eq("email", body.email.trim().toLowerCase()).maybeSingle();
      if (lookupError || !application) return json({ error: "We could not verify this application. Check your reference and email." }, 404);
      const pathway = body.pathway === "department" ? "department: " + body.department : body.pathway;
      const score = typeof body.score === "number" && Number.isFinite(body.score) ? body.score : null;
      const { error: insertError } = await db.from("assessment_submissions").insert({
        application_id: application.id, pathway, level: body.level, answers: body.answers, score,
      });
      if (insertError) return json({ error: "We could not save this assessment. Please try again." }, 503);
      const nextStatus = body.pathway === "general" ? "department_assessment" : body.pathway === "department" ? "practical_task" : "under_review";
      await db.from("applications").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", application.id);
      return json({ ok: true, nextStatus }, 201);
    }
    return json({ error: "Unknown request action." }, 400);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
});
