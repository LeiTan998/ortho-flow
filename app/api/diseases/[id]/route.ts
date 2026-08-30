import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const diseaseId = decodeURIComponent(id || "").trim();

  if (!diseaseId) {
    return NextResponse.json({ error: "MISSING_DISEASE_ID" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("diseases")
    .select("data,view_count")
    .contains("data", { id: diseaseId })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`读取疾病详情失败 (${diseaseId}):`, error);
    return NextResponse.json(
      { error: "DISEASE_DETAIL_UNAVAILABLE" },
      { status: 503 }
    );
  }

  if (!data?.data) {
    return NextResponse.json({ error: "DISEASE_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(
    {
      ...data.data,
      viewCount: Number(data.view_count || 0),
    },
    {
      headers: {
        // 疾病正文比目录更常更新，因此只缓存 5 分钟。
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
      },
    }
  );
}
