// Gera supabase/seed.sql com dados 100% FICTÍCIOS para testes reais do banco.
// Uso: npm run seed:build
//
// Regras desta massa de dados:
// - e-mails sempre em @teste.dinoblack.example (domínio reservado, nunca entrega);
// - telefones (61) 90000-00xx e endereços genéricos, sem pessoa real;
// - senha dos usuários de teste: Teste@2026 por padrão, só para ambiente LOCAL (veja SEED_PASSWORD);
// - datas relativas a now(), para os painéis sempre terem movimento recente;
// - fotos de demonstração (Unsplash), as mesmas da loja de demonstração.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Com SEED_PASSWORD o arquivo vai para seed.local.sql (ignorado pelo Git), para a senha nunca ser commitada.
const out = join(dirname(fileURLToPath(import.meta.url)), "..", process.env.SEED_PASSWORD ? "seed.local.sql" : "seed.sql");

// ---------------------------------------------------------------- helpers
const raw = (sql) => ({ __raw: sql });
const jsonb = (v) => raw(`'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`);
const ago = (spec) => raw(`now() - interval '${spec}'`);
const ahead = (spec) => raw(`now() + interval '${spec}'`);

function lit(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "object" && v.__raw) return v.__raw;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

const statements = [];
function ins(table, rows, { onConflict } = {}) {
  if (!rows.length) return;
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const values = rows.map((r) => `  (${cols.map((c) => (c in r ? lit(r[c]) : "default")).join(", ")})`).join(",\n");
  statements.push(
    `insert into ${table} (${cols.join(", ")}) values\n${values}${onConflict ? ` ${onConflict}` : ""};`,
  );
}
function section(title) {
  statements.push(`\n-- ${"-".repeat(70)}\n-- ${title}\n-- ${"-".repeat(70)}`);
}

// UUIDs legíveis e estáveis: o prefixo identifica a tabela.
const NS = { user: 1, cat: 2, col: 3, prod: 4, var: 5, loc: 6, unit: 7, order: 8, item: 9, used: 10, coupon: 11, promo: 12, cart: 13, addr: 14, banner: 15, page: 16, nav: 17, opt: 18, optv: 19, kit: 20, pay: 21, ship: 22, ret: 23 };
const uid = (ns, n) => `${NS[ns].toString(16).padStart(8, "0")}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;
const IMG = {
  ps5: img("1606144042614-b2417e99c4e3"),
  switch: img("1621259182978-fbf93132d53d"),
  controller: img("1592840496694-26d035b52b48"),
  notebook: img("1517336714731-489689fd1ca8"),
  pc: img("1587202372775-e229f172b9d7"),
  retro: img("1550745165-9bc0b252726f"),
  headset: img("1618366712010-f4ae9c647dcb"),
  keyboard: img("1541140532154-b024d705b90a"),
  pcSetup: img("1593640408182-31c70c8268f5"),
  laptop: img("1496181133206-80ce9b88a853"),
};

// ---------------------------------------------------------------- usuários
// Senha padrão só para ambiente LOCAL. Em qualquer banco acessível pela internet (staging, dev na nuvem),
// gere o seed com uma senha própria: SEED_PASSWORD="..." npm run seed:build
const DEFAULT_PASSWORD = "Teste@2026";
const PASSWORD = process.env.SEED_PASSWORD ?? DEFAULT_PASSWORD;
const staff = [
  { n: 1, name: "Marina Dona (teste)", email: "owner@teste.dinoblack.example", role: "owner", phone: "(61) 90000-0001" },
  { n: 2, name: "Rafael Gerente (teste)", email: "gerente@teste.dinoblack.example", role: "manager", phone: "(61) 90000-0002" },
  { n: 3, name: "Caio Estoque (teste)", email: "estoque@teste.dinoblack.example", role: "stock", phone: "(61) 90000-0003" },
  { n: 4, name: "Livia Avaliadora (teste)", email: "avaliador@teste.dinoblack.example", role: "appraiser", phone: "(61) 90000-0004" },
  { n: 5, name: "Paula Atendimento (teste)", email: "atendimento@teste.dinoblack.example", role: "support", phone: "(61) 90000-0005" },
  { n: 6, name: "Davi Conteudo (teste)", email: "editor@teste.dinoblack.example", role: "editor", phone: "(61) 90000-0006" },
];
const customers = [
  { n: 11, name: "Ana Cliente (teste)", email: "ana@teste.dinoblack.example", phone: "(61) 90000-0011" },
  { n: 12, name: "Bruno Cliente (teste)", email: "bruno@teste.dinoblack.example", phone: "(61) 90000-0012" },
  { n: 13, name: "Carla Cliente (teste)", email: "carla@teste.dinoblack.example", phone: "(11) 90000-0013" },
  { n: 14, name: "Diego Cliente (teste)", email: "diego@teste.dinoblack.example", phone: "(21) 90000-0014" },
];
const people = [...staff, ...customers];
const C = Object.fromEntries(customers.map((c, i) => [`c${i + 1}`, c]));
const S = Object.fromEntries(staff.map((s) => [s.role, s]));

section("Usuários de teste (auth + perfis + papéis). Senha: Teste@2026");
statements.push(`do $$
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  values
${people
  .map((p) => `    ('${uid("user", p.n)}', '${p.email}', crypt('${PASSWORD}', gen_salt('bf')), now(), '${JSON.stringify({ full_name: p.name })}'::jsonb)`)
  .join(",\n")};
  -- No Supabase real, o login por senha também exige a identidade "email".
  if to_regclass('auth.identities') is not null then
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    select gen_random_uuid(), u.id, u.email, 'email',
           jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
           now(), now(), now()
    from auth.users u where u.email like '%@teste.dinoblack.example';
  end if;
