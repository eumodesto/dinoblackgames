/**
 * CSV de produtos (exportar, modelo e importar). Sem dependências: roda no navegador e no servidor.
 * Formato: UTF-8 com BOM, separador ";" (abre direto no Excel em português), uma linha por variação vendável.
 */

export type CsvColumn = {
  key: string;
  /** Cabeçalho do arquivo (não mude: o importador reconhece por ele). */
  header: string;
  /** Texto da ajuda no painel. */
  help: string;
  /** Aceita só quando o banco já tem a atualização de preço no Pix / foto por variação. */
  extra?: boolean;
  example?: [string, string];
};

export const CSV_COLUMNS: CsvColumn[] = [
  { key: "sku", header: "sku", help: "ID DinoBlack do produto. Vazio = produto novo (o SKU é gerado). Preenchido e existente = atualiza esse produto. Várias linhas com o mesmo SKU = variações do mesmo produto.", example: ["", "DB-EXEMPLO-00001"] },
  { key: "nome", header: "nome", help: "Nome comercial. Obrigatório em produto novo.", example: ["[EXEMPLO] Controle sem Fio", "[EXEMPLO] Console de Teste"] },
  { key: "categoria", header: "categoria", help: "Categoria pelo caminho completo (Principal › Sub) ou pelo endereço (slug). Obrigatória em produto novo.", example: ["Acessórios", "Consoles"] },
  { key: "tipo", header: "tipo", help: "console, jogo, acessorio, pc, notebook, periferico, retro, gift ou hardware. Obrigatório em produto novo.", example: ["acessorio", "console"] },
  { key: "condicao", header: "condicao", help: "novo, seminovo, raridade ou pre_venda. Vazio em produto novo = novo.", example: ["novo", "seminovo"] },
  { key: "status", header: "status", help: "rascunho, publicado, agendado ou arquivado. Vazio em produto novo = rascunho (não aparece na loja).", example: ["rascunho", "rascunho"] },
  { key: "visibilidade", header: "visibilidade", help: "visivel (nas listas e busca) ou oculto (só pelo link direto). Vazio em produto novo = visivel.", example: ["visivel", "visivel"] },
  { key: "marca", header: "marca", help: "Ex.: Sony, Microsoft.", example: ["Microsoft", "Sony"] },
  { key: "plataforma", header: "plataforma", help: "Ex.: PlayStation 5, Xbox Series.", example: ["Xbox Series", "PlayStation 5"] },
  { key: "ano", header: "ano", help: "Ano ou geração (texto livre).", example: ["2024", "2020"] },
  { key: "subtitulo", header: "subtitulo", help: "Resumo curto abaixo do nome.", example: ["Cor Robot White", ""] },
  { key: "selo", header: "selo", help: "Selo opcional, ex.: Lançamento.", example: ["", ""] },
  { key: "descricao", header: "descricao", help: "Descrição (texto ou HTML simples).", example: ["Controle original, com garantia.", ""] },
  { key: "garantia_meses", header: "garantia_meses", help: "Meses de garantia (número inteiro).", example: ["12", "3"] },
  { key: "etiquetas", header: "etiquetas", help: "Tags separadas por | (barra vertical). Substitui as tags atuais.", example: ["controle|wireless", ""] },
  { key: "imagens", header: "imagens", help: "Links https das imagens separados por |. A primeira é a capa. Substitui a galeria atual.", example: ["https://exemplo.com/foto1.jpg|https://exemplo.com/foto2.jpg", ""] },
  { key: "sku_variacao", header: "sku_variacao", help: "SKU da variação (opcional). Vazio em variação nova = gerado.", example: ["", ""] },
  { key: "opcoes", header: "opcoes", help: "Opções da variação no formato Nome=Valor, separadas por |. Ex.: Cor=Branco|Armazenamento=1TB. Vazio = produto sem variações.", example: ["", "Armazenamento=500GB"] },
  { key: "preco", header: "preco", help: "Preço de venda da variação (ex.: 479,90). Obrigatório em produto novo.", example: ["479,90", "1199,90"] },
  { key: "preco_original", header: "preco_original", help: "Preço de tabela riscado (maior que o preço). Opcional.", example: ["", "1399,90"] },
  { key: "preco_pix", header: "preco_pix", help: "Preço no Pix (menor que o preço). Vazio = sem preço especial.", extra: true, example: ["455,90", ""] },
  { key: "estoque", header: "estoque", help: "Quantidade em estoque. Vazio = não altera.", example: ["5", "1"] },
  { key: "estoque_minimo", header: "estoque_minimo", help: "Aviso de estoque baixo.", example: ["1", "0"] },
  { key: "parcelas_max", header: "parcelas_max", help: "Máximo de parcelas (1 a 12). Vazio = 10.", example: ["10", "10"] },
  { key: "imagem_variacao", header: "imagem_variacao", help: "Link de uma das imagens do produto para esta variação.", extra: true, example: ["", ""] },
  { key: "peso_g", header: "peso_g", help: "Peso da embalagem em gramas.", example: ["300", "4500"] },
  { key: "largura_mm", header: "largura_mm", help: "Largura da embalagem em mm.", example: ["", ""] },
  { key: "altura_mm", header: "altura_mm", help: "Altura da embalagem em mm.", example: ["", ""] },
  { key: "comprimento_mm", header: "comprimento_mm", help: "Comprimento da embalagem em mm.", example: ["", ""] },
];

