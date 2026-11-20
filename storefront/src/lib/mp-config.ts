/** Preferências do Mercado Pago editáveis no admin. Credenciais NÃO ficam aqui: só em variáveis de ambiente. */
export type MpMethods = { pix: boolean; credit_card: boolean; debit_card: boolean };
export type MpSettings = { methods: MpMethods; maxInstallments: number; statementDescriptor: string };

export const MP_MAX_INSTALLMENTS = 12;
export const MP_DESCRIPTOR_MAX = 22;

export const MP_DEFAULTS: MpSettings = {
  methods: { pix: true, credit_card: true, debit_card: true },
  maxInstallments: 10,
  statementDescriptor: "DINOBLACK",
};

/** Maiúsculas, sem acento e só letras, números e espaço: é o que o descritor da fatura aceita. */
export function normalizeDescriptor(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MP_DESCRIPTOR_MAX);
}

/** Valida o que veio do formulário; devolve null (com a mensagem em `error`) se algo estiver errado. */
export function cleanMpSettings(input: unknown): { ok: true; value: MpSettings } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Configuração inválida." };
  const body = input as Record<string, unknown>;
  const m = (body.methods ?? {}) as Record<string, unknown>;
  const methods: MpMethods = { pix: m.pix === true, credit_card: m.credit_card === true, debit_card: m.debit_card === true };
  if (!methods.pix && !methods.credit_card && !methods.debit_card) return { ok: false, error: "Deixe pelo menos uma forma de pagamento ativa." };
  const maxInstallments = Number(body.maxInstallments);
  if (!Number.isInteger(maxInstallments) || maxInstallments < 1 || maxInstallments > MP_MAX_INSTALLMENTS) {
    return { ok: false, error: `O parcelamento deve ficar entre 1 e ${MP_MAX_INSTALLMENTS}x.` };
  }
  const statementDescriptor = normalizeDescriptor(typeof body.statementDescriptor === "string" ? body.statementDescriptor : "");
  if (statementDescriptor.length < 3) return { ok: false, error: "O nome na fatura precisa ter pelo menos 3 letras ou números." };
  return { ok: true, value: { methods, maxInstallments, statementDescriptor } };
}

/** Mescla o que está salvo com os padrões, ignorando lixo. */
export function mergeMpSettings(saved: unknown): MpSettings {
  const parsed = cleanMpSettings({ ...MP_DEFAULTS, ...(saved && typeof saved === "object" ? (saved as object) : {}), methods: { ...MP_DEFAULTS.methods, ...((saved as { methods?: object } | null)?.methods ?? {}) } });
  return parsed.ok ? parsed.value : MP_DEFAULTS;
}
