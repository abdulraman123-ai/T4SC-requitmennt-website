import { NextResponse } from "next/server";
import { callT4SCApi } from "@/lib/t4sc-api";
import { getVerifiedApplicantContext } from "@/lib/applicant-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid application request." }, { status: 400 });
    }

    const applicant = await getVerifiedApplicantContext();
    if (!applicant) {
      return NextResponse.json(
        { error: "Sign in with your T4SC applicant account before submitting an application." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (typeof body.email !== "string" || body.email.trim().toLowerCase() !== applicant.email) {
      return NextResponse.json(
        { error: "The application email must match your signed-in applicant account." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const result = await callT4SCApi("application_submit", {
      ...body,
      email: applicant.email,
    }, applicant.accessToken);
    return NextResponse.json(result.data, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Invalid application request." }, { status: 400 });
  }
}
