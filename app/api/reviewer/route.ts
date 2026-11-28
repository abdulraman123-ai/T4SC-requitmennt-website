import { NextResponse } from "next/server";
import { getVerifiedApplicantContext } from "@/lib/applicant-auth";
import { callT4SCApi } from "@/lib/t4sc-api";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie" };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid reviewer request." }, { status: 400, headers: noStore });
    }

    const reviewer = await getVerifiedApplicantContext();
    if (!reviewer) {
      return NextResponse.json({ error: "Sign in with an authorised T4SC reviewer account." }, { status: 401, headers: noStore });
    }

    if (body.action !== "note" || typeof body.reference !== "string" ||
        body.reference.trim().length < 4 || body.reference.length > 40 ||
        typeof body.note !== "string" || !body.note.trim() || body.note.length > 4000) {
      return NextResponse.json({ error: "A valid application reference and reviewer note are required." }, { status: 400, headers: noStore });
    }

    const result = await callT4SCApi("reviewer_add_note", {
      reference: body.reference,
      note: body.note,
    }, reviewer.accessToken);
    return NextResponse.json(result.data, { status: result.status, headers: noStore });
  } catch {
    return NextResponse.json({ error: "Invalid reviewer request." }, { status: 400, headers: noStore });
  }
}
