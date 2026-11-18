import { handle, json, readJson, requireAdminSession } from "@/lib/server/api";
import { getSql } from "@/lib/server/sql";
import { sendTransactionalEmail, type EmailTemplateKey } from "@/lib/server/email";

export const dynamic = "force-dynamic";

const allowedTemplates = new Set<EmailTemplateKey>(["order_paid", "order_shipped", "order_delivered", "order_cancelled"]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const unauthorized = await requireAdminSession();
    if (unauthorized) return unauthorized;
    const { id } = await params;
    const body = await readJson(req);
    const template = typeof body.template === "string" ? body.template as EmailTemplateKey : "order_shipped";
    if (!allowedTemplates.has(template)) return json({ error: "Template de notificação inválido." }, 422);
    const sql = await getSql();
    const [order] = await sql.query<{ number: string; customer_name: string | null; customer_email: string | null; guest_email: string | null; total: string | number }>(
      "select number, customer_name, customer_email, guest_email, total from orders where id = $1::uuid",
      [id],
    );
    if (!order) return json({ error: "Pedido não encontrado." }, 404);
    const recipient = order.customer_email ?? order.guest_email;
    if (!recipient) return json({ error: "O pedido não possui e-mail para notificação." }, 422);
    const result = await sendTransactionalEmail({
      to: recipient,
      template,
      variables: { name: order.customer_name ?? "Cliente", order_number: order.number, total: `R$ ${Number(order.total).toFixed(2).replace(".", ",")}` },
    });
    if (!result.sent) return json({ error: "O Resend não está configurado para esta operação." }, 503);
    return json({ ok: true });
  });
}
