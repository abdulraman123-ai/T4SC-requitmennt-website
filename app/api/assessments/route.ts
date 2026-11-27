import { NextResponse } from "next/server";
import { callT4SCApi } from "@/lib/t4sc-api";
import { getVerifiedApplicantContext } from "@/lib/applicant-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid assessment request." }, { status: 400 });
    }
    let accessToken: string | undefined;
    if (body.attemptId !== undefined || body.attemptToken !== undefined) {
      const applicant = await getVerifiedApplicantContext();
      if (!applicant) {
        return NextResponse.json({ error: "Sign in with your verified applicant email before submitting an assessment." }, { status: 401, headers: { "Cache-Control": "no-store" } });
      }
      if (typeof body.email === "string" && body.email.trim().toLowerCase() !== applicant.email) {
        return NextResponse.json({ error: "This assessment belongs to a different verified account." }, { status: 403, headers: { "Cache-Control": "no-store" } });
      }
      accessToken = applicant.accessToken;
    }
    const result = await callT4SCApi("assessment_submit", body, accessToken);
    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json({ error: "Invalid assessment request." }, { status: 400 });
  }
}
