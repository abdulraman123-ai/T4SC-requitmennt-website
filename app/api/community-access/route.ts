import { NextResponse } from "next/server";
import { callT4SCApi } from "@/lib/t4sc-api";

export const dynamic = "force-dynamic";

const eligibleStatuses = new Set(["admitted", "onboarding", "active_member"]);
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      typeof body.reference !== "string" ||
      typeof body.email !== "string" ||
      body.reference.length > 40 ||
      body.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
    ) {
      return NextResponse.json({ error: "Enter your application reference and email address." }, { status: 400, headers: noStoreHeaders });
    }

    const verification = await callT4SCApi("status_lookup", {
      reference: body.reference,
      email: body.email,
    });
    if (verification.status !== 200) {
      return NextResponse.json({ error: "We could not verify this application. Check your reference and email." }, { status: verification.status, headers: noStoreHeaders });
    }

    const application = verification.data.application as { status?: string } | undefined;
    if (!application?.status || !eligibleStatuses.has(application.status)) {
      return NextResponse.json({ error: "Community invitations are issued after successful admission and completion of the required stages." }, { status: 403, headers: noStoreHeaders });
    }

    const invitation = process.env.T4SC_TELEGRAM_INVITE_URL;
    if (!invitation) {
      return NextResponse.json({ error: "Your admission is recorded, but the community invitation is not available yet. Please contact T4SC admissions." }, { status: 503, headers: noStoreHeaders });
    }

    let inviteUrl: URL;
    try {
      inviteUrl = new URL(invitation);
    } catch {
      return NextResponse.json({ error: "The community invitation is not configured correctly. Please contact T4SC admissions." }, { status: 503, headers: noStoreHeaders });
    }

    const isTelegramInvite = inviteUrl.protocol === "https:" &&
      inviteUrl.hostname === "t.me" &&
      (/^\/\+[^/]+$/.test(inviteUrl.pathname) || /^\/joinchat\/[^/]+$/.test(inviteUrl.pathname));
    if (!isTelegramInvite) {
      return NextResponse.json({ error: "The community invitation is not configured correctly. Please contact T4SC admissions." }, { status: 503, headers: noStoreHeaders });
    }

    return NextResponse.json({ inviteUrl: inviteUrl.toString() }, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json({ error: "Invalid community access request." }, { status: 400, headers: noStoreHeaders });
  }
}