end $$;`);
// O gatilho on_auth_user_created já criou os perfis; completa os dados.
ins(
  "profiles",
  people.map((p) => ({ id: uid("user", p.n), full_name: p.name, email: p.email, phone: p.phone })),
  { onConflict: "on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone" },
);
ins("user_roles", staff.map((s) => ({ user_id: uid("user", s.n), role: s.role, granted_by: uid("user", 1) })));

const addr = (n, user, label, recipient, cep, street, number, complement, district, city, state, def) => ({
  id: uid("addr", n), user_id: uid("user", user), label, recipient, phone: "(61) 90000-0000", cep, street, number, complement, district, city, state, is_default: def,
});
ins("addresses", [
  addr(1, 11, "Casa", "Ana Cliente (teste)", "72510000", "Quadra 101 Conjunto A", "10", "Casa 1", "Santa Maria", "Brasília", "DF", true),
  addr(2, 12, "Casa", "Bruno Cliente (teste)", "72515000", "Quadra 205 Conjunto B", "22", null, "Santa Maria", "Brasília", "DF", true),
  addr(3, 13, "Casa", "Carla Cliente (teste)", "01310100", "Avenida Exemplo", "1000", "Apto 12", "Bela Vista", "São Paulo", "SP", true),
  addr(4, 13, "Trabalho", "Carla Cliente (teste)", "01415000", "Rua Fictícia", "55", null, "Jardins", "São Paulo", "SP", false),
  addr(5, 14, "Casa", "Diego Cliente (teste)", "22041001", "Rua Imaginária", "300", null, "Copacabana", "Rio de Janeiro", "RJ", true),
]);

// ---------------------------------------------------------------- catálogo
section("Categorias e coleções");
const cats = [
  { n: 1, slug: "consoles", name: "Consoles", image: IMG.ps5 },
  { n: 2, slug: "pc-gamer", name: "PC Gamer", image: IMG.pcSetup },
  { n: 3, slug: "retro", name: "Retro", image: IMG.retro },
  { n: 4, slug: "notebooks", name: "Notebooks", image: IMG.laptop },
];
ins("categories", cats.map((c, i) => ({ id: uid("cat", c.n), slug: c.slug, name: c.name, position: i + 1, image_url: c.image })));
const catId = Object.fromEntries(cats.map((c) => [c.slug, uid("cat", c.n)]));

const cols = [
  { n: 1, slug: "ofertas", name: "Ofertas", description: "Produtos com preço promocional." },
  { n: 2, slug: "lancamentos", name: "Lançamentos", description: "Chegou agora." },
  { n: 3, slug: "seminovos", name: "Seminovos", description: "Unidades únicas revisadas pela DinoBlack." },
  { n: 4, slug: "raridades", name: "Raridades", description: "Itens raros e de colecionador." },
  { n: 5, slug: "destaques", name: "Destaques", description: "Seleção da casa." },
];
ins("collections", cols.map((c, i) => ({ id: uid("col", c.n), slug: c.slug, name: c.name, description: c.description, status: "published", position: i + 1 })));
const colId = Object.fromEntries(cols.map((c) => [c.slug, uid("col", c.n)]));

section("Locais de estoque");
ins("stock_locations", [
  { id: uid("loc", 1), code: "LOJA-SM", name: "Loja Santa Maria (Brasília - DF)", is_pickup: true },
  { id: uid("loc", 2), code: "DEP-01", name: "Depósito", is_pickup: false },
]);
const LOC = uid("loc", 1);

// Cada produto: variantes = [{key, opts, sku, stock:[onHand final, reserved], min}] ou unit (unidade única)
const FAQ_COMMON = [
  { q: "Como funciona a entrega?", a: "Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja." },
  { q: "Posso trocar ou devolver?", a: "Sim. As regras ficam na política de troca e devolução da loja." },
  { q: "Vocês compram usados?", a: "Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor." },
];
const specs = (...groups) => groups.map(([group, ...rows]) => ({ group, rows }));

const products = [
  {
    key: "ps5", n: 1, sku: "DB-PS5-01", name: "PlayStation 5 Slim · 1 TB", slug: "playstation-5-slim-1tb", cat: "consoles", cond: "novo",
    brand: "Sony", badge: "Flagship", sold: 120, rating: 4.9, price: 3899, compare: 4299, img: IMG.ps5,
    tagline: "SSD ultrarrápido, DualSense e o catálogo exclusivo da PlayStation em um console mais compacto.",
    facets: { platform: ["PlayStation"], type: ["Console"], brand: ["Sony"], storage: ["1 TB"] },
    options: { color: ["Branco", "Preto"], storage: ["1 TB"] },
    variants: [
      { key: "ps5-br", opts: { color: "Branco", storage: "1 TB" }, sku: "DB-PS5-01-BR", stock: [4, 1], min: 5 },
      { key: "ps5-pt", opts: { color: "Preto", storage: "1 TB" }, sku: "DB-PS5-01-PT", stock: [0, 0], min: 2 },
    ],
    highlights: [
      { title: "Carregamento quase instantâneo", text: "O SSD de alta velocidade praticamente elimina as telas de espera." },
      { title: "DualSense: você sente o jogo", text: "Feedback tátil e gatilhos adaptáveis em jogos compatíveis." },
      { title: "Imagem em até 4K", text: "Jogos em alta resolução e taxa de quadros elevada." },
    ],
    specs: specs(["Desempenho", ["Armazenamento", "SSD de 1 TB"], ["Resolução", "Até 4K"]], ["Geral", ["Marca", "Sony"], ["Condição", "Novo, lacrado"]]),
    inBox: ["Console PlayStation 5 Slim", "1 controle DualSense", "Cabo HDMI", "Cabo de energia", "Cabo USB", "Base de apoio"],
  },
  {
    key: "switch", n: 2, sku: "DB-SWO-02", name: "Nintendo Switch OLED", slug: "nintendo-switch-oled", cat: "consoles", cond: "novo",
    brand: "Nintendo", badge: "Flagship", sold: 86, rating: 4.8, price: 2149.9, compare: 2399, img: IMG.switch,
    tagline: "Tela OLED vibrante, base com porta de rede e a liberdade de jogar em casa ou na rua.",
    facets: { platform: ["Nintendo"], type: ["Console"], brand: ["Nintendo"], storage: ["64 GB"] },
    options: { color: ["Branco", "Neon azul e vermelho"] },
    variants: [
      { key: "sw-br", opts: { color: "Branco" }, sku: "DB-SWO-02-BR", stock: [3, 0], min: 4 },
      { key: "sw-ne", opts: { color: "Neon azul e vermelho" }, sku: "DB-SWO-02-NE", stock: [2, 0], min: 2 },
    ],
    highlights: [
      { title: "Tela OLED de 7 polegadas", text: "Cores intensas e pretos profundos." },
      { title: "Três modos, um console", text: "TV, portátil ou de mesa." },
      { title: "Biblioteca Nintendo", text: "Exclusivos para jogar sozinho ou em grupo." },
    ],
    specs: specs(["Tela e jogo", ["Tela", "OLED de 7 polegadas"], ["Armazenamento", "64 GB"]], ["Geral", ["Marca", "Nintendo"], ["Condição", "Novo, lacrado"]]),
    inBox: ["Console Nintendo Switch OLED", "2 controles Joy-Con", "Base (dock)", "Cabo HDMI", "Adaptador de energia"],
  },
  {
    key: "dualsense", n: 3, sku: "DB-DU-03", name: "Controle DualSense · Branco", slug: "dualsense-branco", cat: "consoles", cond: "seminovo",
    brand: "Sony", badge: "Premium Gear", sold: 0, price: 449, img: IMG.controller, warranty: 3,
    tagline: "Unidade seminovo revisada pela DinoBlack, com laudo, fotos reais e garantia.",
    facets: { platform: ["PlayStation"], type: ["Acessório"], brand: ["Sony"] },
    variants: [{ key: "du", opts: {}, sku: "DB-DU-03-U1" }],
    units: [{ variant: "du", serial: "SN-DEMO-DU-0001", grade: "Muito bom", summary: "Poucos sinais de uso, tudo funcionando.", tested: ["Botões e direcional", "Gatilhos adaptáveis", "Analógicos", "Bateria", "Conexão Bluetooth e USB"], included: ["Controle", "Cabo USB-C"], marks: ["Pequenas marcas de uso na parte traseira, visíveis nas fotos"], cost: 260 }],
    highlights: [
      { title: "Unidade única e revisada", text: "Você compra exatamente o controle das fotos." },
      { title: "Feedback tátil", text: "Vibração de alta precisão e gatilhos adaptáveis." },
      { title: "Preço de seminovo", text: "Mais barato que um novo, com garantia e laudo." },
    ],
    specs: specs(["Controle", ["Conexão", "Bluetooth e cabo USB-C"], ["Compatível com", "PlayStation 5 e PC"]], ["Geral", ["Condição", "Seminovo, unidade única"], ["Garantia", "90 dias"]]),
    inBox: ["Controle DualSense", "Cabo USB-C"],
  },
  {
    key: "nb4060", n: 4, sku: "DB-NB-04", name: "Notebook Gamer RTX 4060 · 16GB", slug: "notebook-gamer-rtx4060", cat: "notebooks", cond: "novo",
    brand: "Gamer", badge: "Flagship", sold: 12, price: 5799, compare: 6499, img: IMG.notebook,
    tagline: "Placa de vídeo dedicada e 16 GB de memória para jogar em alto desempenho.",
    facets: { platform: ["Windows"], type: ["Notebook"], brand: ["Gamer"], gpu: ["NVIDIA GeForce RTX 4060"], ram: ["16 GB"] },
    variants: [{ key: "nb4060", opts: {}, sku: "DB-NB-04-U", stock: [6, 0], min: 2 }],
    highlights: [{ title: "GPU dedicada RTX 4060", text: "Desempenho para jogos atuais." }, { title: "16 GB de memória", text: "Jogar e transmitir sem travar." }],
    specs: specs(["Desempenho", ["Placa de vídeo", "NVIDIA GeForce RTX 4060"], ["Memória RAM", "16 GB"]]),
    inBox: ["Notebook", "Carregador", "Manual e documentos de garantia"],
  },
  {
    key: "pc7", n: 5, sku: "DB-PC-05", name: "PC Gamer Ryzen 7 · RTX 4070", slug: "pc-gamer-ryzen7", cat: "pc-gamer", cond: "novo",
    brand: "Gamer", badge: "Premium Gear", sold: 5, price: 7499, img: IMG.pc,
    tagline: "Montado e testado pela DinoBlack, pronto para jogos em alta resolução.",
    facets: { platform: ["Windows"], type: ["PC completo"], brand: ["Gamer"], cpu: ["Ryzen 7"], gpu: ["NVIDIA GeForce RTX 4070"], ram: ["32 GB"] },
    variants: [{ key: "pc7", opts: {}, sku: "DB-PC-05-U", stock: [3, 0], min: 1 }],
    highlights: [{ title: "Montado e testado", text: "Teste de estresse antes do envio." }],
    specs: specs(["Desempenho", ["Processador", "Ryzen 7"], ["Placa de vídeo", "GeForce RTX 4070"], ["Memória RAM", "32 GB"]]),
    inBox: ["Gabinete montado", "Cabo de energia", "Manual"],
  },
  { key: "retromini", n: 6, sku: "DB-RT-06", name: "Console Retrô Mini · 10.000 jogos", slug: "console-retro-mini", cat: "retro", cond: "novo", brand: "Retrô", badge: "Premium Gear", sold: 41, price: 329, compare: 399, img: IMG.retro, facets: { platform: ["Retro"], type: ["Console"], brand: ["Retrô"] }, variants: [{ key: "retromini", opts: {}, sku: "DB-RT-06-U", stock: [14, 0], min: 4 }], tagline: "Milhares de clássicos em um console compacto.", highlights: [{ title: "Clássicos prontos para jogar", text: "Biblioteca embutida." }], specs: specs(["Geral", ["Condição", "Novo"]]), inBox: ["Console", "2 controles", "Cabo HDMI"] },
  { key: "headset", n: 7, sku: "DB-HS-07", name: "Headset Gamer 7.1 Surround", slug: "headset-gamer-7-1", cat: "pc-gamer", cond: "novo", brand: "Gamer", badge: "Premium Gear", sold: 58, price: 399, compare: 499, img: IMG.headset, facets: { platform: ["Multiplataforma"], type: ["Periférico"], brand: ["Gamer"] }, variants: [{ key: "headset", opts: {}, sku: "DB-HS-07-U", stock: [11, 0], min: 3 }], tagline: "Som envolvente para jogar com precisão.", highlights: [{ title: "Som 7.1", text: "Posicionamento de som para jogos competitivos." }], specs: specs(["Geral", ["Condição", "Novo"]]), inBox: ["Headset", "Cabo USB"] },
  { key: "teclado", n: 8, sku: "DB-KB-08", name: "Teclado Mecânico RGB Switch Red", slug: "teclado-mecanico-rgb", cat: "pc-gamer", cond: "novo", brand: "Gamer", badge: "Premium Gear", sold: 33, price: 349, compare: 429, img: IMG.keyboard, facets: { platform: ["Windows"], type: ["Periférico"], brand: ["Gamer"] }, variants: [{ key: "teclado", opts: {}, sku: "DB-KB-08-U", stock: [9, 0], min: 3 }], tagline: "Resposta rápida e iluminação RGB.", highlights: [{ title: "Switch Red", text: "Acionamento linear e silencioso." }], specs: specs(["Geral", ["Condição", "Novo"]]), inBox: ["Teclado", "Cabo USB"] },
  { key: "xboxs", n: 9, sku: "DB-XB-09", name: "Xbox Series S · 512 GB", slug: "xbox-series-s-512gb", cat: "consoles", cond: "novo", brand: "Microsoft", sold: 18, price: 2299, compare: 2499, img: IMG.switch, facets: { platform: ["Xbox"], type: ["Console"], brand: ["Microsoft"], storage: ["512 GB"] }, variants: [{ key: "xboxs", opts: {}, sku: "DB-XB-09-U", stock: [5, 0], min: 2 }], tagline: "Console digital compacto para a geração atual.", highlights: [{ title: "Compacto e digital", text: "Sem leitor de disco." }], specs: specs(["Geral", ["Armazenamento", "512 GB"]]), inBox: ["Console", "Controle", "Cabo HDMI"] },
  { key: "swlite", n: 10, sku: "DB-SWL-10", name: "Nintendo Switch Lite", slug: "nintendo-switch-lite", cat: "consoles", cond: "novo", brand: "Nintendo", sold: 22, price: 1499, img: IMG.switch, facets: { platform: ["Nintendo"], type: ["Console"], brand: ["Nintendo"] }, variants: [{ key: "swlite", opts: {}, sku: "DB-SWL-10-U", stock: [7, 0], min: 2 }], tagline: "Portátil, leve e pronto para jogar.", highlights: [{ title: "100% portátil", text: "Para jogar em qualquer lugar." }], specs: specs(["Geral", ["Modo de jogo", "Portátil"]]), inBox: ["Console", "Cabo de energia"] },
  { key: "ps4pro", n: 11, sku: "DB-PS4-11", name: "PlayStation 4 Pro · 1 TB", slug: "playstation-4-pro-1tb", cat: "consoles", cond: "seminovo", brand: "Sony", price: 1599, img: IMG.ps5, warranty: 3, facets: { platform: ["PlayStation"], type: ["Console"], brand: ["Sony"], storage: ["1 TB"] }, variants: [{ key: "ps4pro", opts: {}, sku: "DB-PS4-11-U1" }], units: [{ variant: "ps4pro", serial: "SN-DEMO-PS4-0001", grade: "Bom", summary: "Funcionamento perfeito, marcas de uso na carcaça.", tested: ["Leitor de disco", "HDMI", "Rede", "Disco rígido"], included: ["Console", "Controle", "Cabo HDMI", "Cabo de energia"], marks: ["Riscos leves na parte superior"], cost: 900 }], tagline: "Seminovo revisado, com laudo e garantia.", highlights: [{ title: "Revisado pela DinoBlack", text: "Testes de leitor, rede e armazenamento." }], specs: specs(["Geral", ["Condição", "Seminovo, unidade única"]]), inBox: ["Console", "Controle", "Cabo HDMI", "Cabo de energia"] },
  { key: "procontroller", n: 12, sku: "DB-PRO-12", name: "Controle Pro Switch", slug: "controle-pro-switch", cat: "consoles", cond: "novo", brand: "Nintendo", sold: 9, price: 399, img: IMG.controller, facets: { platform: ["Nintendo"], type: ["Acessório"], brand: ["Nintendo"] }, variants: [{ key: "procontroller", opts: {}, sku: "DB-PRO-12-U", stock: [8, 0], min: 3 }], tagline: "Controle confortável para sessões longas.", highlights: [{ title: "Ergonômico", text: "Pegada pensada para sessões longas." }], specs: specs(["Geral", ["Conexão", "Bluetooth e USB"]]), inBox: ["Controle", "Cabo USB"] },
  { key: "mouse", n: 13, sku: "DB-MS-13", name: "Mouse Gamer 8000 DPI", slug: "mouse-gamer-8000-dpi", cat: "pc-gamer", cond: "novo", brand: "Gamer", sold: 27, price: 169, compare: 199, img: IMG.keyboard, facets: { platform: ["Windows"], type: ["Periférico"], brand: ["Gamer"] }, variants: [{ key: "mouse", opts: {}, sku: "DB-MS-13-U", stock: [20, 0], min: 5 }], tagline: "Sensor preciso e leve.", highlights: [{ title: "8000 DPI", text: "Sensor ajustável." }], specs: specs(["Geral", ["DPI", "Até 8000"]]), inBox: ["Mouse", "Cabo USB"] },
  { key: "monitor", n: 14, sku: "DB-MN-14", name: "Monitor Gamer 27\" 165 Hz", slug: "monitor-gamer-27-165hz", cat: "pc-gamer", cond: "novo", brand: "Gamer", sold: 14, price: 1399, compare: 1599, img: IMG.pcSetup, facets: { platform: ["Windows"], type: ["Periférico"], brand: ["Gamer"] }, variants: [{ key: "monitor", opts: {}, sku: "DB-MN-14-U", stock: [6, 0], min: 2 }], tagline: "Fluidez de 165 Hz em 27 polegadas.", highlights: [{ title: "165 Hz", text: "Imagem fluida em jogos rápidos." }], specs: specs(["Tela", ["Tamanho", "27 polegadas"], ["Taxa de atualização", "165 Hz"]]), inBox: ["Monitor", "Cabo HDMI", "Fonte"] },
  { key: "ssd", n: 15, sku: "DB-SSD-15", name: "SSD NVMe 1 TB", slug: "ssd-nvme-1tb", cat: "pc-gamer", cond: "novo", brand: "Gamer", sold: 31, price: 449, img: IMG.pc, facets: { platform: ["Windows"], type: ["Componente"], brand: ["Gamer"], storage: ["1 TB"] }, variants: [{ key: "ssd", opts: {}, sku: "DB-SSD-15-U", stock: [18, 0], min: 5 }], tagline: "Leitura rápida para carregar jogos e sistema.", highlights: [{ title: "NVMe", text: "Muito mais rápido que um HD." }], specs: specs(["Geral", ["Capacidade", "1 TB"]]), inBox: ["SSD"] },
  { key: "rtx4060", n: 16, sku: "DB-GPU-16", name: "Placa de Vídeo RTX 4060 8 GB", slug: "placa-de-video-rtx-4060-8gb", cat: "pc-gamer", cond: "novo", brand: "Gamer", sold: 7, price: 2199, img: IMG.pc, facets: { platform: ["Windows"], type: ["Componente"], brand: ["Gamer"], gpu: ["NVIDIA GeForce RTX 4060"] }, variants: [{ key: "rtx4060", opts: {}, sku: "DB-GPU-16-U", stock: [4, 0], min: 2 }], tagline: "Desempenho para jogos em Full HD e além.", highlights: [{ title: "8 GB de memória", text: "Para texturas pesadas." }], specs: specs(["Geral", ["Memória", "8 GB"]]), inBox: ["Placa de vídeo"] },
  { key: "megadrive", n: 17, sku: "DB-MD-17", name: "Mega Drive com 2 Controles", slug: "mega-drive-2-controles", cat: "retro", cond: "raridade", brand: "Sega", price: 899, img: IMG.retro, warranty: 3, facets: { platform: ["Retro"], type: ["Console"], brand: ["Sega"] }, variants: [{ key: "megadrive", opts: {}, sku: "DB-MD-17-U1" }], units: [{ variant: "megadrive", serial: "SN-DEMO-MD-0001", grade: "Bom", summary: "Console de coleção funcionando, com marcas do tempo.", tested: ["Imagem", "Som", "Controles"], included: ["Console", "2 controles", "Cabos"], marks: ["Amarelamento leve da carcaça"], cost: 450 }], tagline: "Raridade de coleção, testada e funcionando.", highlights: [{ title: "Peça de coleção", text: "Testada em TV de tubo e LED." }], specs: specs(["Geral", ["Região", "NTSC-B"], ["Estado", "Usado, funcionando"]]), inBox: ["Console", "2 controles", "Cabo AV", "Fonte"] },
  { key: "snes", n: 18, sku: "DB-SN-18", name: "Super Nintendo com 2 Controles", slug: "super-nintendo-2-controles", cat: "retro", cond: "seminovo", brand: "Nintendo", price: 1099, img: IMG.retro, warranty: 3, facets: { platform: ["Retro"], type: ["Console"], brand: ["Nintendo"] }, variants: [{ key: "snes", opts: {}, sku: "DB-SN-18-U1" }], units: [{ variant: "snes", serial: "SN-DEMO-SN-0001", grade: "Muito bom", summary: "Console revisado e limpo.", tested: ["Imagem", "Som", "Controles", "Slot de cartucho"], included: ["Console", "2 controles", "Cabos"], marks: ["Sem marcas relevantes"], cost: 600 }], tagline: "Clássico revisado, pronto para jogar.", highlights: [{ title: "Revisado", text: "Limpeza e teste completos." }], specs: specs(["Geral", ["Região", "NTSC"]]), inBox: ["Console", "2 controles", "Cabo AV", "Fonte"] },
  { key: "mario", n: 19, sku: "DB-CT-19", name: "Cartucho Super Mario World", slug: "cartucho-super-mario-world", cat: "retro", cond: "raridade", brand: "Nintendo", price: 349, img: IMG.retro, warranty: 3, facets: { platform: ["Retro"], type: ["Jogo"], brand: ["Nintendo"] }, variants: [{ key: "mario", opts: {}, sku: "DB-CT-19-U1" }], units: [{ variant: "mario", serial: "SN-DEMO-CT-0001", grade: "Bom", summary: "Cartucho original testado.", tested: ["Leitura", "Save"], included: ["Cartucho"], marks: ["Etiqueta com desgaste leve"], cost: 180 }], tagline: "Cartucho original testado.", highlights: [{ title: "Original", text: "Verificado e testado." }], specs: specs(["Geral", ["Plataforma", "Super Nintendo"]]), inBox: ["Cartucho"] },
  { key: "nbi5", n: 20, sku: "DB-NB-20", name: "Notebook 15\" Core i5 · 16 GB", slug: "notebook-15-core-i5-16gb", cat: "notebooks", cond: "novo", brand: "Office", sold: 15, price: 3299, img: IMG.laptop, facets: { platform: ["Windows"], type: ["Notebook"], brand: ["Office"], cpu: ["Core i5"], ram: ["16 GB"] }, variants: [{ key: "nbi5", opts: {}, sku: "DB-NB-20-U", stock: [8, 0], min: 2 }], tagline: "Para trabalho, estudo e jogos leves.", highlights: [{ title: "16 GB de memória", text: "Fluido no dia a dia." }], specs: specs(["Desempenho", ["Processador", "Core i5"], ["Memória RAM", "16 GB"]]), inBox: ["Notebook", "Carregador"] },
  { key: "nbi7", n: 21, sku: "DB-NB-21", name: "Notebook Core i7 Seminovo · 16 GB", slug: "notebook-core-i7-seminovo", cat: "notebooks", cond: "seminovo", brand: "Office", price: 3999, img: IMG.laptop, warranty: 3, facets: { platform: ["Windows"], type: ["Notebook"], brand: ["Office"], cpu: ["Core i7"], ram: ["16 GB"] }, variants: [{ key: "nbi7", opts: {}, sku: "DB-NB-21-U1" }], units: [{ variant: "nbi7", serial: "SN-DEMO-NB-0001", grade: "Muito bom", summary: "Revisado, bateria saudável.", tested: ["Tela", "Teclado", "Bateria", "Portas"], included: ["Notebook", "Carregador"], marks: ["Marcas leves na tampa"], cost: 2300 }], tagline: "Seminovo revisado com garantia.", highlights: [{ title: "Bateria testada", text: "Autonomia verificada." }], specs: specs(["Desempenho", ["Processador", "Core i7"], ["Memória RAM", "16 GB"]]), inBox: ["Notebook", "Carregador"] },
  { key: "ps5pro", n: 22, sku: "DB-PS5P-22", name: "PlayStation 5 Pro · 2 TB", slug: "playstation-5-pro-2tb", cat: "consoles", cond: "pre_venda", brand: "Sony", price: 7299, img: IMG.ps5, facets: { platform: ["PlayStation"], type: ["Console"], brand: ["Sony"], storage: ["2 TB"] }, variants: [{ key: "ps5pro", opts: {}, sku: "DB-PS5P-22-U", stock: [0, 0], min: 0 }], tagline: "Reserve o seu. Data de chegada a confirmar.", highlights: [{ title: "Pré-venda", text: "Reserva sujeita à política de cancelamento." }], specs: specs(["Geral", ["Armazenamento", "2 TB"]]), inBox: ["Console", "Controle", "Cabos"] },
  { key: "draftfone", n: 23, sku: "DB-DRAFT-23", name: "Fone Gamer sem fio (rascunho)", slug: "fone-gamer-sem-fio-rascunho", cat: "pc-gamer", cond: "novo", brand: "Gamer", price: 599, img: IMG.headset, status: "draft", facets: { platform: ["Windows"], type: ["Periférico"] }, variants: [{ key: "draftfone", opts: {}, sku: "DB-DRAFT-23-U", stock: [0, 0], min: 0 }], tagline: "Produto em cadastro.", highlights: [], specs: [], inBox: [] },
  { key: "oldconsole", n: 24, sku: "DB-OLD-24", name: "Console antigo (arquivado)", slug: "console-antigo-arquivado", cat: "retro", cond: "raridade", brand: "Retrô", price: 500, img: IMG.retro, status: "archived", facets: { platform: ["Retro"], type: ["Console"] }, variants: [{ key: "oldconsole", opts: {}, sku: "DB-OLD-24-U", stock: [0, 0], min: 0 }], tagline: "Produto fora de catálogo.", highlights: [], specs: [], inBox: [] },
];

section("Produtos, mídia, filtros e variações");
const pid = (p) => uid("prod", p.n);
ins("products", products.map((p) => ({
  id: pid(p), slug: p.slug, sku: p.sku, name: p.name, category_id: catId[p.cat], condition: p.cond,
  status: p.status ?? "published", brand: p.brand, tagline: p.tagline ?? null, badge: p.badge ?? null,
  warranty_months: p.warranty ?? 12,
  warranty_text: p.cond === "seminovo" || p.cond === "raridade" ? "Garantia de 90 dias da DinoBlack, cobrindo defeitos de funcionamento." : "Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.",
  highlights: p.highlights ?? [], specs: p.specs ?? [], in_box: p.inBox ?? [], faq: FAQ_COMMON,
  sold_count: p.sold ?? 0, rating: p.rating ?? null,
  published_at: (p.status ?? "published") === "published" ? ago(`${30 + p.n} days`) : null,
})));

ins("product_media", products.flatMap((p) => [
  { id: uid("item", 1000 + p.n * 10), product_id: pid(p), url: p.img, alt: p.name, position: 1 },
  { id: uid("item", 1001 + p.n * 10), product_id: pid(p), url: p.img, alt: `${p.name}, detalhe`, position: 2, crop: "20% 30%" },
  { id: uid("item", 1002 + p.n * 10), product_id: pid(p), url: p.img, alt: `${p.name}, vista lateral`, position: 3, crop: "85% 70%" },
]));

ins("product_facets", products.flatMap((p) => Object.entries(p.facets).flatMap(([k, vs]) => vs.map((v) => ({ product_id: pid(p), facet_key: k, facet_value: v })))));

// Opções e variações
const optRows = [];
const optValRows = [];
let optN = 0;
for (const p of products.filter((x) => x.options)) {
  Object.entries(p.options).forEach(([code, labels], i) => {
    optN += 1;
    optRows.push({ id: uid("opt", optN), product_id: pid(p), code, name: code === "color" ? "Cor" : "Armazenamento", position: i });
    labels.forEach((label, j) => optValRows.push({ id: uid("optv", optN * 10 + j), option_id: uid("opt", optN), label, position: j }));
  });
}
ins("product_options", optRows);
ins("product_option_values", optValRows);

const variantId = {};
let varN = 0;
const variantRows = [];
for (const p of products) {
  for (const v of p.variants) {
    varN += 1;
    variantId[v.key] = uid("var", varN);
    variantRows.push({ id: variantId[v.key], product_id: pid(p), sku: v.sku, option_values: v.opts, price: p.price, compare_at: p.compare ?? null, max_installments: 10, weight_grams: 800, width_mm: 300, height_mm: 120, length_mm: 400 });
  }
}
ins("product_variants", variantRows);

ins("collection_products", [
  ...products.filter((p) => p.compare && !p.status).map((p, i) => ({ collection_id: colId.ofertas, product_id: pid(p), position: i })),
  ...products.filter((p) => ["ps5pro", "xboxs", "swlite"].includes(p.key)).map((p, i) => ({ collection_id: colId.lancamentos, product_id: pid(p), position: i })),
  ...products.filter((p) => p.cond === "seminovo").map((p, i) => ({ collection_id: colId.seminovos, product_id: pid(p), position: i })),
  ...products.filter((p) => p.cond === "raridade" && !p.status).map((p, i) => ({ collection_id: colId.raridades, product_id: pid(p), position: i })),
  ...products.filter((p) => ["ps5", "switch", "nb4060", "pc7", "retromini"].includes(p.key)).map((p, i) => ({ collection_id: colId.destaques, product_id: pid(p), position: i })),
]);

ins("kits", [{ id: uid("kit", 1), base_product_id: pid(products[0]), name: "Kit PS5 + controle extra", status: "draft" }]);
ins("kit_components", [{ kit_id: uid("kit", 1), product_id: pid(products[2]), slot: "controle", is_required: false, extra_price: 0 }]);

// ---------------------------------------------------------------- estoque
section("Estoque: saldos, unidades únicas e movimentações");
// Pedidos de teste (definidos abaixo) vendem estes itens; a entrada inicial = saldo final + vendas.
const sold = {};
const sell = (variantKey, qty) => { sold[variantKey] = (sold[variantKey] ?? 0) + qty; };

const levelRows = [];
for (const p of products) {
  for (const v of p.variants.filter((x) => x.stock)) {
    levelRows.push({ variant: v.key, onHand: v.stock[0], reserved: v.stock[1], min: v.min });
  }
}

// ---------------------------------------------------------------- pedidos de teste
const addrSnap = (a) => ({ recipient: a.recipient, cep: a.cep, street: a.street, number: a.number, complement: a.complement, district: a.district, city: a.city, state: a.state });
const ADDR = {
  ana: addrSnap({ recipient: "Ana Cliente (teste)", cep: "72510000", street: "Quadra 101 Conjunto A", number: "10", complement: "Casa 1", district: "Santa Maria", city: "Brasília", state: "DF" }),
  bruno: addrSnap({ recipient: "Bruno Cliente (teste)", cep: "72515000", street: "Quadra 205 Conjunto B", number: "22", complement: null, district: "Santa Maria", city: "Brasília", state: "DF" }),
  carla: addrSnap({ recipient: "Carla Cliente (teste)", cep: "01310100", street: "Avenida Exemplo", number: "1000", complement: "Apto 12", district: "Bela Vista", city: "São Paulo", state: "SP" }),
  diego: addrSnap({ recipient: "Diego Cliente (teste)", cep: "22041001", street: "Rua Imaginária", number: "300", complement: null, district: "Copacabana", city: "Rio de Janeiro", state: "RJ" }),
  guest: addrSnap({ recipient: "Visitante Teste", cep: "70040010", street: "Quadra Fictícia", number: "1", complement: null, district: "Asa Sul", city: "Brasília", state: "DF" }),
};
const prodByKey = Object.fromEntries(products.map((p) => [p.key, p]));
const varProd = Object.fromEntries(products.flatMap((p) => p.variants.map((v) => [v.key, p])));

const orderDefs = [
  { n: 1, user: C.c1, addr: ADDR.ana, status: "delivered", when: "14 days", method: "SEDEX", ship: 24.9, eta: 3, pay: "credit_card", inst: 3, items: [["sw-br", 1], ["headset", 1]], shipment: { status: "delivered", carrier: "Correios", service: "SEDEX", code: "BR000000001TE", shipped: "13 days", delivered: "10 days" } },
  { n: 2, user: C.c2, addr: ADDR.bruno, status: "shipped", when: "3 days", method: "Entrega local", ship: 14.9, eta: 2, pay: "pix", items: [["nb4060", 1]], shipment: { status: "shipped", carrier: "Transportadora Fictícia", service: "Expressa", code: "TF000000002TE", shipped: "1 day" } },
  { n: 3, user: C.c3, addr: ADDR.carla, status: "preparing", when: "1 day", method: "Econômica", ship: 38.5, eta: 7, pay: "pix", items: [["mouse", 2], ["teclado", 1]], shipment: { status: "ready" } },
  { n: 4, user: C.c1, addr: ADDR.ana, status: "paid", when: "3 hours", method: "Retirada na loja", ship: 0, eta: 0, pay: "pix", items: [["monitor", 1]], shipment: { status: "pending" } },
  { n: 5, user: C.c4, addr: ADDR.diego, status: "pending_payment", when: "10 minutes", method: "Expressa", ship: 52.3, eta: 4, pay: "pix", items: [["ps5-br", 1]], reserved: true },
  { n: 6, user: C.c2, addr: ADDR.bruno, status: "cancelled", when: "5 days", method: "Entrega local", ship: 14.9, eta: 2, pay: "pix", items: [["swlite", 1]], cancelReason: "Pagamento não confirmado no prazo" },
  { n: 7, guest: "visitante@teste.dinoblack.example", addr: ADDR.guest, status: "paid", when: "2 days", method: "Retirada na loja", ship: 0, eta: 0, pay: "credit_card", inst: 1, items: [["snes", 1, "unit"]], shipment: { status: "pending" } },
  { n: 8, user: C.c3, addr: ADDR.carla, status: "returned", when: "12 days", method: "Econômica", ship: 38.5, eta: 7, pay: "credit_card", inst: 2, items: [["headset", 1]], shipment: { status: "delivered", carrier: "Correios", service: "PAC", code: "BR000000008TE", shipped: "11 days", delivered: "6 days" }, returned: true },
  { n: 9, user: C.c4, addr: ADDR.diego, status: "delivered", when: "20 days", method: "PAC", ship: 31.2, eta: 8, pay: "credit_card", inst: 1, coupon: "DINO10", items: [["retromini", 1]], shipment: { status: "delivered", carrier: "Correios", service: "PAC", code: "BR000000009TE", shipped: "19 days", delivered: "12 days" } },
  { n: 10, user: C.c2, addr: ADDR.bruno, status: "paid", when: "6 hours", method: "Entrega local", ship: 14.9, eta: 2, pay: "credit_card", inst: 4, coupon: "BEMVINDO50", items: [["xboxs", 1]], shipment: { status: "pending" } },
];

// ---------------------------------------------------------------- unidades únicas
const unitRows = [];
const unitId = {};
let unitN = 0;
for (const p of products) {
  for (const u of p.units ?? []) {
    unitN += 1;
    unitId[u.variant] = uid("unit", unitN);
    const soldUnit = orderDefs.some((o) => o.items.some(([k, , t]) => k === u.variant && t === "unit") && !["cancelled"].includes(o.status));
    unitRows.push({
      id: unitId[u.variant], product_id: pid(p), variant_id: variantId[u.variant], location_id: LOC, serial: u.serial,
      status: soldUnit ? "vendido" : "disponivel", grade: u.grade,
      report: { summary: u.summary, tested: u.tested, included: u.included, knownMarks: u.marks },
      photos: [{ url: p.img, alt: `${p.name}, foto da unidade 1` }, { url: p.img, alt: `${p.name}, foto da unidade 2` }],
      warranty_days: 90, cost: u.cost, acquired_at: ago(`${40 + unitN} days`),
    });
  }
}
ins("inventory_units", unitRows);

// Pedido: cálculo de totais e linhas
const couponDefs = {
  DINO10: { n: 1, kind: "percent", value: 10 },
  BEMVINDO50: { n: 2, kind: "amount", value: 50 },
};
const priceOf = (variantKey) => varProd[variantKey].price;

const orderRows = [];
const itemRows = [];
const paymentRows = [];
const shipmentRows = [];
const eventRows = [];
const redemptionRows = [];
const returnRows = [];
let itemN = 0;
for (const o of orderDefs) {
  const oid = uid("order", o.n);
  const lines = o.items.map(([vk, qty, t]) => ({ vk, qty, unit: t === "unit" }));
  const subtotal = lines.reduce((s, l) => s + priceOf(l.vk) * l.qty, 0);
  const cp = o.coupon ? couponDefs[o.coupon] : null;
  const discount = cp ? Math.min(subtotal, cp.kind === "percent" ? Math.round(subtotal * cp.value) / 100 : cp.value) : 0;
  const total = Math.round((subtotal - discount + o.ship) * 100) / 100;
  const paid = ["paid", "preparing", "shipped", "delivered", "returned"].includes(o.status);
  orderRows.push({
    id: oid, number: `DB-${1000 + o.n}`, user_id: o.user ? uid("user", o.user.n) : null, guest_email: o.guest ?? null, status: o.status,
    coupon_id: cp ? uid("coupon", cp.n) : null, subtotal: Math.round(subtotal * 100) / 100, discount_total: discount, shipping_total: o.ship, total,
    shipping_address: o.addr, shipping_method: o.method, shipping_eta_days: o.eta, placed_at: ago(o.when),
    paid_at: paid ? ago(o.when) : null, cancelled_at: o.status === "cancelled" ? ago(o.when) : null, cancel_reason: o.cancelReason ?? null,
  });
  for (const l of lines) {
    const p = varProd[l.vk];
    const variant = p.variants.find((v) => v.key === l.vk);
    itemN += 1;
    itemRows.push({
      id: uid("item", itemN), order_id: oid, product_id: pid(p), variant_id: variantId[l.vk], unit_id: l.unit ? unitId[l.vk] : null,
      quantity: l.qty, unit_price: p.price,
      snapshot: { name: p.name, sku: variant.sku, condition: p.cond, options: variant.opts, image: p.img, warrantyMonths: p.warranty ?? 12, ...(l.unit ? { grade: "Muito bom" } : { locationId: LOC }) },
    });
    if (!l.unit && paid) sell(l.vk, l.qty);
    if (!l.unit && o.returned) sell(l.vk, 0);
  }
  paymentRows.push({
    id: uid("pay", o.n), order_id: oid, method: o.pay,
    status: paid ? "paid" : o.status === "cancelled" ? "expired" : "pending", amount: total, installments: o.inst ?? 1,
    provider: "mock", provider_ref: `MOCK-PAY-${o.n}`, pix_expires_at: o.pay === "pix" ? ago(o.when).__raw && raw(`now() - interval '${o.when}' + interval '30 minutes'`) : null,
    paid_at: paid ? ago(o.when) : null,
  });
  if (o.shipment) {
    const s = o.shipment;
    shipmentRows.push({
      id: uid("ship", o.n), order_id: oid, status: s.status, carrier: s.carrier ?? null, service: s.service ?? null, tracking_code: s.code ?? null,
      shipped_at: s.shipped ? ago(s.shipped) : null, delivered_at: s.delivered ? ago(s.delivered) : null,
      events: s.code ? [{ at: "2026-11-01T10:00:00Z", status: "Objeto postado", place: "Brasília - DF" }] : [],
    });
  }
  eventRows.push({ order_id: oid, type: "status_changed", to_status: "pending_payment", message: "Pedido criado", actor_id: o.user ? uid("user", o.user.n) : null, created_at: ago(o.when) });
  if (paid) eventRows.push({ order_id: oid, type: "status_changed", from_status: "pending_payment", to_status: "paid", message: "Pagamento confirmado", created_at: ago(o.when) });
  if (["shipped", "delivered"].includes(o.status) || o.returned) eventRows.push({ order_id: oid, type: "status_changed", from_status: "preparing", to_status: "shipped", message: "Pedido enviado", actor_id: uid("user", S.stock.n), created_at: ago(o.shipment?.shipped ?? o.when) });
  if (o.status === "delivered" || o.returned) eventRows.push({ order_id: oid, type: "status_changed", from_status: "shipped", to_status: "delivered", message: "Pedido entregue", created_at: ago(o.shipment?.delivered ?? o.when) });
  if (o.status === "cancelled") eventRows.push({ order_id: oid, type: "status_changed", from_status: "pending_payment", to_status: "cancelled", message: o.cancelReason, created_at: ago(o.when) });
  if (cp) redemptionRows.push({ coupon_id: uid("coupon", cp.n), order_id: oid, user_id: uid("user", o.user.n), discount });
  if (o.returned) {
    eventRows.push({ order_id: oid, type: "status_changed", from_status: "delivered", to_status: "returned", message: "Devolução aprovada (garantia)", actor_id: uid("user", S.support.n), created_at: ago("3 days") });
    returnRows.push({ id: uid("ret", 1), order_id: oid, order_item_id: uid("item", itemN), user_id: uid("user", o.user.n), kind: "garantia", status: "approved", reason: "Microfone com falha intermitente.", resolution: "Troca aprovada.", created_at: ago("5 days") });
  }
}

ins("inventory_levels", levelRows.map((l) => ({ variant_id: variantId[l.variant], location_id: LOC, on_hand: l.onHand, reserved: l.reserved, min_level: l.min })));

// Movimentações: entrada inicial (saldo final + vendas) e as saídas e reservas dos pedidos de teste.
const ADJUST = { swlite: 1 }; // ajuste de inventário registrado abaixo
const movementRows = [];
for (const l of levelRows) {
  movementRows.push({ variant_id: variantId[l.variant], location_id: LOC, type: "entrada", quantity: l.onHand + (sold[l.variant] ?? 0) - (ADJUST[l.variant] ?? 0), reason: "Entrada inicial (compra de fornecedor, dado fictício)", actor_id: uid("user", S.stock.n), created_at: ago("45 days") });
}
for (const it of itemRows) {
  const o = orderDefs.find((d) => uid("order", d.n) === it.order_id);
  if (it.unit_id) {
    if (!["cancelled", "pending_payment"].includes(o.status)) movementRows.push({ unit_id: it.unit_id, type: "saida", quantity: 1, reason: `venda DB-${1000 + o.n}`, order_id: it.order_id, created_at: ago(o.when) });
  } else if (o.reserved) {
    movementRows.push({ variant_id: it.variant_id, location_id: LOC, type: "reserva", quantity: it.quantity, reason: `pedido DB-${1000 + o.n} aguardando pagamento`, order_id: it.order_id, created_at: ago(o.when) });
  } else if (!["cancelled"].includes(o.status)) {
    movementRows.push({ variant_id: it.variant_id, location_id: LOC, type: "saida", quantity: it.quantity, reason: `venda DB-${1000 + o.n}`, order_id: it.order_id, created_at: ago(o.when) });
  }
}
movementRows.push({ variant_id: variantId["swlite"], location_id: LOC, type: "ajuste", quantity: 1, reason: "Contagem de inventário: 1 unidade encontrada a mais", actor_id: uid("user", S.stock.n), created_at: ago("2 days") });
section("Cupons, promoções e pedidos de teste");
ins("coupons", [
  { id: uid("coupon", 1), code: "DINO10", kind: "percent", value: 10, min_subtotal: 0, max_uses: 100, max_uses_per_user: 1, starts_at: ago("10 days"), ends_at: ahead("60 days"), is_active: true },
  { id: uid("coupon", 2), code: "BEMVINDO50", kind: "amount", value: 50, min_subtotal: 500, max_uses: null, max_uses_per_user: 1, starts_at: null, ends_at: null, is_active: true },
  { id: uid("coupon", 3), code: "EXPIRADO", kind: "percent", value: 15, min_subtotal: 0, max_uses: null, max_uses_per_user: 1, starts_at: ago("40 days"), ends_at: ago("5 days"), is_active: true },
  { id: uid("coupon", 4), code: "LIMITE1", kind: "percent", value: 5, min_subtotal: 0, max_uses: 1, max_uses_per_user: 1, starts_at: null, ends_at: null, is_active: true },
]);

ins("promotions", [
  { id: uid("promo", 1), name: "Flash Drop de novembro", kind: "percent", value: 10, scope: "products", starts_at: ago("1 hour"), ends_at: ahead("6 hours"), status: "published", show_countdown: true },
  { id: uid("promo", 2), name: "Oferta Retro (rascunho)", kind: "percent", value: 10, scope: "collection", collection_id: colId.raridades, starts_at: ahead("2 days"), ends_at: ahead("12 days"), status: "draft", show_countdown: false },
  { id: uid("promo", 3), name: "Semana Gamer (encerrada)", kind: "percent", value: 5, scope: "category", category_id: catId["pc-gamer"], starts_at: ago("20 days"), ends_at: ago("10 days"), status: "published", show_countdown: false },
]);
ins("promotion_products", ["mouse", "monitor", "ssd"].map((k) => ({ promotion_id: uid("promo", 1), product_id: pid(prodByKey[k]) })));

ins("orders", orderRows);
ins("order_items", itemRows);
ins("payments", paymentRows);
ins("shipments", shipmentRows);
ins("order_events", eventRows);
ins("coupon_redemptions", redemptionRows);
ins("return_requests", returnRows);
ins("inventory_movements", movementRows); // depois dos pedidos (FK)

// Atualiza o contador de vendas e o saldo dos produtos conforme as vendas de teste.
statements.push(`select setval('order_number_seq', 1010);`);

// ---------------------------------------------------------------- carrinhos
section("Carrinhos abertos");
ins("carts", [
  { id: uid("cart", 1), user_id: uid("user", C.c1.n), status: "open" },
  { id: uid("cart", 2), user_id: uid("user", C.c4.n), status: "open" },
]);
ins("cart_items", [
  { cart_id: uid("cart", 1), variant_id: variantId["sw-ne"], quantity: 1 },
  { cart_id: uid("cart", 1), variant_id: variantId["ssd"], quantity: 2 },
  { cart_id: uid("cart", 2), variant_id: variantId["du"], unit_id: unitId["du"], quantity: 1 },
]);

// ---------------------------------------------------------------- usados
section("Venda de usados (Projeto Drop)");
const usedDefs = [
  { n: 80, status: "accepted", who: C.c1, item: "PlayStation 4 Slim 500 GB com 2 controles", cond: "Bom, funcionando", acc: "Controles e cabos", assignee: S.appraiser, when: "25 days", offer: { amount: 700, kind: "dinheiro", decision: "accepted" } },
  { n: 81, status: "declined", who: C.c2, item: "Nintendo Switch com tela trincada", cond: "Tela trincada", acc: "Somente o console", assignee: S.appraiser, when: "15 days", offer: { amount: 300, kind: "credito", decision: "declined" } },
  { n: 82, status: "in_review", who: C.c3, item: "Jogo retrô Super Nintendo (cartucho)", cond: "Bom estado", acc: "Cartucho", assignee: S.appraiser, when: "4 days" },
  { n: 83, status: "awaiting_customer", who: C.c4, item: "Notebook gamer 2021, 16 GB", cond: "Funcionando, bateria fraca", acc: "Carregador", assignee: S.appraiser, when: "3 days" },
  { n: 84, status: "new", who: null, name: "Visitante Teste", email: "visitante@teste.dinoblack.example", item: "Console retrô sem marca, funcionando", cond: "Usado", acc: "Sem acessórios", when: "5 hours" },
];
ins("used_requests", usedDefs.map((u) => ({
  id: uid("used", u.n), protocol: `US-${String(u.n).padStart(4, "0")}`, user_id: u.who ? uid("user", u.who.n) : null,
  contact_name: u.who?.name ?? u.name, contact_email: u.who?.email ?? u.email, contact_phone: u.who?.phone ?? "(61) 90000-0099",
  item_description: u.item, category_id: u.n === 84 ? catId.retro : u.n === 83 ? catId.notebooks : catId.consoles, declared_condition: u.cond, accessories: u.acc,
  status: u.status, assigned_to: u.assignee ? uid("user", u.assignee.n) : null, terms_accepted_at: ago(u.when), created_at: ago(u.when),
})));
ins("used_request_photos", usedDefs.flatMap((u) => [1, 2].map((i) => ({ request_id: uid("used", u.n), storage_path: `used-requests/US-${String(u.n).padStart(4, "0")}/foto-${i}.jpg` }))));
ins("used_offers", usedDefs.filter((u) => u.offer).map((u) => ({ request_id: uid("used", u.n), amount: u.offer.amount, kind: u.offer.kind, message: "Proposta de avaliação (dado fictício). Não é oferta final automática.", decision: u.offer.decision, created_by: uid("user", S.appraiser.n), created_at: ago("10 days") })));
ins("used_request_events", usedDefs.flatMap((u) => [
  { request_id: uid("used", u.n), type: "created", message: "Solicitação recebida", created_at: ago(u.when) },
  ...(u.status !== "new" ? [{ request_id: uid("used", u.n), type: "status_changed", message: `Status: ${u.status}`, actor_id: uid("user", S.appraiser.n), created_at: ago(u.when) }] : []),
]));
statements.push(`select setval('used_protocol_seq', 85, false);`);

// ---------------------------------------------------------------- conteúdo
section("Banners, páginas, menus, redirects e configurações");
ins("banners", [
  { id: uid("banner", 1), placement: "home_hero", eyebrow: "POTÊNCIA. VELOCIDADE. NEXT GEN.", title: "PlayStation 5 Slim", description: "SSD ultrarrápido, DualSense e catálogo exclusivo para uma experiência de console sem igual.", cta_label: "Explorar agora", href: "/produto/playstation-5-slim-1tb", image_url: img("1606144042614-b2417e99c4e3").replace("w=900", "w=1400"), position: 1, status: "published" },
  { id: uid("banner", 2), placement: "home_hero", eyebrow: "PERFORMANCE PARA JOGO E CRIAÇÃO", title: "Notebook Gamer RTX 4060", description: "Tela de alto refresh, 16 GB de RAM e placa dedicada para AAA e streaming.", cta_label: "Explorar agora", href: "/produto/notebook-gamer-rtx4060", image_url: img("1517336714731-489689fd1ca8").replace("w=900", "w=1400"), position: 2, status: "published" },
  { id: uid("banner", 3), placement: "home_hero", eyebrow: "JOGUE EM CASA OU NA RUA", title: "Nintendo Switch OLED", description: "Tela OLED vibrante, dock inclusa e biblioteca completa de exclusivos Nintendo.", cta_label: "Explorar agora", href: "/produto/nintendo-switch-oled", image_url: img("1621259182978-fbf93132d53d").replace("w=900", "w=1400"), position: 3, status: "published" },
  { id: uid("banner", 4), placement: "shop_banner", eyebrow: "Potência. Preço bom. Garantia.", title: "Loja", description: "Tudo para o seu setup, do console ao notebook.", cta_label: "Ver promoções", href: "/loja?promocao=1", image_url: IMG.ps5, position: 1, status: "published" },
  { id: uid("banner", 5), placement: "home_hero", title: "Campanha Retro (rascunho)", cta_label: "Ver retro", href: "/loja?categoria=retro", image_url: IMG.retro, position: 4, status: "draft" },
  { id: uid("banner", 6), placement: "home_hero", title: "Campanha encerrada", cta_label: "Ver ofertas", href: "/loja?promocao=1", image_url: IMG.pcSetup, position: 5, status: "published", starts_at: ago("30 days"), ends_at: ago("20 days") },
]);

const md = (t) => `# ${t}\n\nTexto de exemplo (dado fictício). Substituir pelo conteúdo oficial aprovado pelo cliente e pela assessoria competente.`;
const pageDefs = [
  ["quem-somos", "Quem somos", "institutional", "published"],
  ["sobre", "Sobre nós", "institutional", "published"],
  ["contato", "Contato", "institutional", "published"],
  ["trabalhe-conosco", "Trabalhe conosco", "institutional", "published"],
  ["projeto-drop", "Projeto Drop: a DinoBlack compra seu usado", "institutional", "published"],
  ["politica-de-troca-e-devolucao", "Política de troca e devolução", "policy", "published"],
  ["politica-de-privacidade", "Política de privacidade", "policy", "published"],
  ["entrega-e-garantia", "Entrega e garantia", "policy", "published"],
  ["regulamento-promocao-site-novo-premiado", "Regulamento: promoção Site Novo Premiado", "campaign", "draft"],
];
ins("pages", pageDefs.map(([slug, title, kind, status], i) => ({ id: uid("page", i + 1), slug, title, kind, body_md: md(title), status, published_at: status === "published" ? ago("20 days") : null, noindex: status !== "published" })));

