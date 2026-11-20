/**
 * Tipos de variação da DinoBlack (videogames, acessórios, notebooks e PC gamer).
 * `code` é o que fica gravado no produto e o que o carrinho/checkout usam para achar a variação certa.
 * `kind: "color"` mostra bolinhas de cor na página do produto; os demais viram botões de texto.
 */
import { fold } from "./catalog-normalize";

export type OptionKind = "color" | "chips";
export type OptionPreset = { code: string; name: string; kind: OptionKind; hint: string; suggestions: string[] };

export const OPTION_PRESETS: OptionPreset[] = [
  { code: "color", name: "Cor", kind: "color", hint: "Controles, consoles, capas, headsets", suggestions: ["Preto", "Branco", "Cinza", "Prata", "Vermelho", "Azul", "Verde", "Rosa", "Roxo", "Dourado", "Transparente"] },
  { code: "condition", name: "Condição", kind: "chips", hint: "Mesmo produto novo ou seminovo, com preços diferentes", suggestions: ["Novo", "Semi-novo"] },
  { code: "storage", name: "Armazenamento", kind: "chips", hint: "Consoles, notebooks, SSD, cartões", suggestions: ["256 GB", "500 GB", "512 GB", "825 GB", "1 TB", "2 TB"] },
  { code: "memoria_ram", name: "Memória RAM", kind: "chips", hint: "Notebooks e PCs", suggestions: ["8 GB", "16 GB", "32 GB", "64 GB"] },
  { code: "processador", name: "Processador", kind: "chips", hint: "Notebooks e PCs", suggestions: ["Core i5", "Core i7", "Core i9", "Ryzen 5", "Ryzen 7", "Ryzen 9"] },
  { code: "placa_de_video", name: "Placa de vídeo", kind: "chips", hint: "Notebooks e PCs gamer", suggestions: ["RTX 4050", "RTX 4060", "RTX 4070", "RX 7600"] },
  { code: "tela", name: "Tela", kind: "chips", hint: "Notebooks e monitores", suggestions: ['14"', '15,6"', '16"', '17"'] },
  { code: "edicao", name: "Edição", kind: "chips", hint: "Consoles e jogos", suggestions: ["Standard", "Digital", "Deluxe", "Colecionador"] },
  { code: "plataforma", name: "Plataforma", kind: "chips", hint: "Jogos, controles e acessórios multiplataforma", suggestions: ["PS5", "PS4", "Xbox Series X|S", "Xbox One", "Switch", "PC"] },
  { code: "midia", name: "Mídia", kind: "chips", hint: "Jogos", suggestions: ["Física", "Digital"] },
  { code: "regiao", name: "Região", kind: "chips", hint: "Jogos e consoles importados", suggestions: ["NTSC-U (EUA)", "PAL (Europa)", "NTSC-J (Japão)"] },
  { code: "voltagem", name: "Voltagem", kind: "chips", hint: "Fontes, carregadores, consoles", suggestions: ["110V", "220V", "Bivolt"] },
  { code: "tamanho", name: "Tamanho", kind: "chips", hint: "Capas, camisetas, mochilas", suggestions: ["P", "M", "G", "GG"] },
  { code: "conectividade", name: "Conectividade", kind: "chips", hint: "Controles, headsets, teclados", suggestions: ["Com fio", "Sem fio", "Bluetooth"] },
  { code: "layout_do_teclado", name: "Layout do teclado", kind: "chips", hint: "Teclados e notebooks", suggestions: ["ABNT2", "US"] },
  { code: "kit_pacote", name: "Kit / pacote", kind: "chips", hint: "Console sozinho ou com jogos e controles", suggestions: ["Somente o console", "Console + 1 jogo", "Console + 2 controles"] },
  { code: "modelo", name: "Modelo", kind: "chips", hint: "Versões do mesmo produto", suggestions: [] },
];

export const presetByName = (name: string) => OPTION_PRESETS.find((p) => fold(p.name) === fold(name));
export const presetByCode = (code: string) => OPTION_PRESETS.find((p) => p.code === code);
export const isColorOption = (code: string, name = "") => code === "color" || fold(name) === "cor";

// ---------------------------------------------------------------------------- cores
const COLORS: [string[], string][] = [
  [["preto", "black", "carbon", "onix", "grafite escuro"], "#17181c"],
  [["branco", "white", "robot", "polar", "pearl", "perola"], "#f5f5f4"],
  [["cinza", "gray", "grey", "grafite", "chumbo", "titanio"], "#71717a"],
  [["prata", "silver", "aco"], "#c3c7cf"],
  [["dourado", "gold", "ouro"], "#d4a72c"],
  [["vermelho", "red", "pulse", "cherry"], "#dc2626"],
  [["azul", "blue", "ciano", "marinho"], "#2563eb"],
  [["verde", "green", "menta", "lima"], "#16a34a"],
  [["amarelo", "yellow"], "#facc15"],
  [["laranja", "orange"], "#f97316"],
  [["rosa", "pink"], "#ec4899"],
  [["roxo", "purple", "violeta", "lilas"], "#7c3aed"],
  [["marrom", "brown", "cafe"], "#78350f"],
  [["bege", "areia", "creme"], "#d9c9a3"],
  [["transparente", "clear", "cristal"], "#e5e7eb"],
];

/** Cor para a bolinha da variação (nomes em português ou inglês). Duas cores no nome ("Azul e vermelho") viram uma bolinha dividida. */
export function colorSwatch(name: string): string | null {
  const key = fold(name);
  const found: string[] = [];
  for (const [words, hex] of COLORS) {
    if (words.some((w) => new RegExp(`(^| )${w}( |$)`).test(key)) && !found.includes(hex)) found.push(hex);
  }
  if (found.length === 0) return null;
  if (found.length === 1) return found[0];
  return `linear-gradient(135deg, ${found[0]} 50%, ${found[1]} 50%)`;
}
