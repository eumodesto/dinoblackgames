import { EMAIL_TEMPLATES } from "@/lib/email-templates";
import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { resendCustomerEmail } from "@/lib/server/notify";
import { getSql } from "@/lib/server/sql";

export const dynamic = "force-dynamic";

const customerTemplates = new Set(EMAIL_TEMPLATES.filter((t) => t.audience === "customer" && t.key.startsWith("order_") || t.key === "payment_failed" || t.key === "payment_pending_reminder").map((t) => t.key));

/** Reenvia ao cliente um e-mail do pedido (ex.: “Saiu para entrega”), com o visual da marca. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const body = await readJson(req);
    const template = typeof body.template === "string" ? body.template : "order_shipped";
    if (!customerTemplates.has(template)) return json({ error: "Template de notificação inválido." }, 422);
    const sql = await getSql();
    const [order] = await sql.query<{ number: string }>("select number from orders where id = $1::uuid", [id]);
    if (!order) return json({ error: "Pedido não encontrado." }, 404);
    const result = await resendCustomerEmail(order.number, template);
    if (result === "no_email") return json({ error: "O pedido não possui e-mail para notificação." }, 422);
    if (result === "disabled") return json({ error: "Este template está desativado em Configurações → E-mails." }, 409);
    if (result !== "sent") return json({ error: "O Resend não está configurado para esta operação." }, 503);
    return json({ ok: true });
  });
}
