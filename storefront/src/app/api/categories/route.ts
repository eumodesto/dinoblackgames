import { NextResponse } from "next/server";
import { getCategories } from "@/lib/server/catalog";

// Categorias visíveis na loja (is_active no admin). Cabeçalho, menus e buscas leem daqui,
// então ocultar uma categoria no admin a remove desses lugares sem mexer em código.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(
      { categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, href: c.href })) },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120" } },
    );
  } catch (error) {
    console.error("[api] categorias indisponíveis:", error instanceof Error ? error.message : error);
    return NextResponse.json({ categories: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
