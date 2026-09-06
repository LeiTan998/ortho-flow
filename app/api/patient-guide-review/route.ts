import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

type ReviewRow = {
  draft_id: string;
  disease_id: string;
  disease_name: string;
  status: string;
  model: string | null;
  generation_mode: string;
  created_at: string;
  updated_at: string;
  auto_curator_version: string | null;
  summary: string | null;
  severity_answer: string | null;
  surgery_answer: string | null;
  recovery_answer: string | null;
  red_flag_count: number;
  review_flag_count: number;
  high_review_flag_count: number;
  review_flags: unknown[] | null;
  payload: Record<string, unknown> | null;
};

function getAdminToken() {
  return (process.env.ORTHOFLOW_REVIEW_TOKEN || "").trim();
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

function authorized(req: NextRequest) {
  const expected = getAdminToken();
  const supplied = (req.headers.get("x-orthoflow-review-token") || "").trim();
  return Boolean(expected && supplied && safeEqual(expected, supplied));
}

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or server Supabase secret key.");
  }
  return { url, key };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url, key } = supabaseConfig();
    const endpoint = new URL(`${url}/rest/v1/patient_guide_review_queue`);
    endpoint.searchParams.set("select", "*");
    endpoint.searchParams.set("order", "high_review_flag_count.desc,created_at.asc");

    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase queue failed ${response.status}: ${detail.slice(0, 500)}`);
    }

    const rows = (await response.json()) as ReviewRow[];
    return NextResponse.json({ rows, count: rows.length });
  } catch (error) {
    console.error("patient-guide-review GET failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
