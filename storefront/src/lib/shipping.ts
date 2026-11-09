/**
 * Helpers de frete compartilhados (navegador + servidor).
 * A cotação real (SuperFrete / Melhor Envio) vive em lib/server/shipping-quote.ts.
 */

import type { ShippingChoice } from "./checkout-types";

export type ShippingOption = ShippingChoice;

export const PICKUP_ID = "retirada";

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCep(value: string) {
  return /^\d{8}$/.test(onlyDigits(value));
}

/** Faixa de CEP do Distrito Federal (70000-000 a 73699-999). */
export function isDistritoFederal(cepInput: string) {
  const n = Number(onlyDigits(cepInput));
  return n >= 70000000 && n <= 73699999;
}

/** Retirada na loja — só para CEPs do DF. */
export function pickupOption(cepInput: string): ShippingChoice | null {
  if (!isValidCep(cepInput) || !isDistritoFederal(cepInput)) return null;
  return {
    id: PICKUP_ID,
    name: "Retirar na loja (Santa Maria, Brasília - DF)",
    price: 0,
    etaDays: 0,
    time: "Hoje ou amanhã",
    provider: "pickup",
  };
}
