import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await supabase
    .from("disease_catalog")
    .select("id,name,english_name,search_keywords,view_count");

  if (error) {
    console.error("读取疾病目录失败:", error);
    return NextResponse.json(
      { error: "DISEASE_CATALOG_UNAVAILABLE" },
      { status: 503 }
    );
  }

  const diseases = (data || [])
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      englishName: item.english_name,
      searchKeywords: item.search_keywords || "",
      viewCount: Number(item.view_count || 0),
    }))
    .filter((item: any) => item.id && item.name && item.englishName);

  return NextResponse.json(diseases, {
    headers: {
      // Vercel CDN 缓存目录 10 分钟，旧缓存最多可继续服务 24 小时。
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
    },
  });
}
