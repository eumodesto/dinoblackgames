// Testes do checkout no banco: cotação, pedido de visitante e sincronização com o Mercado Pago.
// Roda depois da suíte principal (usa o estado em que ela deixou o banco).

const U = (n) => `00000001-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const DIEGO = U(14);

export async function run({ db, q, one, check, asUser }) {
  const svc = (fn) => asUser("service_role", null, fn);
  const rpc = async (sql, params) => svc(() => one(sql, params));
  const throws = async (fn) => {
    try {
      await fn();
      return null;
    } catch (e) {
      return e.message;
    }
  };
  const level = async (sku) => one("select il.on_hand, il.reserved from inventory_levels il join product_variants v on v.id = il.variant_id where v.sku = $1", [sku]);

  console.log("-- checkout: cotação");
  const quote = async (items, coupon = null, user = null, email = null) =>
    (await rpc("select checkout_quote($1::jsonb, $2, $3, $4) as r", [JSON.stringify(items), coupon, user, email])).r;

  const qMouse = await quote([{ slug: "mouse-gamer-8000-dpi", qty: 2 }]);
  check("cotação usa o preço do servidor (mouse com Flash Drop: R$ 152,10)", Number(qMouse.lines[0].unitPrice) === 152.1 && Number(qMouse.subtotal) === 304.2 && qMouse.allOk === true, JSON.stringify(qMouse.lines[0]));
  const qBad = await quote([
    { slug: "produto-que-nao-existe", qty: 1 },
    { slug: "fone-gamer-sem-fio-rascunho", qty: 1 },
    { slug: "nintendo-switch-oled", color: "Verde", qty: 1 },
    { slug: "playstation-5-slim-1tb", color: "Preto", storage: "1 TB", qty: 1 },
    { slug: "playstation-5-pro-2tb", qty: 1 },
    { slug: "headset-gamer-7-1", qty: 50 },
  ]);
  const reasons = qBad.lines.map((l) => l.reason);
  check("cotação recusa produto inexistente, rascunho, variação inexistente, sem saldo, pré-venda e excesso", qBad.allOk === false && reasons[0] === "Produto indisponível" && reasons[1] === "Produto indisponível" && reasons[2] === "Variação indisponível" && reasons[3] === "Sem estoque" && /Pré-venda/.test(reasons[4]) && /Estoque insuficiente/.test(reasons[5]), JSON.stringify(reasons));
  const qUnit = await quote([{ slug: "dualsense-branco", qty: 3 }]);
  check("seminovo de unidade única: quantidade vira 1 e a unidade é escolhida", qUnit.lines[0].qty === 1 && qUnit.lines[0].unitId !== null && qUnit.lines[0].unique === true);
  check("variação por opção: Switch OLED Neon resolve para o SKU certo", (await quote([{ slug: "nintendo-switch-oled", color: "Neon azul e vermelho", qty: 1 }])).lines[0].sku === "DB-SWO-02-NE");

  const qCoupon = await quote([{ slug: "mouse-gamer-8000-dpi", qty: 2 }], "dino10", null, "novo.cliente@teste.dinoblack.example");
  check("cupom DINO10 (minúsculas) dá 10% ao cliente novo", qCoupon.coupon.ok === true && Number(qCoupon.discount) === 30.42, JSON.stringify(qCoupon.coupon));
  check("cupom já usado pelo cliente é recusado com mensagem", (await quote([{ slug: "mouse-gamer-8000-dpi", qty: 2 }], "DINO10", DIEGO)).coupon.message === "Cupom já utilizado");
  check("cupom com valor mínimo explica o motivo", /abaixo do mínimo/.test((await quote([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], "BEMVINDO50")).coupon.message));
  check("cupom esgotado e expirado são recusados", (await quote([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], "LIMITE1")).coupon.ok === false && (await quote([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], "EXPIRADO")).coupon.ok === false);

  console.log("-- checkout: pedido de visitante");
  const addr = { recipient: "Visitante Teste", phone: "(61) 90000-0099", cep: "72510000", street: "Quadra 101", number: "10", district: "Santa Maria", city: "Brasília", state: "DF" };
  const customer = { name: "Visitante Teste", email: "Novo.Cliente@teste.dinoblack.example", phone: "(61) 90000-0099" };
  const create = (items, coupon, terms = true, cust = customer) =>
    rpc("select create_checkout_order($1::jsonb, $2::jsonb, $3::jsonb, 'Retirada na loja', 0, 0, $4, $5, null) as r", [JSON.stringify(items), JSON.stringify(cust), JSON.stringify(addr), coupon, terms]);

  const mouseBefore = await level("DB-MS-13-U");
  const order = (await create([{ slug: "mouse-gamer-8000-dpi", qty: 2 }], "DINO10")).r;
  const row = await one("select * from orders where id = $1", [order.id]);
  check("pedido de visitante: sem usuário, e-mail em minúsculas, token de acesso", row.user_id === null && row.guest_email === "novo.cliente@teste.dinoblack.example" && row.customer_name === "Visitante Teste" && /^[0-9a-f-]{36}$/.test(String(row.public_token)));
  check("totais do servidor: subtotal 304,20, desconto 30,42, total 273,78", Number(row.subtotal) === 304.2 && Number(row.discount_total) === 30.42 && Number(row.total) === 273.78);
  check("termos aceitos ficam registrados", row.terms_accepted_at !== null);
  const mouseAfter = await level("DB-MS-13-U");
  check("pedido reserva as 2 unidades sem baixar o saldo", mouseAfter.reserved === mouseBefore.reserved + 2 && mouseAfter.on_hand === mouseBefore.on_hand);
  check("o item guarda o retrato (nome, SKU, imagem, preço)", (await one("select snapshot->>'sku' as sku, unit_price from order_items where order_id = $1", [order.id])).sku === "DB-MS-13-U");
  check("não existe pagamento até o cliente escolher como pagar", Number((await one("select count(*)::int as n from payments where order_id = $1", [order.id])).n) === 0);
  check("sem aceitar os termos o pedido é recusado", /termos/.test(await throws(() => create([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], null, false))));
  check("o mesmo e-mail não reutiliza o cupom", /já utilizado/.test(await throws(() => create([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], "DINO10"))));
  check("item indisponível derruba o pedido inteiro, sem sobras", /Sem estoque/.test(await throws(() => create([{ slug: "playstation-5-slim-1tb", color: "Preto", storage: "1 TB", qty: 1 }], null))) && Number((await one("select count(*)::int as n from orders where guest_email = 'novo.cliente@teste.dinoblack.example'")).n) === 1);

  console.log("-- checkout: Mercado Pago (sincronização)");
  const sync = async (number, payment) => (await rpc("select sync_mp_payment($1, $2::jsonb) as r", [number, JSON.stringify(payment)])).r;
  const ordStatus = async (id) => (await one("select status from orders where id = $1", [id])).status;
  const payRows = async (id) => q("select method, status, provider_ref, status_detail, provider_data from payments where order_id = $1 order by created_at", [id]);

  const pix = { id: "9001", status: "pending", status_detail: "pending_waiting_transfer", payment_method_id: "pix", payment_type_id: "bank_transfer", transaction_amount: 273.78, qr_code: "00020126PIX-COPIA-E-COLA", qr_code_base64: "iVBORw0KGgo=", date_of_expiration: new Date(Date.now() + 30 * 60e3).toISOString() };
  const r1 = await sync(order.number, pix);
  const p1 = await payRows(order.id);
  check("Pix pendente cria o pagamento com QR e validade; pedido segue aguardando", r1.paymentStatus === "pending" && p1.length === 1 && p1[0].method === "pix" && p1[0].provider_data.qrCode === "00020126PIX-COPIA-E-COLA" && (await ordStatus(order.id)) === "pending_payment");
  check("notificação repetida não duplica nada", (await sync(order.number, pix)).duplicate === true && (await payRows(order.id)).length === 1);

  const stockBeforePaid = await level("DB-MS-13-U");
  const r2 = await sync(order.number, { ...pix, status: "approved", status_detail: "accredited" });
  check("Pix aprovado paga o pedido e baixa o estoque", r2.orderStatus === "paid" && (await ordStatus(order.id)) === "paid" && (await level("DB-MS-13-U")).on_hand === stockBeforePaid.on_hand - 2 && (await level("DB-MS-13-U")).reserved === stockBeforePaid.reserved - 2);
  const p2 = await payRows(order.id);
  check("continua uma única linha de pagamento, agora paga, e o envio foi criado", p2.length === 1 && p2[0].status === "paid" && Number((await one("select count(*)::int as n from shipments where order_id = $1", [order.id])).n) === 1);
  check("aprovação repetida e notificação fora de ordem não desfazem o pagamento", (await sync(order.number, { ...pix, status: "approved", status_detail: "accredited" })).duplicate === true && (await sync(order.number, { ...pix, status: "pending" })).duplicate === true && (await payRows(order.id))[0].status === "paid");
  check("evento do Mercado Pago fica registrado como processado", Number((await one("select count(*)::int as n from integration_events where provider = 'mercadopago' and status = 'processed' and external_id like '9001:%'")).n) === 2);

  const refund = await sync(order.number, { ...pix, status: "refunded", status_detail: "refunded" });
  check("estorno marca o pagamento e avisa a equipe", refund.paymentStatus === "refunded" && (await payRows(order.id))[0].status === "refunded" && Number((await one("select count(*)::int as n from admin_notifications where kind = 'pagamento_estornado'")).n) === 1);

  // valor divergente
  const o2 = (await create([{ slug: "ssd-nvme-1tb", qty: 1 }], null, true, { ...customer, email: "outro@teste.dinoblack.example" })).r;
  const mismatch = await sync(o2.number, { id: "9002", status: "approved", status_detail: "accredited", payment_method_id: "visa", payment_type_id: "credit_card", transaction_amount: Number(o2.total) - 100, installments: 1 });
  check("pagamento com valor diferente NÃO libera o pedido e gera alerta", mismatch.error === "amount_mismatch" && (await ordStatus(o2.id)) === "pending_payment" && Number((await one("select count(*)::int as n from admin_notifications where kind = 'pagamento_divergente'")).n) === 1);

  // cartão recusado e nova tentativa
  const rej = await sync(o2.number, { id: "9003", status: "rejected", status_detail: "cc_rejected_insufficient_amount", payment_method_id: "visa", payment_type_id: "credit_card", transaction_amount: Number(o2.total), installments: 1 });
  check("cartão recusado: pagamento falha e o pedido segue pendente para nova tentativa", rej.paymentStatus === "failed" && (await ordStatus(o2.id)) === "pending_payment");
  const ok2 = await sync(o2.number, { id: "9004", status: "approved", status_detail: "accredited", payment_method_id: "master", payment_type_id: "credit_card", transaction_amount: Number(o2.total), installments: 3 });
  const p3 = await payRows(o2.id);
  check("nova tentativa aprovada paga o pedido; a recusada continua registrada", ok2.orderStatus === "paid" && p3.some((p) => p.provider_ref === "9003" && p.status === "failed") && p3.some((p) => p.provider_ref === "9004" && p.status === "paid"));

  // pagamento depois de cancelado
  const o3 = (await create([{ slug: "mouse-gamer-8000-dpi", qty: 1 }], null, true, { ...customer, email: "tardio@teste.dinoblack.example" })).r;
  await rpc("select cancel_order($1, 'Expirado no teste')", [o3.id]);
  const late = await sync(o3.number, { id: "9005", status: "approved", status_detail: "accredited", payment_method_id: "pix", payment_type_id: "bank_transfer", transaction_amount: Number(o3.total) });
  check("Pix pago depois do prazo: pedido segue cancelado e a equipe é avisada", (await ordStatus(o3.id)) === "cancelled" && Number((await one("select count(*)::int as n from admin_notifications where kind = 'pagamento_pedido_cancelado'")).n) === 1 && late.orderStatus === "cancelled");

  // boleto
  const o4 = (await create([{ slug: "ssd-nvme-1tb", qty: 1 }], null, true, { ...customer, email: "boleto@teste.dinoblack.example" })).r;
  await sync(o4.number, { id: "9006", status: "pending", status_detail: "pending_waiting_payment", payment_method_id: "bolbradesco", payment_type_id: "ticket", transaction_amount: Number(o4.total), ticket_url: "https://exemplo.test/boleto/9006", barcode: "34191790010104351004791020150008291070026000" });
  const pb = (await payRows(o4.id))[0];
  check("boleto pendente guarda o link e o código de barras", pb.method === "boleto" && pb.provider_data.ticketUrl === "https://exemplo.test/boleto/9006" && pb.provider_data.barcode.startsWith("3419"));
  check("pedido inexistente é recusado", /inexistente/.test(await throws(() => sync("DB-9999999", pix))));
  check("o visitante não executa funções do servidor", /permission denied|permissão/i.test(await throws(() => asUser("anon", null, () => db.query("select checkout_quote('[]'::jsonb)")))));
}
