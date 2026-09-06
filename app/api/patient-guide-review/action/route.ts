import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

function authorized(req: NextRequest) {
  const expected = (process.env.ORTHOFLOW_REVIEW_TOKEN || "").trim();
  const supplied = (req.headers.get("x-orthoflow-review-token") || "").trim();
  return Boolean(expected && supplied && safeEqual(expected, supplied));
}

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) throw new Error("Missing Supabase server configuration.");
  return { url, key };
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { draftId?: string; action?: "publish" | "reject" };
    const draftId = (body.draftId || "").trim();
    const action = body.action;

    if (!draftId || !/^[0-9a-f-]{36}$/i.test(draftId)) {
      return NextResponse.json({ error: "Invalid draftId" }, { status: 400 });
    }
    if (action !== "publish" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { url, key } = supabaseConfig();
    const rpc = action === "publish" ? "publish_patient_guide_draft" : "reject_patient_guide_draft";
    const response = await fetch(`${url}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_draft_id: draftId }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase RPC failed ${response.status}: ${detail.slice(0, 700)}`);
    }

    const result = await response.json();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("patient-guide-review action failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