const navRows = [];
let navN = 0;
const nav = (menu, label, href, position, parent = null) => { navN += 1; navRows.push({ id: uid("nav", navN), menu, parent_id: parent, label, href, position }); return uid("nav", navN); };
[["Início", "/"], ["Loja", "/loja"], ["Sobre", "/sobre"], ["Contato", "/contato"]].forEach(([l, h], i) => nav("header", l, h, i));
cats.forEach((c, i) => nav("categories", c.name, `/loja?categoria=${c.slug}`, i));
const footerCols = [
  ["Departamentos", ["PlayStation", "Nintendo", "Xbox", "Variados", "Pré-Vendas"]],
  ["Institucional", ["Projeto Drop - A DinoBlack Compra seu Usado!", "Quem Somos", "Trabalhe Conosco", "Políticas de Troca e Devoluções", "Políticas de Privacidade"]],
  ["Minha conta", ["Minha Conta", "Meus Pedidos"]],
  ["Novidade e promoções", ["Regulamento Promoção - Site Novo Premiado"]],
];
footerCols.forEach(([title, items], i) => {
  const parent = nav("footer", title, null, i);
  items.forEach((label, j) => nav("footer", label, null, j, parent));
});
ins("nav_items", navRows);

ins("redirects", [
  { from_path: "/loja/", to_path: "/loja", status_code: 301, note: "Site antigo" },
  { from_path: "/categoria-produto/playstation/", to_path: "/loja?plataforma=playstation", status_code: 301, note: "Site antigo" },
  { from_path: "/categoria-produto/nintendo/", to_path: "/loja?plataforma=nintendo", status_code: 301, note: "Site antigo" },
  { from_path: "/categoria-produto/xbox/", to_path: "/loja?plataforma=xbox", status_code: 301, note: "Site antigo" },
  { from_path: "/minha-conta/", to_path: "/conta", status_code: 301, note: "Site antigo" },
  { from_path: "/minha-conta/pedidos/", to_path: "/pedidos", status_code: 301, note: "Site antigo" },
  { from_path: "/quem-somos", to_path: "/sobre", status_code: 301, note: "Site antigo" },
]);

