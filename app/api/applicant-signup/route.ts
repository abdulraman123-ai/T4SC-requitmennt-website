import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { callT4SCApi } from "@/lib/t4sc-api";

export const runtime = "nodejs";

function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid account request." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!validEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (password.length < 10 || password.length > 128) {
      return NextResponse.json({ error: "Your password must be at least 10 characters long." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ip = forwardedFor.split(",").map((value) => value.trim()).filter(Boolean).at(-1) ||
      request.headers.get("x-real-ip") || "unknown";
    const proxySecret = process.env.T4SC_API_PROXY_SECRET || "unconfigured";
    const signupIpHash = createHmac("sha256", proxySecret).update(ip.slice(0, 200)).digest("hex");

    const result = await callT4SCApi("applicant_signup", { email, password, signupIpHash });
    return NextResponse.json(result.data, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Invalid account request." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
