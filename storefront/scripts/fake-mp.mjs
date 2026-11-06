// Mercado Pago FALSO para testar o caminho "live" do checkout sem tocar na API real e sem cobrar nada.
// Uso: node scripts/fake-mp.mjs [porta]   (padrão 4010)
// Aceita Authorization: Bearer fake-token. Controle: POST /__control/approve/:id, POST /__control/set/:id, GET /__control/requests
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 4010);
const TOKEN = "fake-token";
const payments = new Map();
const requests = [];
let seq = 7_000_000_000;

const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const path = url.pathname;

  if (path.startsWith("/__control/")) {
    if (path === "/__control/requests") return send(res, 200, requests);
    const m = path.match(/^\/__control\/(approve|set)\/(\d+)$/);
    const p = m && payments.get(m[2]);
    if (!p) return send(res, 404, { message: "pagamento não encontrado" });
    const body = await readBody(req);
    if (m[1] === "approve") {
      p.status = "approved";
      p.status_detail = "accredited";
    } else {
      Object.assign(p, body);
    }
    return send(res, 200, p);
  }

  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { message: "invalid access token" });

  if (req.method === "GET" && path === "/users/me") return send(res, 200, { site_id: "MLB", id: 1 });

  if (req.method === "POST" && path === "/v1/payments") {
    const body = await readBody(req);
    requests.push({ idempotencyKey: req.headers["x-idempotency-key"], body });
    const method = body.payment_method_id;
    const isPix = method === "pix";
    const id = String(++seq);
    const base = {
      id,
      payment_method_id: method,
      payment_type_id: isPix ? "bank_transfer" : "credit_card",
      transaction_amount: body.transaction_amount,
      installments: body.installments ?? 1,
      external_reference: body.external_reference,
      date_of_expiration: body.date_of_expiration ?? null,
    };
    let extra;
    if (isPix) {
      extra = {
        status: "pending",
        status_detail: "pending_waiting_transfer",
        point_of_interaction: { transaction_data: { qr_code: `00020126FAKEPIX${id}`, qr_code_base64: "iVBORw0KGgo=" } },
      };
    } else if (body.token === "tok_rejected") {
      extra = { status: "rejected", status_detail: "cc_rejected_insufficient_amount" };
    } else if (body.token === "tok_review") {
      extra = { status: "in_process", status_detail: "pending_review_manual" };
    } else if (body.token === "tok_wrong_amount") {
      extra = { status: "approved", status_detail: "accredited", transaction_amount: Number(body.transaction_amount) - 50 };
    } else {
      extra = { status: "approved", status_detail: "accredited" };
    }
    const p = { ...base, ...extra };
    payments.set(id, p);
    return send(res, 201, p);
  }

  const get = path.match(/^\/v1\/payments\/(\d+)$/);
  if (req.method === "GET" && get) {
    const p = payments.get(get[1]);
    return p ? send(res, 200, p) : send(res, 404, { message: "Payment not found" });
  }
  send(res, 404, { message: "rota não encontrada" });
}).listen(port, () => console.log(`fake-mp ouvindo em http://localhost:${port}`));
