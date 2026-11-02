export const WHATSAPP_NUMBER = "5561992926551";
export const WHATSAPP_DISPLAY = "(61) 99292-6551";

export function waLink(message?: string) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const WA_SELL_USED = waLink("Gostaria de vender o meu usado");
