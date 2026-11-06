// Teste ponta a ponta do checkout contra um servidor rodando (banco local + Mercado Pago simulado ou falso).
// Uso:
//   node scripts/checkout-e2e.mjs simulated http://localhost:3110
//   node scripts/checkout-e2e.mjs live http://localhost:3120 http://localhost:4010   (servidor com MP_MODE=live apontando para o fake)
import { createHmac } from "node:crypto";

const [mode = "simulated", base = "http://localhost:3110", fakeMp = "http://localhost:4010"] = process.argv.slice(2);
let passed = 0;
let failed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL ${name} ${detail}`);
  }
};

const call = async (method, path, body) => {
  const res = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};

const customer = (n) => ({ name: "Cliente Teste E2E", email: `e2e${n}@teste.dinoblack.example`, phone: "(61) 90000-0000" });
const address = { recipient: "Cliente Teste E2E", phone: "61900000000", cep: "72510000", street: "Quadra 101", number: "10", district: "Santa Maria", city: "Brasília", state: "DF" };
const orderBody = (items, n, extra = {}) => ({ items, customer: customer(n), address, shippingId: "retirada", acceptTerms: true, ...extra });
const card = (token = "tok_ok", installments = 1) => ({ payment_method_id: "visa", token, installments, issuer_id: 25, payer: { email: "x@y.z" } });
const pix = { payment_method_id: "pix", payer: { email: "x@y.z", identification: { type: "CPF", number: "12345678909" } } };
const status = async (o) => (await call("GET", `/api/checkout/order/${o.number}?t=${o.token}`)).data.order;
const available = async (slug, extra = {}) => (await call("POST", "/api/checkout/quote", { items: [{ slug, qty: 1, ...extra }] })).data.lines[0].available;

console.log(`\n== Checkout E2E (${mode}) em ${base} ==`);

// ------------------------------------------------------------------ configuração e cotação
console.log("-- configuração e cotação");
const cfg = (await call("GET", "/api/checkout/config")).data;
check("config pronta e só com campos públicos (sem segredos)", cfg.ready === true && cfg.mode === mode && Object.keys(cfg).sort().join() === "db,maxInstallments,mode,payments,publicKey,ready", JSON.stringify(Object.keys(cfg)));
const q = (await call("POST", "/api/checkout/quote", { items: [{ slug: "mouse-gamer-8000-dpi", qty: 2 }, { slug: "nintendo-switch-oled", color: "Branco", qty: 1 }], cep: "01310100" })).data;
check("cotação traz preço do banco, peso e frete por CEP", q.allOk === true && q.subtotal === 304.2 + 2149.9 && q.shipping.length === 2 && q.weightGrams === 2400, JSON.stringify(q).slice(0, 300));
const qDf = (await call("POST", "/api/checkout/quote", { items: [{ slug: "mouse-gamer-8000-dpi", qty: 1 }], cep: "72510000" })).data;
check("CEP do DF oferece retirada grátis na loja", qDf.shipping[0].id === "retirada" && qDf.shipping[0].price === 0);
check("cupom válido calcula desconto", (await call("POST", "/api/checkout/quote", { items: [{ slug: "mouse-gamer-8000-dpi", qty: 2 }], coupon: "dino10", email: "novo@teste.dinoblack.example" })).data.discount === 30.42);
check("carrinho vazio e item inválido são recusados", (await call("POST", "/api/checkout/quote", { items: [] })).status === 400 && (await call("POST", "/api/checkout/quote", { items: [{ slug: "x", qty: 0 }] })).status === 400);

// ------------------------------------------------------------------ pedido
console.log("-- pedido");
check("sem aceitar os termos não cria pedido", (await call("POST", "/api/checkout/order", orderBody([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], 1, { acceptTerms: false }))).status === 400);
check("e-mail inválido é recusado", (await call("POST", "/api/checkout/order", { ...orderBody([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], 1), customer: { ...customer(1), email: "invalido" } })).status === 400);
check("CEP inválido é recusado", (await call("POST", "/api/checkout/order", { ...orderBody([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], 1), address: { ...address, cep: "123" } })).status === 400);
check("forma de entrega inexistente é recusada", (await call("POST", "/api/checkout/order", orderBody([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], 1, { shippingId: "teletransporte" }))).status === 400);
const noStock = await call("POST", "/api/checkout/order", orderBody([{ slug: "headset-gamer-7-1", qty: 20 }], 1));
check("estoque insuficiente derruba o pedido com mensagem clara", noStock.status === 409 && /Estoque insuficiente/.test(noStock.data.error ?? ""), JSON.stringify(noStock.data));
const preto = await call("POST", "/api/checkout/order", orderBody([{ slug: "playstation-5-slim-1tb", color: "Preto", storage: "1 TB", qty: 1 }], 1));
check("variação esgotada é recusada", preto.status === 409 && /Sem estoque/.test(preto.data.error ?? ""));

const mouseBefore = await available("mouse-gamer-8000-dpi");
const created = await call("POST", "/api/checkout/order", orderBody([{ slug: "mouse-gamer-8000-dpi", qty: 2 }], 2, { coupon: "DINO10", marketingOptIn: true }));
const ord = created.data;
check("pedido criado com número, token e totais do servidor", created.status === 201 && /^DB-\d+$/.test(ord.number) && ord.total === 273.78 && ord.discount === 30.42, JSON.stringify(ord));
check("itens ficam reservados", (await available("mouse-gamer-8000-dpi")) === mouseBefore - 2);
check("token errado não enxerga o pedido", (await call("GET", `/api/checkout/order/${ord.number}?t=00000000-0000-4000-8000-000000000000`)).status === 404 && (await call("GET", `/api/checkout/order/${ord.number}`)).status === 404);
const st0 = await status(ord);
check("status inicial: aguardando pagamento, com prazo e itens", st0.status === "pending_payment" && st0.expiresAt && st0.items.length === 1 && st0.payment === null);
check("mesmo e-mail não reutiliza o cupom", (await call("POST", "/api/checkout/order", orderBody([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], 2, { coupon: "DINO10" }))).status === 409);

// ------------------------------------------------------------------ pagamento
console.log("-- pagamento com cartão");
check("pagar sem dados de pagamento é recusado", (await call("POST", "/api/checkout/pay", { number: ord.number, token: ord.token })).status === 400);
check("cartão sem token é recusado", (await call("POST", "/api/checkout/pay", { number: ord.number, token: ord.token, formData: { payment_method_id: "visa" } })).status === 400);
check("pagar com token de outro pedido é recusado", (await call("POST", "/api/checkout/pay", { number: ord.number, token: "00000000-0000-4000-8000-000000000000", formData: card() })).status === 404);

if (mode === "live") {
  const rej = await call("POST", "/api/checkout/pay", { number: ord.number, token: ord.token, formData: card("tok_rejected") });
  check("cartão recusado: mensagem amigável e o pedido segue pendente", rej.status === 200 && rej.data.order.status === "pending_payment" && rej.data.order.payment.status === "failed" && /limite/.test(rej.data.message ?? ""), JSON.stringify(rej.data).slice(0, 300));
}
const paid = await call("POST", "/api/checkout/pay", { number: ord.number, token: ord.token, formData: { ...card("tok_ok", 3), transaction_amount: 1, amount: 1 } });
check("cartão aprovado paga o pedido (valor adulterado pelo cliente é ignorado)", paid.status === 200 && paid.data.order.status === "paid" && paid.data.order.payment.status === "paid" && paid.data.order.payment.installments === 3, JSON.stringify(paid.data).slice(0, 400));
check("pedido pago não aceita outro pagamento", (await call("POST", "/api/checkout/pay", { number: ord.number, token: ord.token, formData: card() })).status === 409);
check("pedido pago não pode ser cancelado pelo cliente", (await call("DELETE", `/api/checkout/order/${ord.number}?t=${ord.token}`)).status === 409);

// ------------------------------------------------------------------ pix
console.log("-- pagamento com Pix");
const ordPix = (await call("POST", "/api/checkout/order", orderBody([{ slug: "ssd-nvme-1tb", qty: 1 }], 3))).data;
check("Pix sem CPF/CNPJ é recusado", (await call("POST", "/api/checkout/pay", { number: ordPix.number, token: ordPix.token, formData: { payment_method_id: "pix", payer: { email: "x@y.z" } } })).status === 400);
check("boleto ainda não é oferecido", (await call("POST", "/api/checkout/pay", { number: ordPix.number, token: ordPix.token, formData: { payment_method_id: "bolbradesco", payer: { identification: { type: "CPF", number: "12345678909" } } } })).status === 400);
const pixRes = await call("POST", "/api/checkout/pay", { number: ordPix.number, token: ordPix.token, formData: pix });
check("Pix gera QR e copia e cola; pedido segue aguardando", pixRes.status === 200 && pixRes.data.order.status === "pending_payment" && pixRes.data.order.payment.method === "pix" && /^0002/.test(pixRes.data.order.payment.pix.qrCode), JSON.stringify(pixRes.data).slice(0, 300));
check("conferir o status repetidamente não muda nada enquanto não paga", (await status(ordPix)).status === "pending_payment");

if (mode === "simulated") {
  const sim = await call("POST", `/api/checkout/simulate/${ordPix.number}?t=${ordPix.token}`);
  check("simular o pagamento do Pix aprova o pedido (modo simulado)", sim.status === 200 && sim.data.order.status === "paid", JSON.stringify(sim.data).slice(0, 200));
}

// ------------------------------------------------------------------ cancelamento e unidade única
console.log("-- cancelamento e unidade única");
const ssdBefore = await available("ssd-nvme-1tb");
const ordCancel = (await call("POST", "/api/checkout/order", orderBody([{ slug: "ssd-nvme-1tb", qty: 2 }], 4))).data;
check("reserva antes de cancelar", (await available("ssd-nvme-1tb")) === ssdBefore - 2);
check("cliente cancela o pedido pendente (voltar para editar)", (await call("DELETE", `/api/checkout/order/${ordCancel.number}?t=${ordCancel.token}`)).status === 200 && (await status(ordCancel)).status === "cancelled");
check("o estoque volta depois do cancelamento", (await available("ssd-nvme-1tb")) === ssdBefore);

const u1 = await call("POST", "/api/checkout/order", orderBody([{ slug: "ps4-pro-placeholder", qty: 1 }], 5));
check("produto inexistente é recusado", u1.status === 409);
const unit1 = await call("POST", "/api/checkout/order", orderBody([{ slug: "dualsense-branco", qty: 1 }], 6));
const unit2 = await call("POST", "/api/checkout/order", orderBody([{ slug: "dualsense-branco", qty: 1 }], 7));
check("seminovo de unidade única: o primeiro leva, o segundo é avisado", unit1.status === 201 && unit2.status === 409 && /Unidade única/.test(unit2.data.error ?? ""), JSON.stringify(unit2.data));

// ------------------------------------------------------------------ webhook
console.log("-- webhook");
check("webhook ignora notificações que não são de pagamento", (await call("POST", "/api/webhooks/mercadopago", { type: "plan", data: { id: "1" } })).data.ignored === true);
check("webhook com id inválido não quebra", (await call("POST", "/api/webhooks/mercadopago", { type: "payment", data: { id: "abc" } })).data.handled === false);
check("cron de expiração exige segredo", (await call("GET", "/api/cron/expire-orders")).status === 401);

if (mode === "live") {
  console.log("-- Mercado Pago real (código live apontando para o fake)");
  const reqs = await (await fetch(`${fakeMp}/__control/requests`)).json();
  const lastCard = reqs.find((r) => r.body.token === "tok_ok");
  check("a criação do pagamento usa o valor do servidor, não o do navegador", lastCard && lastCard.body.transaction_amount === 273.78, JSON.stringify(lastCard?.body.transaction_amount));
  check("envia referência do pedido, descrição, descritor e itens", lastCard.body.external_reference === ord.number && /DinoBlack/.test(lastCard.body.description) && lastCard.body.statement_descriptor === "DINOBLACK" && lastCard.body.additional_info.items.length === 1);
  check("envia chave de idempotência por pedido e tentativa", /^DB-\d+-visa-\d+$/.test(lastCard.idempotencyKey ?? ""), String(lastCard.idempotencyKey));
  check("dados do pagador vêm do pedido (e-mail e nome), não do navegador", lastCard.body.payer.email === customer(2).email && lastCard.body.payer.first_name === "Cliente");
  check("não manda notification_url em http (só https público)", lastCard.body.notification_url === undefined);
  const pixReq = reqs.find((r) => r.body.payment_method_id === "pix");
  check("Pix leva CPF validado e prazo de 30 minutos", pixReq.body.payer.identification.number === "12345678909" && /\+00:00$/.test(pixReq.body.date_of_expiration));

  // webhook de verdade: o fake aprova o Pix e avisa; o servidor consulta a API e paga o pedido
  const pixId = pixRes.data.order.payment.pix.qrCode.replace("00020126FAKEPIX", "");
  await fetch(`${fakeMp}/__control/approve/${pixId}`, { method: "POST" });
  const wh = await call("POST", "/api/webhooks/mercadopago", { type: "payment", action: "payment.updated", data: { id: pixId } });
  check("webhook consulta o pagamento na API e paga o pedido", wh.data.handled === true && (await status(ordPix)).status === "paid", JSON.stringify(wh.data));
  const wh2 = await call("POST", "/api/webhooks/mercadopago", { type: "payment", data: { id: pixId } });
  check("webhook repetido é inofensivo", wh2.status === 200 && (await status(ordPix)).status === "paid");
  check("webhook de pagamento que não existe é ignorado", (await call("POST", "/api/webhooks/mercadopago", { type: "payment", data: { id: "999999999" } })).data.handled === false);

  // valor divergente
  const ordWrong = (await call("POST", "/api/checkout/order", orderBody([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], 8))).data;
  const wrong = await call("POST", "/api/checkout/pay", { number: ordWrong.number, token: ordWrong.token, formData: card("tok_wrong_amount") });
  check("pagamento aprovado com valor diferente NÃO libera o pedido", wrong.status === 200 && wrong.data.order.status === "pending_payment", JSON.stringify(wrong.data).slice(0, 200));

  // análise manual: fica pendente e o polling fecha depois
  const ordReview = (await call("POST", "/api/checkout/order", orderBody([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], 9))).data;
  const rev = await call("POST", "/api/checkout/pay", { number: ordReview.number, token: ordReview.token, formData: card("tok_review") });
  check("cartão em análise fica pendente", rev.data.order.status === "pending_payment" && rev.data.order.payment.status === "pending");
  const revId = reqs.length ? String((await (await fetch(`${fakeMp}/__control/requests`)).json()).length) : "";
  void revId;

  // webhook com assinatura (servidor iniciado com MP_WEBHOOK_SECRET=segredo-de-teste)
  const body = { type: "payment", data: { id: pixId } };
  const unsigned = await call("POST", "/api/webhooks/mercadopago", body);
  if (unsigned.status === 401) {
    const ts = String(Date.now());
    const sig = createHmac("sha256", "segredo-de-teste").update(`id:${pixId};request-id:req-1;ts:${ts};`).digest("hex");
    const ok = await fetch(`${base}/api/webhooks/mercadopago`, { method: "POST", headers: { "content-type": "application/json", "x-signature": `ts=${ts},v1=${sig}`, "x-request-id": "req-1" }, body: JSON.stringify(body) });
    const bad = await fetch(`${base}/api/webhooks/mercadopago`, { method: "POST", headers: { "content-type": "application/json", "x-signature": `ts=${ts},v1=${"0".repeat(64)}`, "x-request-id": "req-1" }, body: JSON.stringify(body) });
    check("webhook sem assinatura é recusado; com assinatura correta passa; com errada não", unsigned.status === 401 && ok.status === 200 && bad.status === 401);
  }
}

console.log(`\n${passed} verificações ok, ${failed} falhas`);
if (failed) {
  console.log("Falhas:", failures.join("; "));
  process.exit(1);
}