ins("store_settings", [
  { key: "store_name", value: jsonb("DinoBlack Games e Informática"), is_public: true },
  { key: "address", value: { text: "Qr 117 Conjunto Q, 05 - Santa Maria, Brasília - DF.", maps: "https://maps.app.goo.gl/Kte3czHkyV267t836" }, is_public: true },
  { key: "contact", value: { whatsapp: "5561992926551", display: "(61) 99292-6551" }, is_public: true },
  { key: "socials", value: { youtube: "https://www.youtube.com/@DinoBlackGames", tiktok: "https://www.tiktok.com/@dinoblack.games", facebook: "https://www.facebook.com/dinoblackgames" }, is_public: true },
  { key: "checkout", value: { maxInstallments: 10, pickupLocation: "LOJA-SM" }, is_public: true },
  { key: "shipping_origin", value: { cep: "72510000", note: "Dado fictício" }, is_public: false },
  { key: "stock_alerts", value: { notifyRoles: ["owner", "manager", "stock"] }, is_public: false },
]);

// ---------------------------------------------------------------- relacionamento, operação
section("Consentimentos, privacidade, suporte e operação");
ins("consents", [
  { user_id: uid("user", C.c1.n), channel: "email", purpose: "transactional", granted: true, source: "cadastro" },
  { user_id: uid("user", C.c1.n), channel: "whatsapp", purpose: "marketing", granted: true, source: "checkout", created_at: ago("14 days") },
  { user_id: uid("user", C.c2.n), channel: "email", purpose: "transactional", granted: true, source: "cadastro" },
  { user_id: uid("user", C.c2.n), channel: "email", purpose: "marketing", granted: false, source: "checkout" },
  { user_id: uid("user", C.c3.n), channel: "email", purpose: "marketing", granted: true, source: "cadastro", created_at: ago("20 days") },
  { user_id: uid("user", C.c3.n), channel: "email", purpose: "marketing", granted: false, source: "central de preferências", created_at: ago("2 days") },
  { email: "visitante@teste.dinoblack.example", channel: "email", purpose: "transactional", granted: true, source: "checkout visitante" },
]);
ins("privacy_requests", [
  { user_id: uid("user", C.c3.n), contact_email: C.c3.email, type: "access", status: "in_progress", details: "Solicito cópia dos meus dados.", due_at: ahead("10 days") },
  { user_id: uid("user", C.c4.n), contact_email: C.c4.email, type: "deletion", status: "received", details: "Solicito a exclusão da conta.", due_at: ahead("14 days") },
]);
ins("contact_messages", [
  { name: "Visitante Teste", email: "visitante@teste.dinoblack.example", phone: "(61) 90000-0099", subject: "Dúvida sobre garantia", message: "Qual o prazo de garantia dos seminovos?", handled: false },
  { name: "Ana Cliente (teste)", email: C.c1.email, subject: "Prazo de entrega", message: "Vocês entregam em Santa Maria no mesmo dia?", handled: true },
  { name: "Empresa Teste", email: "parceria@teste.dinoblack.example", subject: "Parceria", message: "Gostaríamos de conversar sobre uma parceria.", handled: false },
]);
ins("back_in_stock_alerts", [
  { product_id: pid(prodByKey.ps5), variant_id: variantId["ps5-pt"], user_id: uid("user", C.c4.n) },
  { product_id: pid(prodByKey.ps5), variant_id: variantId["ps5-pt"], email: "visitante@teste.dinoblack.example" },
  { product_id: pid(prodByKey.ps5pro), user_id: uid("user", C.c1.n) },
]);
ins("product_reviews", [
  { product_id: pid(prodByKey.headset), user_id: uid("user", C.c1.n), rating: 5, body: "Avaliação de teste, não publicada (sem fonte confiável definida).", source: "teste", status: "draft" },
  { product_id: pid(prodByKey.switch), user_id: uid("user", C.c1.n), rating: 4, body: "Avaliação de teste, não publicada.", source: "teste", status: "draft" },
]);

