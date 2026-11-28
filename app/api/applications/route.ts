import { NextResponse } from "next/server";
import { callT4SCApi } from "@/lib/t4sc-api";
import { getVerifiedApplicantContext } from "@/lib/applicant-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid application request." }, { status: 400 });
    }
    const isSchemaV1 = body.applicationSchemaVersion === "t4sc-application-v1";
    let accessToken: string | undefined;
    if (isSchemaV1) {
      const applicant = await getVerifiedApplicantContext();
      if (!applicant) {
        return NextResponse.json({ error: "Sign in to your T4SC applicant account before submitting your application." }, { status: 401 });
      }
      if (typeof body.email !== "string" || body.email.trim().toLowerCase() !== applicant.email) {
        return NextResponse.json({ error: "The application email must match the verified account email." }, { status: 403 });
      }
      accessToken = applicant.accessToken;
    }
    const result = await callT4SCApi("application_submit", body, accessToken);
    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json({ error: "Invalid application request." }, { status: 400 });
  }
}
