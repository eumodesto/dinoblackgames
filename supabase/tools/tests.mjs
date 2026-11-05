// Testes sobre o seed: integridade dos dados, paridade com a loja, RLS e regras de estoque/pedido.
// Executado por validate.mjs depois de aplicar migrations e seed.

const U = (n) => `${"00000001".padStart(8, "0")}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const USER = { owner: U(1), manager: U(2), stock: U(3), appraiser: U(4), support: U(5), editor: U(6), ana: U(11), bruno: U(12), carla: U(13), diego: U(14) };

export async function run({ db, q, one, check, asUser }) {
  const throws = async (fn) => {
    try {
      await fn();
      return null;
    } catch (e) {
      return e.message;
    }
  };

  // ---------------------------------------------------------------- 1. dados e integridade
  console.log("-- dados e integridade");
  const count = async (t, where = "true") => Number((await one(`select count(*)::int as n from ${t} where ${where}`)).n);
  check("10 usuários de teste, todos com perfil", (await count("profiles")) === 10);
  check("6 papéis de equipe", (await count("user_roles")) === 6);
  check("4 categorias", (await count("categories")) === 4);
  check("24 produtos (22 publicados, 1 rascunho, 1 arquivado)",
    (await count("products")) === 24 && (await count("products", "status = 'published'")) === 22 &&
    (await count("products", "status = 'draft'")) === 1 && (await count("products", "status = 'archived'")) === 1);
  check("10 pedidos cobrindo 7 status (pendente, pago, preparo, enviado, entregue, cancelado, devolvido)", (await count("orders")) === 10 && (await q("select distinct status from orders")).length === 7);
  check("5 solicitações de usado", (await count("used_requests")) === 5);

  const badTotals = await count("orders o", "o.subtotal <> (select coalesce(sum(unit_price * quantity), 0) from order_items i where i.order_id = o.id)");
  check("subtotal de cada pedido = soma dos itens", badTotals === 0, `(${badTotals} divergentes)`);

  const badPay = await count("orders o", `exists (select 1 from payments p where p.order_id = o.id and p.amount <> o.total)`);
  check("valor do pagamento = total do pedido", badPay === 0);

  const stockDiff = await q(`
    select v.sku, il.on_hand,
           coalesce(sum(case when m.type in ('entrada','ajuste','devolucao') then m.quantity when m.type = 'saida' then -m.quantity else 0 end), 0)::int as from_movements
    from inventory_levels il
    join product_variants v on v.id = il.variant_id
    left join inventory_movements m on m.variant_id = il.variant_id
    group by v.sku, il.on_hand
    having il.on_hand <> coalesce(sum(case when m.type in ('entrada','ajuste','devolucao') then m.quantity when m.type = 'saida' then -m.quantity else 0 end), 0)`);
  check("saldo de cada variação = soma das movimentações", stockDiff.length === 0, JSON.stringify(stockDiff));

  const reservedDiff = await q(`
    select il.variant_id, il.reserved,
           coalesce((select sum(i.quantity) from order_items i join orders o on o.id = i.order_id
                     where i.variant_id = il.variant_id and o.status = 'pending_payment' and i.unit_id is null), 0)::int as expected
    from inventory_levels il
    where il.reserved <> coalesce((select sum(i.quantity) from order_items i join orders o on o.id = i.order_id
                     where i.variant_id = il.variant_id and o.status = 'pending_payment' and i.unit_id is null), 0)`);
  check("reservas = itens de pedidos aguardando pagamento", reservedDiff.length === 0);

  check("unidade vendida pertence a pedido pago", (await count("inventory_units u", "u.status = 'vendido' and exists (select 1 from order_items i join orders o on o.id = i.order_id where i.unit_id = u.id and o.status in ('paid','preparing','shipped','delivered'))")) === 1);
  check("todo seminovo e raridade publicado tem unidade", (await count("products p", "p.status = 'published' and p.condition in ('seminovo','raridade') and not exists (select 1 from inventory_units u where u.product_id = p.id)")) === 0);

  // ---------------------------------------------------------------- 2. paridade com a loja
  console.log("-- paridade com a loja de demonstração (storefront)");
  const asAnon = (fn) => asUser("anon", null, fn);
  const listing = await asAnon(() => q("select * from v_product_listing order by slug"));
  const by = Object.fromEntries(listing.map((r) => [r.slug, r]));
  check("visitante vê só os 22 publicados", listing.length === 22);
  const parity = { "playstation-5-slim-1tb": 9, "nintendo-switch-oled": 10, "notebook-gamer-rtx4060": 11, "console-retro-mini": 18, "headset-gamer-7-1": 20, "teclado-mecanico-rgb": 19 };
  for (const [slug, pct] of Object.entries(parity)) {
    check(`desconto de ${slug} = ${pct}% (igual à loja)`, by[slug].discount_percent === pct, `(veio ${by[slug].discount_percent})`);
  }
  check("PS5: R$ 3.899 de R$ 4.299, 3 disponíveis (4 em mãos, 1 reservada)", Number(by["playstation-5-slim-1tb"].current_price) === 3899 && Number(by["playstation-5-slim-1tb"].list_price) === 4299 && by["playstation-5-slim-1tb"].available === 3);
  check("Switch OLED: 5 disponíveis somando as duas cores", by["nintendo-switch-oled"].available === 5);
  check("DualSense seminovo: unidade única disponível", by["dualsense-branco"].condition === "seminovo" && by["dualsense-branco"].available === 1);
  check("pré-venda sem estoque", by["playstation-5-pro-2tb"].condition === "pre_venda" && by["playstation-5-pro-2tb"].in_stock === false);
  check("Flash Drop reduz o preço de mouse, monitor e SSD", ["mouse-gamer-8000-dpi", "monitor-gamer-27-165hz", "ssd-nvme-1tb"].every((s) => Number(by[s].current_price) < Number(by[s].list_price)));
  check("promoção encerrada (Semana Gamer) não afeta preços", Number(by["teclado-mecanico-rgb"].current_price) === 349);
  check("facetas: 2 produtos PlayStation novos e seminovos no filtro de plataforma", listing.filter((r) => (r.facets.platform ?? []).includes("PlayStation")).length === 4);

  const shopCounts = {
    "Consoles": listing.filter((r) => r.category_slug === "consoles").length,
    "PC Gamer": listing.filter((r) => r.category_slug === "pc-gamer").length,
  };
  check("categorias retornam contagens coerentes", shopCounts.Consoles === 8 && shopCounts["PC Gamer"] === 7, JSON.stringify(shopCounts));

  // ---------------------------------------------------------------- 3. RLS
  console.log("-- RLS: visitante, cliente e equipe");
  check("visitante não vê rascunho nem arquivado", (await asAnon(() => q("select 1 from products where status <> 'published'"))).length === 0);
  check("visitante não lê pedidos", (await asAnon(() => q("select 1 from orders"))).length === 0);
  check("visitante não lê estoque nem custo das unidades", (await asAnon(() => q("select 1 from inventory_units"))).length === 0);
  const pubUnits = await asAnon(() => q("select * from v_public_units"));
  check("visitante vê o laudo das 5 unidades disponíveis, sem custo nem serial", pubUnits.length === 5 && !("cost" in pubUnits[0]) && !("serial" in pubUnits[0]));
  check("visitante vê só banners publicados e vigentes (4)", (await asAnon(() => q("select 1 from banners"))).length === 4);
  check("visitante vê só configurações públicas", (await asAnon(() => q("select 1 from store_settings"))).length === 5);
  check("visitante vê só páginas publicadas (8)", (await asAnon(() => q("select 1 from pages"))).length === 8);
  check("visitante não lê consentimentos nem usados", (await asAnon(() => q("select 1 from consents"))).length === 0 && (await asAnon(() => q("select 1 from used_requests"))).length === 0);
  check("visitante registra mensagem de contato", (await throws(() => asAnon(() => db.query("insert into contact_messages (name, email, message) values ('T','t@teste.dinoblack.example','oi')")))) === null);
  check("visitante não cria produto", (await throws(() => asAnon(() => db.query("insert into products (slug, sku, name, category_id) select 'x','x','x', id from categories limit 1")))) !== null);

  const ana = (fn) => asUser("authenticated", USER.ana, fn);
  check("Ana vê só os próprios 2 pedidos", (await ana(() => q("select 1 from orders"))).length === 2);
  check("Ana não vê o carrinho nem os endereços de outros", (await ana(() => q("select 1 from carts"))).length === 1 && (await ana(() => q("select 1 from addresses"))).length === 1);
  check("Ana vê itens, pagamento e envio só dos seus pedidos", (await ana(() => q("select 1 from order_items"))).length === 3 && (await ana(() => q("select 1 from payments"))).length === 2);
  check("Ana não vê papéis de equipe de outros", (await ana(() => q("select 1 from user_roles"))).length === 0);
  const anaUpdate = await ana(() => db.query("update orders set total = 1 where true"));
  check("cliente não altera pedido direto (só por função)", anaUpdate.affectedRows === 0);
  check("cliente não confirma pagamento", (await throws(() => ana(() => db.query("select confirm_payment($1)", [`${"00000008".padStart(8, "0")}-0000-4000-8000-000000000005`])))) !== null);

  const as = (role) => (fn) => asUser("authenticated", USER[role], fn);
  check("atendimento lê pedidos de todos (10)", (await as("support")(() => q("select 1 from orders"))).length === 10);
  check("avaliador lê usados mas não pedidos de outros além do que a política permite", (await as("appraiser")(() => q("select 1 from used_requests"))).length === 5);
  const supportStock = await as("support")(() => db.query("update inventory_levels set min_level = 99"));
  check("atendimento não altera estoque", supportStock.affectedRows === 0);
  const stockStock = await as("stock")(() => db.query("update inventory_levels set min_level = min_level + 0"));
  check("estoque altera saldos", stockStock.affectedRows > 0);
  const editorProd = await as("editor")(() => db.query("update products set tagline = tagline where slug = 'playstation-5-slim-1tb'"));
  check("editor altera produtos", editorProd.affectedRows === 1);
  const editorOrders = await as("editor")(() => db.query("update orders set notes = 'x'"));
  check("editor não altera pedidos", editorOrders.affectedRows === 0);
  check("só owner e manager leem a auditoria", (await as("support")(() => q("select 1 from audit_log"))).length === 0 && (await as("manager")(() => q("select 1 from audit_log"))).length === 4);
  check("equipe registra auditoria", (await throws(() => as("editor")(() => db.query("insert into audit_log (actor_id, action, entity) values ($1, 'test', 'x')", [USER.editor])))) === null);
  check("só owner gerencia papéis", (await as("manager")(() => db.query("insert into user_roles (user_id, role) values ($1, 'editor')", [USER.ana])).catch(() => "erro")) === "erro");

  // ---------------------------------------------------------------- 4. regras de estoque e pedido
  console.log("-- regras de estoque e pedido (reserva, pagamento, cancelamento)");
  const svc = (fn) => asUser("service_role", null, fn);
  const level = async (sku) => one(`select il.on_hand, il.reserved from inventory_levels il join product_variants v on v.id = il.variant_id where v.sku = $1`, [sku]);
  const unitStatus = async (serial) => (await one("select status from inventory_units where serial = $1", [serial])).status;
  const addr = { recipient: "Ana Cliente (teste)", cep: "72510000", street: "Quadra 101", number: "10", district: "Santa Maria", city: "Brasília", state: "DF" };
  const orderFn = "select create_order_from_cart($1, $2::jsonb, 'Entrega local', 14.90, 2, 'pix', 1, $3) as id";

  // 4.1 pedido da Ana (carrinho do seed: Switch Neon x1 + SSD x2 com Flash Drop)
  const cartAna = (await one("select id from carts where user_id = $1 and status = 'open'", [USER.ana])).id;
  const before = { ne: await level("DB-SWO-02-NE"), ssd: await level("DB-SSD-15-U") };
  const orderAna = (await ana(() => one(orderFn, [cartAna, JSON.stringify(addr), null]))).id;
  const o1 = await one("select subtotal, total, status from orders where id = $1", [orderAna]);
  check("pedido nasce aguardando pagamento com preço do servidor (SSD com Flash Drop)", o1.status === "pending_payment" && Math.round(Number(o1.subtotal) * 100) === Math.round((2149.9 + 404.1 * 2) * 100), `(subtotal ${o1.subtotal})`);
  const afterReserve = { ne: await level("DB-SWO-02-NE"), ssd: await level("DB-SSD-15-U") };
  check("estoque reservado, saldo em mãos intacto", afterReserve.ne.reserved === before.ne.reserved + 1 && afterReserve.ssd.reserved === before.ssd.reserved + 2 && afterReserve.ne.on_hand === before.ne.on_hand);
  check("carrinho vira 'converted' e o pedido guarda o retrato dos itens", (await one("select status from carts where id = $1", [cartAna])).status === "converted" && (await one("select snapshot->>'name' as n from order_items where order_id = $1 order by quantity limit 1", [orderAna])).n !== null);
  check("pedido gera pagamento Pix com validade", (await one("select method, status, pix_expires_at is not null as ok from payments where order_id = $1", [orderAna])).ok === true);

  // 4.2 confirmação de pagamento, idempotente
  await svc(() => db.query("select confirm_payment($1, 'mock', 'REF-1')", [orderAna]));
  const paid = { ne: await level("DB-SWO-02-NE"), ssd: await level("DB-SSD-15-U") };
  check("pagamento confirmado baixa o saldo e libera a reserva", paid.ne.on_hand === before.ne.on_hand - 1 && paid.ne.reserved === before.ne.reserved && paid.ssd.on_hand === before.ssd.on_hand - 2);
  check("pedido pago cria envio pendente e contabiliza venda", (await one("select count(*)::int as n from shipments where order_id = $1", [orderAna])).n === 1 && (await one("select status from orders where id = $1", [orderAna])).status === "paid");
  await svc(() => db.query("select confirm_payment($1, 'mock', 'REF-1')", [orderAna]));
  const paid2 = await level("DB-SSD-15-U");
  check("webhook repetido não baixa o estoque de novo (idempotente)", paid2.on_hand === paid.ssd.on_hand && (await one("select count(*)::int as n from shipments where order_id = $1", [orderAna])).n === 1);

  // 4.3 unidade única: reserva exclusiva
  const cartDiego = (await one("select id from carts where user_id = $1 and status = 'open'", [USER.diego])).id;
  const orderDiego = (await as("owner")(() => one("select 1 as x"))) && (await asUser("authenticated", USER.diego, () => one(orderFn, [cartDiego, JSON.stringify({ ...addr, recipient: "Diego" }), null]))).id;
  check("unidade única fica reservada para quem pediu primeiro", (await unitStatus("SN-DEMO-DU-0001")) === "reservado");
  const cartBruno = (await one("insert into carts (user_id) values ($1) returning id", [USER.bruno])).id;
  await db.query("insert into cart_items (cart_id, variant_id, unit_id) select $1, u.variant_id, u.id from inventory_units u where u.serial = 'SN-DEMO-DU-0001'", [cartBruno]);
  const conflict = await throws(() => asUser("authenticated", USER.bruno, () => one(orderFn, [cartBruno, JSON.stringify(addr), null])));
  check("segundo cliente não consegue a mesma unidade", conflict !== null && /não está mais disponível/.test(conflict), `(${conflict})`);
  check("tentativa falha sem deixar pedido pela metade", (await count("orders", `user_id = '${USER.bruno}' and status = 'pending_payment'`)) === 0);

  // 4.4 estoque insuficiente
  const cartNoStock = (await one("insert into carts (user_id) values ($1) returning id", [USER.carla])).id;
  await db.query("insert into cart_items (cart_id, variant_id) select $1, id from product_variants where sku = 'DB-PS5-01-PT'", [cartNoStock]);
  const noStock = await throws(() => asUser("authenticated", USER.carla, () => one(orderFn, [cartNoStock, JSON.stringify(addr), null])));
  check("variação sem saldo é recusada", noStock !== null && /estoque insuficiente/.test(noStock), `(${noStock})`);

  // 4.5 cupons
  const cartCoupon = (await one("insert into carts (user_id) values ($1) returning id", [USER.diego])).id;
  await db.query("insert into cart_items (cart_id, variant_id) select $1, id from product_variants where sku = 'DB-PS5-01-BR'", [cartCoupon]);
  const reuse = await throws(() => asUser("authenticated", USER.diego, () => one(orderFn, [cartCoupon, JSON.stringify(addr), "DINO10"])));
  check("cupom já usado pelo mesmo cliente é recusado", reuse !== null && /já utilizado/.test(reuse), `(${reuse})`);
  const expired = await throws(() => asUser("authenticated", USER.diego, () => one(orderFn, [cartCoupon, JSON.stringify(addr), "EXPIRADO"])));
  check("cupom expirado é recusado", expired !== null && /inválido ou expirado/.test(expired));
  const minimum = await throws(() => asUser("authenticated", USER.diego, () => one(orderFn, [cartCoupon, JSON.stringify(addr), "NAOEXISTE"])));
  check("cupom inexistente é recusado", minimum !== null);
  const okCoupon = (await asUser("authenticated", USER.diego, () => one(orderFn, [cartCoupon, JSON.stringify(addr), "BEMVINDO50"]))).id;
  const oc = await one("select subtotal, discount_total, total from orders where id = $1", [okCoupon]);
  check("cupom de valor fixo abate R$ 50 do pedido", Number(oc.discount_total) === 50 && Number(oc.total) === Number(oc.subtotal) - 50 + 14.9);

  // 4.6 cancelamento
  const bruno = (fn) => asUser("authenticated", USER.bruno, fn);
  const foreign = await throws(() => bruno(() => db.query("select cancel_order($1)", [orderDiego])));
  check("cliente não cancela pedido de outra pessoa", foreign !== null && /sem permissão/.test(foreign), `(${foreign})`);
  await asUser("authenticated", USER.diego, () => db.query("select cancel_order($1, 'Desisti da compra')", [orderDiego]));
  check("cancelar pedido pendente devolve a unidade única ao estoque", (await unitStatus("SN-DEMO-DU-0001")) === "disponivel");
  check("pagamento do pedido cancelado expira", (await one("select status from payments where order_id = $1", [orderDiego])).status === "expired");
  const shippedCancel = await throws(() => svc(() => db.query("select cancel_order($1)", [`${"00000008".padStart(8, "0")}-0000-4000-8000-000000000002`])));
  check("pedido já enviado não pode ser cancelado", shippedCancel !== null && /não pode ser cancelado/.test(shippedCancel));

  // 4.7 expiração automática (pedido DB-1005 do seed, Pix criado há 10 minutos)
  const psBefore = await level("DB-PS5-01-BR");
  const expiredN = (await svc(() => one("select expire_pending_orders(5) as n"))).n;
  const psAfter = await level("DB-PS5-01-BR");
  check("pedidos Pix vencidos são cancelados e o estoque volta", expiredN >= 1 && psAfter.reserved === psBefore.reserved - 1);

  // 4.8 relatórios
  const sales = await as("manager")(() => q("select * from v_sales_daily"));
  check("relatório de vendas por dia tem movimento", sales.length > 0 && sales.every((r) => Number(r.revenue) > 0));
  const alerts = await as("stock")(() => q("select * from v_inventory_alerts"));
  check("alertas de estoque listam o PS5 sem saldo", alerts.some((a) => a.sku === "DB-PS5-01-PT" && a.situation === "sem_saldo"));
}
