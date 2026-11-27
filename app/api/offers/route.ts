import { NextResponse } from "next/server";
import { callT4SCApi } from "@/lib/t4sc-api";
import { getVerifiedApplicantContext } from "@/lib/applicant-auth";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        typeof body.reference !== "string" || body.reference.trim().length < 4 ||
        body.reference.length > 40 ||
        (body.response !== "accept" && body.response !== "decline") ||
        typeof body.offerId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.offerId)) {
      return NextResponse.json({ error: "Offer response details are incomplete." }, { status: 400, headers: noStore });
    }

    const applicant = await getVerifiedApplicantContext();
    if (!applicant) {
      return NextResponse.json({ error: "Sign in with your verified applicant account to respond to an offer." }, { status: 401, headers: noStore });
    }

    const result = await callT4SCApi("offer_respond", {
      reference: body.reference,
      email: applicant.email,
      offerId: body.offerId,
      response: body.response,
    }, applicant.accessToken);
    return NextResponse.json(result.data, { status: result.status, headers: noStore });
  } catch {
    return NextResponse.json({ error: "Invalid offer response request." }, { status: 400, headers: noStore });
  }
}
