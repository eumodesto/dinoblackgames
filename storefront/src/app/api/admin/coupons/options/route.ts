import { handle, json, requireAdminSession } from "@/lib/server/api";
import { couponScopeOptions } from "@/lib/server/coupons";

/** Categorias e produtos para os seletores do formulário de cupom. */
export async function GET() {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    return json(await couponScopeOptions());
  });
}