ins("integrations", [
  { domain: "payments", provider: "mock", status: "sandbox", owner_name: "A definir", notes: "Gateway de teste interno. Fornecedor real ainda não escolhido." },
  { domain: "shipping", status: "not_configured", notes: "Cotação por CEP simulada na loja." },
  { domain: "erp", status: "not_configured", notes: "ERP e fonte canônica de estoque a validar na descoberta." },
  { domain: "fiscal", status: "not_configured" },
  { domain: "messaging", status: "not_configured", notes: "E-mail e WhatsApp transacionais pendentes." },
  { domain: "analytics", status: "not_configured" },
]);
ins("integration_events", [
  { domain: "payments", provider: "mock", external_id: "evt_mock_001", event_type: "payment.paid", payload: { order: "DB-1004" }, status: "processed", attempts: 1, received_at: ago("3 hours"), processed_at: ago("3 hours") },
  { domain: "payments", provider: "mock", external_id: "evt_mock_002", event_type: "payment.paid", payload: { order: "DB-1999" }, status: "failed", attempts: 3, error: "pedido inexistente", received_at: ago("1 day") },
]);
ins("admin_notifications", [
  { kind: "estoque_baixo", title: "PS5 Slim Branco abaixo do mínimo", body: "Disponível 3, mínimo 5.", ref_table: "product_variants", ref_id: variantId["ps5-br"] },
  { kind: "sem_saldo", title: "PS5 Slim Preto sem saldo", body: "Sem unidades disponíveis.", ref_table: "product_variants", ref_id: variantId["ps5-pt"] },
  { kind: "pagamento_expirado", title: "Pagamento expirado no pedido DB-1006", ref_table: "orders", ref_id: uid("order", 6), is_read: true },
  { kind: "usado_novo", title: "Nova solicitação de usado US-0084", ref_table: "used_requests", ref_id: uid("used", 84) },
]);
ins("audit_log", [
  { actor_id: uid("user", S.editor.n), action: "update", entity: "banners", entity_id: uid("banner", 4), changes: { cta_label: ["Ver ofertas", "Ver promoções"] }, created_at: ago("2 days") },
  { actor_id: uid("user", S.manager.n), action: "update", entity: "products", entity_id: pid(prodByKey.ps5), changes: { price: [4099, 3899] }, created_at: ago("5 days") },
  { actor_id: uid("user", S.stock.n), action: "adjust", entity: "inventory_levels", entity_id: variantId["swlite"], changes: { on_hand: [6, 7] }, created_at: ago("2 days") },
  { actor_id: uid("user", S.owner.n), action: "grant_role", entity: "user_roles", entity_id: uid("user", S.appraiser.n), changes: { role: "appraiser" }, created_at: ago("30 days") },
]);

