import { NextResponse } from "next/server";
import { callT4SCApi } from "@/lib/t4sc-api";

const allowedActions = new Set(["attempt_start", "attempt_read", "attempt_save"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        typeof body.action !== "string" || !allowedActions.has(body.action)) {
      return NextResponse.json({ error: "Invalid assessment attempt request." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const result = await callT4SCApi(
      body.action as "attempt_start" | "attempt_read" | "attempt_save",
      body,
    );
    return NextResponse.json(result.data, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid assessment attempt request." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
