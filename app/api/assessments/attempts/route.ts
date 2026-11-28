import { NextResponse } from "next/server";
import { callT4SCApi } from "@/lib/t4sc-api";
import { getVerifiedApplicantContext } from "@/lib/applicant-auth";

const allowedActions = new Set(["attempt_start", "attempt_read", "attempt_save"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        typeof body.action !== "string" || !allowedActions.has(body.action)) {
      return NextResponse.json({ error: "Invalid assessment attempt request." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const applicant = await getVerifiedApplicantContext();
    if (!applicant) {
      return NextResponse.json({ error: "Sign in with your verified applicant email to access assessment attempts." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    if (typeof body.email === "string" && body.email.trim().toLowerCase() !== applicant.email) {
      return NextResponse.json({ error: "This assessment belongs to a different verified account." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    const result = await callT4SCApi(
      body.action as "attempt_start" | "attempt_read" | "attempt_save",
      body,
      applicant.accessToken,
    );
    return NextResponse.json(result.data, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid assessment attempt request." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
