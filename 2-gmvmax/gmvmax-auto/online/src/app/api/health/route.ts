import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, module: "gmv-online", ts: new Date().toISOString() });
}
