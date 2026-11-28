import { NextResponse } from "next/server";
import { getVerifiedApplicantContext } from "@/lib/applicant-auth";
import { getSafeTelegramInviteUrl } from "@/lib/community-access";
import { callT4SCApi } from "@/lib/t4sc-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Pragma": "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Vary": "Cookie",
};

function pendingSetupRedirect(request: Request) {
  return NextResponse.redirect(new URL("/community-access-pending", request.url), {
    status: 303,
    headers: privateHeaders,
  });
}

export async function GET(request: Request) {
  const applicant = await getVerifiedApplicantContext();
  if (!applicant) {
    return NextResponse.json(
      { error: "Sign in with your verified applicant account to access the T4SC community." },
      { status: 401, headers: privateHeaders },
    );
  }

  const authorization = await callT4SCApi("community_access", {}, applicant.accessToken);
  if (authorization.status !== 200 || authorization.data.eligible !== true) {
    return NextResponse.json(
      { error: "Community access is available only to the owner of an application with an accepted T4SC offer." },
      { status: authorization.status === 503 ? 503 : 403, headers: privateHeaders },
    );
  }

  // Keep invitation access off in Preview and Development even if someone
  // accidentally configures a shared secret for those environments.
  if (process.env.VERCEL_ENV !== "production" || process.env.NODE_ENV !== "production") {
    return pendingSetupRedirect(request);
  }

  // The URL is kept server-side and is enabled only after Telegram's
  // Request Admin Approval flow has been manually tested and old open links
  // have been revoked.
  if (process.env.T4SC_TELEGRAM_JOIN_REQUESTS_CONFIRMED !== "true") {
    return pendingSetupRedirect(request);
  }

  const inviteUrl = getSafeTelegramInviteUrl(process.env.T4SC_TELEGRAM_INVITE_URL);
  if (!inviteUrl) {
    return pendingSetupRedirect(request);
  }

  return NextResponse.redirect(inviteUrl, {
    status: 303,
    headers: privateHeaders,
  });
}