export const EXAMPLE_PREFIX = "[EXEMPLO]";
export const MAX_IMPORT_ROWS = 1500;
export const MAX_IMPORT_PRODUCTS = 500;
export const MAX_IMPORT_BYTES = 3_000_000;

export const columnsFor = (extras: boolean) => CSV_COLUMNS.filter((c) => extras || !c.extra);

// ------------------------------------------------------------------ escrita
/** Evita que o Excel trate texto como fórmula (=, +, -, @) ao abrir o arquivo. */
function guard(value: string) {
  return /^[=+@]/.test(value) || /^-(?![\d.,]+$)/.test(value) ? `'${value}` : value;
}

function cell(value: string, delimiter: string) {
  return /["\r\n]/.test(value) || value.includes(delimiter) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(headers: string[], rows: string[][], delimiter = ";"): string {
  const line = (r: string[], protect: boolean) => r.map((v) => cell(protect ? guard(v) : v, delimiter)).join(delimiter);
  const lines = [line(headers, false), ...rows.map((r) => line(r, true))];
  return `﻿${lines.join("\r\n")}\r\n`;
}

// ------------------------------------------------------------------ leitura
/** Lê CSV (aspas, quebras de linha dentro de aspas, BOM). O separador (; , ou tab) é detectado na primeira linha. */
export function parseCsv(input: string): { rows: string[][]; delimiter: string } {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: [string, number][] = [[";", 0], [",", 0], ["\t", 0]];
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted) for (const c of counts) if (c[0] === ch) c[1] += 1;
  }
  const delimiter = counts.sort((a, b) => b[1] - a[1])[0][1] > 0 ? counts[0][0] : ";";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === "") inQuotes = true;
    else if (ch === delimiter) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  // Linhas totalmente vazias (comuns no fim de arquivos do Excel) não contam.
  return { rows: rows.filter((r) => r.some((c) => c.trim() !== "")), delimiter };
}

/** Número em formato brasileiro (1.199,90) ou internacional (1199.90). Devolve null se não for número. */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!s) return null;
  // 1.199,90 (Brasil), 1.199 (milhar sem decimais) ou 1199.90 (internacional)
  const thousands = /^\d{1,3}(\.\d{3})+$/.test(s);
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : thousands ? s.replace(/\./g, "") : s;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Tira o apóstrofo que a exportação coloca antes de textos que o Excel leria como fórmula. */
export const unguard = (value: string) => (/^'[=+@-]/.test(value) ? value.slice(1) : value);
