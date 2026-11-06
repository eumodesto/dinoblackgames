/**
 * Cotação de frete de DEMONSTRAÇÃO. Enquanto a integração com transportadora/Correios
 * não existe, valores e prazos são estimados por região do CEP e peso.
 * A mesma função roda no navegador (prévia) e no servidor (valor que vale no pedido).
 */

export type ShippingOption = {
  id: string;
  name: string;
  price: number;
  etaDays: number;
  /** Texto de prazo para exibir. */
  time: string;
};

export const PICKUP_ID = "retirada";

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCep(value: string) {
  return /^\d{8}$/.test(onlyDigits(value));
}

/** Faixa de CEP do Distrito Federal (70000-000 a 73699-999). */
function isDistritoFederal(cep: string) {
  const n = Number(cep);
  return n >= 70000000 && n <= 73699999;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function shippingOptions(cepInput: string, weightGrams = 0): ShippingOption[] {
  const cep = onlyDigits(cepInput);
  if (cep.length !== 8) return [];
  const extra = Math.max(0, Math.ceil(weightGrams / 1000) - 1) * 4.5; // cada kg acima do primeiro

  if (isDistritoFederal(cep)) {
    return [
      { id: PICKUP_ID, name: "Retirar na loja (Santa Maria, Brasília - DF)", price: 0, etaDays: 0, time: "Hoje ou amanhã" },
      { id: "local", name: "Entrega local", price: round2(14.9 + extra), etaDays: 2, time: "1 a 2 dias úteis" },
    ];
  }

  const region = Number(cep[0]);
  return [
    { id: "economica", name: "Econômica", price: round2(24.9 + region * 3.2 + extra), etaDays: 8 + region, time: `${5 + region} a ${8 + region} dias úteis` },
    { id: "expressa", name: "Expressa", price: round2(39.9 + region * 4.1 + extra * 1.5), etaDays: 4 + Math.floor(region / 3), time: `${2 + Math.floor(region / 3)} a ${4 + Math.floor(region / 3)} dias úteis` },
  ];
}

export function findShipping(cep: string, weightGrams: number, id: string) {
  return shippingOptions(cep, weightGrams).find((o) => o.id === id) ?? null;
}
