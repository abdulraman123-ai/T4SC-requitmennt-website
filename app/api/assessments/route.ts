import { NextResponse } from "next/server";
import { callT4SCApi } from "@/lib/t4sc-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid assessment request." }, { status: 400 });
    }
    const result = await callT4SCApi("assessment_submit", body);
    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json({ error: "Invalid assessment request." }, { status: 400 });
  }
}
