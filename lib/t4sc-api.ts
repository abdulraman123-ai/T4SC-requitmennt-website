import "server-only";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import { shouldBlockT4SCAction, type T4SCApiAction } from "@/lib/t4sc-api-policy";

type EdgeResult = { data: Record<string, unknown>; status: number };

export async function callT4SCApi(
  action: T4SCApiAction,
  payload: Record<string, unknown>,
  accessToken?: string
): Promise<EdgeResult> {
  if (shouldBlockT4SCAction(action, process.env)) {
    return {
      data: { error: "This preview is read-only. Applicant records and assessment attempts cannot be created or changed from a preview deployment." },
      status: 403,
    };
  }

  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  const proxySecret = process.env.T4SC_API_PROXY_SECRET;

  if (!url || !key || !proxySecret || proxySecret.length < 32) {
    return {
      data: { error: "The T4SC application database is not connected yet." },
      status: 503,
    };
  }

  try {
    const response = await fetch(`${url}/functions/v1/t4sc-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${accessToken || key}`,
        "x-t4sc-api-proxy-secret": proxySecret,
      },
      body: JSON.stringify({ ...payload, action }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    return {
      data: data && typeof data === "object" ? data : { error: "Invalid database response." },
      status: response.status,
    };
  } catch {
    return {
      data: { error: "The T4SC database could not be reached. Please try again." },
      status: 503,
    };
  }
}
