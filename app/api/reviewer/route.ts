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

    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    if (reference.length < 4 || reference.length > 40) {
      return NextResponse.json({ error: "Enter a valid application reference." }, { status: 400, headers: noStore });
    }

    if (body.action === "note") {
      const note = typeof body.note === "string" ? body.note.trim() : "";
      if (!note || note.length > 4000) {
        return NextResponse.json({ error: "Reviewer notes must contain between 1 and 4,000 characters." }, { status: 400, headers: noStore });
      }
      const result = await callT4SCApi("reviewer_add_note", { reference, note }, reviewer.accessToken);
      return NextResponse.json(result.data, { status: result.status, headers: noStore });
    }

    if (body.action === "status") {
      const newStatus = typeof body.newStatus === "string" ? body.newStatus : "";
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!["needs_review","general_screening","department_assessment","practical_task","clarification","under_review"].includes(newStatus) ||
          !reason || reason.length > 1000) {
        return NextResponse.json({ error: "Choose a non-final review stage and provide a reason of up to 1,000 characters." }, { status: 400, headers: noStore });
      }
      const result = await callT4SCApi("reviewer_set_status", { reference, newStatus, reason }, reviewer.accessToken);
      return NextResponse.json(result.data, { status: result.status, headers: noStore });
    }

    return NextResponse.json({ error: "Unknown reviewer action." }, { status: 400, headers: noStore });
  } catch {
    return NextResponse.json({ error: "Invalid reviewer request." }, { status: 400, headers: noStore });
  }
}
