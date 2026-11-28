import { NextResponse } from "next/server";
import { callT4SCApi } from "@/lib/t4sc-api";
import { getApplicantSessionContext } from "@/lib/applicant-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid status request." }, { status: 400 });
    }
    const applicant = await getApplicantSessionContext();
    if (!applicant) {
      return NextResponse.json({ error: "Sign in with your signed-in applicant account to view your private application status." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    if (typeof body.email === "string" && body.email.trim().toLowerCase() !== applicant.email) {
      return NextResponse.json({ error: "Use the email address linked to your signed-in applicant account." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    const result = await callT4SCApi("status_lookup", body, applicant.accessToken);
    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json({ error: "Invalid status request." }, { status: 400 });
  }
}