const events = ["view_item_list", "view_item", "add_to_cart", "shipping_calculated", "whatsapp_click", "filter_applied"];
ins("analytics_events", Array.from({ length: 24 }, (_, i) => ({
  event: events[i % events.length], session_id: `sess-${(i % 6) + 1}`, props: { productSlug: products[i % 8].slug, ordem: i % 3 }, created_at: ago(`${i * 3} hours`),
})));

// ---------------------------------------------------------------- saída
const header = `-- =============================================================================
-- DADOS FICTÍCIOS PARA TESTES. GERADO por supabase/tools/build-seed.mjs. Não edite à mão.
-- Usuários de teste (${PASSWORD === DEFAULT_PASSWORD ? `senha padrão ${DEFAULT_PASSWORD}, SÓ para ambiente local` : "senha definida em SEED_PASSWORD"}):
${people.map((p) => `--   ${p.email.padEnd(40)} ${"role" in p ? p.role : "cliente"}`).join("\n")}
-- =============================================================================
`;
writeFileSync(out, `${header}${statements.join("\n")}\n`, "utf8");
console.log(`${process.env.SEED_PASSWORD ? "seed.local.sql" : "seed.sql"} gerado: ${statements.length} blocos, ${products.length} produtos, ${orderDefs.length} pedidos, ${people.length} usuários.`);
