import "server-only";
import { FOOTER_ADDRESS, FOOTER_BRAND, SOCIAL_LINKS } from "@/data/footer";
import { WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from "@/lib/whatsapp";

export type EmailItem = { name: string; image: string | null; qty: number; unitPrice: number; options?: string };
export type EmailTotals = { subtotal: number; discount: number; shipping: number; total: number };
export type EmailLayoutInput = {
  title: string;
  bodyHtml: string;
  button?: { label: string; url: string };
  items?: EmailItem[];
  totals?: EmailTotals;
  preheader?: string;
  siteUrl: string;
};

// Cores da marca (iguais às do site): vermelho DinoBlack e preto.
const RED = "#da2230";
const INK = "#0a0a0b";
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const WHATSAPP_URL = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}`;

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const absolute = (url: string | null, siteUrl: string) => (!url ? null : /^https?:\/\//i.test(url) ? url : siteUrl ? `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}` : null);
/** Só http(s), mailto e tel entram em links; qualquer outra coisa (javascript:) vira "#". */
const safeUrl = (url: string) => (/^(https?:|mailto:|tel:)/i.test(url.trim()) ? url.trim() : "#");

function itemsBlock(items: EmailItem[], totals: EmailTotals | undefined, siteUrl: string) {
  const rows = items
    .map((item) => {
      const img = absolute(item.image, siteUrl);
      return `<tr>
        <td width="76" style="padding:12px 0;border-bottom:1px solid #e5e7eb;vertical-align:top">${img ? `<img src="${escapeHtml(img)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:12px;background:#f3f4f6">` : `<div style="width:64px;height:64px;border-radius:12px;background:#f3f4f6"></div>`}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;font-family:${FONT}">
          <div style="font-size:14px;font-weight:700;color:#111827;line-height:20px">${escapeHtml(item.name)}</div>
          ${item.options ? `<div style="font-size:12px;color:#6b7280;line-height:18px">${escapeHtml(item.options)}</div>` : ""}
          <div style="font-size:12px;color:#6b7280;line-height:18px">Quantidade: ${item.qty}</div>
        </td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;font-family:${FONT};font-size:14px;font-weight:700;color:#111827;white-space:nowrap">${money(item.unitPrice * item.qty)}</td>
      </tr>`;
    })
    .join("");
  const line = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;font-family:${FONT};font-size:${strong ? 16 : 13}px;color:${strong ? "#111827" : "#6b7280"};font-weight:${strong ? 800 : 500}">${label}</td><td align="right" style="padding:4px 0;font-family:${FONT};font-size:${strong ? 16 : 13}px;color:#111827;font-weight:${strong ? 800 : 600}">${value}</td></tr>`;
  const totalsRows = totals
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">${line("Subtotal", money(totals.subtotal))}${totals.discount > 0 ? line("Desconto", `− ${money(totals.discount)}`) : ""}${line("Entrega", totals.shipping === 0 ? "Grátis" : money(totals.shipping))}${line("Total", money(totals.total), true)}</table>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;border-top:1px solid #e5e7eb">${rows}</table>${totalsRows}`;
}

/** Monta o e-mail completo: cabeçalho da marca, conteúdo, produtos, botão e rodapé com contato e redes sociais. */
export function renderBrandedEmail(input: EmailLayoutInput): string {
  const { siteUrl } = input;
  const logoUrl = siteUrl.startsWith("https://") || siteUrl.startsWith("http://") ? `${siteUrl}/brand/logo.png` : "";
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" height="44" alt="${escapeHtml(FOOTER_BRAND)}" style="display:block;height:44px;width:auto;border:0">`
    : `<span style="font-family:${FONT};font-size:20px;font-weight:900;color:${INK};letter-spacing:-0.3px">Dino<span style="color:${RED}">Black</span> Games</span>`;
  const button = input.button?.label
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="border-radius:12px;background:${RED}"><a href="${escapeHtml(safeUrl(input.button.url))}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:12px">${escapeHtml(input.button.label)}</a></td></tr></table>`
    : "";
  const socials = SOCIAL_LINKS.map((s) => `<a href="${escapeHtml(s.href)}" target="_blank" style="display:inline-block;margin:0 4px 6px 0;padding:7px 14px;border:1px solid rgba(255,255,255,0.28);border-radius:999px;font-family:${FONT};font-size:12px;font-weight:700;color:#ffffff;text-decoration:none">${escapeHtml(s.label.replace(/ DinoBlack Games$/, ""))}</a>`).join("");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(input.title)}</title></head>
<body style="margin:0;padding:0;background:#f1f3f6">
${input.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(input.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f6"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-radius:20px;overflow:hidden;background:#ffffff">
    <tr><td style="background:#ffffff;padding:18px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>${logo}</td>
        <td align="right" style="font-family:${FONT};font-size:12px;font-weight:700"><a href="${escapeHtml(siteUrl || "#")}" target="_blank" style="color:${INK};text-decoration:none">Ver a loja</a></td>
      </tr></table>
    </td></tr>
    <tr><td style="background:${RED};height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>
    <tr><td style="padding:32px 28px 28px">
      <h1 style="margin:0 0 16px;font-family:${FONT};font-size:26px;line-height:32px;font-weight:900;color:#111827;letter-spacing:-0.4px">${escapeHtml(input.title)}</h1>
      <div style="font-family:${FONT};font-size:15px;line-height:24px;color:#374151">${input.bodyHtml}</div>
      ${input.items?.length ? itemsBlock(input.items, input.totals, siteUrl) : ""}
      ${button}
    </td></tr>
    <tr><td style="background:${INK};padding:28px">
      <div style="font-family:${FONT};font-size:15px;font-weight:800;color:#ffffff">${escapeHtml(FOOTER_BRAND)}</div>
      <div style="margin-top:6px;font-family:${FONT};font-size:12px;line-height:19px;color:#d1d5db">${escapeHtml(FOOTER_ADDRESS)}</div>
      <div style="margin-top:12px;font-family:${FONT};font-size:13px;color:#ffffff">WhatsApp: <a href="${WHATSAPP_URL}" target="_blank" style="color:#ffffff;font-weight:800;text-decoration:underline">${escapeHtml(WHATSAPP_DISPLAY)}</a></div>
      <div style="margin-top:16px">${socials}</div>
      <div style="margin-top:14px;font-family:${FONT};font-size:11px;line-height:17px;color:#9ca3af">Você recebeu este e-mail porque fez um pedido ou um cadastro na DinoBlack Games. Em caso de dúvida, responda esta mensagem ou fale com a gente no WhatsApp.</div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}
