/**
 * Templates de e-mail da loja (cliente, equipe e cadastro de usuários).
 * O texto é editável no admin; o cabeçalho, o rodapé e o bloco de produtos vêm do layout da marca (server/email-layout.ts).
 */
export type EmailAudience = "customer" | "admin" | "staff";

export type EmailTemplate = {
  name: string;
  subject: string;
  enabled: boolean;
  /** Título grande no topo da mensagem. */
  title: string;
  /** Texto em HTML simples (<p>, <strong>, <a>, <ul>). Aceita as variáveis {{...}}. */
  body: string;
  /** Botão da mensagem; sem texto, o botão não aparece. O link aceita variáveis. */
  buttonLabel: string;
  buttonUrl: string;
  /** Mostra a tabela com foto, nome, quantidade e preço dos produtos do pedido. */
  showItems: boolean;
  /** Só nos e-mails disparados por tempo (lembrete de pagamento pendente): minutos sem pagamento até o envio. */
  sendAfterMinutes?: number;
};

export type EmailTemplateMeta = { key: string; audience: EmailAudience; label: string; when: string; defaults: EmailTemplate; /** E-mail disparado por tempo: o editor mostra "Quando enviar". */ delayed?: boolean };

/** O pedido vence aos 30 minutos sem pagamento; o lembrete precisa sair antes disso. */
export const PAY_WINDOW_MINUTES = 30;
export const SEND_AFTER_MIN = 1;
export const SEND_AFTER_MAX = PAY_WINDOW_MINUTES - 1;
export const SEND_AFTER_DEFAULT = 15;

const ORDER_BTN = { buttonLabel: "Acompanhar pedido", buttonUrl: "{{order_url}}" };
const ADMIN_BTN = { buttonLabel: "Abrir pedido no painel", buttonUrl: "{{admin_url}}" };

function t(partial: Pick<EmailTemplate, "name" | "subject" | "title" | "body"> & Partial<EmailTemplate>): EmailTemplate {
  return { enabled: true, buttonLabel: "", buttonUrl: "", showItems: false, ...partial };
}

export const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  // ---------------------------------------------------------------- cliente
  { key: "account_created", audience: "customer", label: "Conta criada", when: "Quando o cliente cria a conta.",
    defaults: t({ name: "Conta criada", subject: "Bem-vindo à DinoBlack Games, {{name}}!", title: "Bem-vindo, {{name}}!",
      body: "<p>Sua conta na DinoBlack Games está pronta. Agora você acompanha seus pedidos e compra mais rápido.</p><p>Qualquer dúvida, é só chamar a gente no WhatsApp.</p>", buttonLabel: "Ver a loja", buttonUrl: "{{site_url}}/loja" }) },
  { key: "order_created", audience: "customer", label: "Pedido recebido", when: "Quando o cliente finaliza o pedido (aguardando pagamento).",
    defaults: t({ name: "Pedido recebido", subject: "Recebemos o seu pedido {{order_number}}", title: "Pedido recebido!",
      body: "<p>Olá, {{name}}. Recebemos o pedido <strong>{{order_number}}</strong> e já reservamos os seus itens.</p><p>Assim que o pagamento for confirmado, começamos a separar tudo. Total: <strong>{{total}}</strong>.</p>", showItems: true, ...ORDER_BTN }) },
  { key: "payment_pending_reminder", audience: "customer", label: "Pagamento pendente (lembrete)", delayed: true, when: "Quando o pedido segue sem pagamento depois do tempo definido abaixo. Envios, cliques e compras aparecem no Dashboard.",
    defaults: t({ name: "Pagamento pendente", subject: "Falta pouco para garantir o pedido {{order_number}}", title: "Seu pagamento ainda está pendente", sendAfterMinutes: SEND_AFTER_DEFAULT,
      body: "<p>Olá, {{name}}. Seus itens estão reservados, mas o pagamento do pedido <strong>{{order_number}}</strong> ainda não foi confirmado.</p><p>Finalize em poucos minutos para não perder a reserva.</p>", showItems: true, buttonLabel: "Pagar agora", buttonUrl: "{{order_url}}" }) },
  { key: "order_paid", audience: "customer", label: "Pagamento aprovado", when: "Quando o pagamento é confirmado.",
    defaults: t({ name: "Pagamento aprovado", subject: "Pagamento aprovado: pedido {{order_number}}", title: "Pagamento aprovado!",
      body: "<p>Olá, {{name}}. O pagamento do pedido <strong>{{order_number}}</strong> foi aprovado. Já estamos separando os seus itens.</p><p>Você recebe um novo aviso quando o pedido estiver a caminho.</p>", showItems: true, ...ORDER_BTN }) },
  { key: "payment_failed", audience: "customer", label: "Pagamento recusado", when: "Quando o Mercado Pago recusa o pagamento.",
    defaults: t({ name: "Pagamento recusado", subject: "Não conseguimos aprovar o pagamento do pedido {{order_number}}", title: "Pagamento recusado",
      body: "<p>Olá, {{name}}. O pagamento do pedido <strong>{{order_number}}</strong> não foi aprovado.</p><p>Seus itens continuam reservados por tempo limitado. Tente de novo com outro cartão ou pague por Pix.</p>", showItems: true, buttonLabel: "Tentar novamente", buttonUrl: "{{order_url}}" }) },
  { key: "order_preparing", audience: "customer", label: "Em preparação", when: "Quando a equipe muda o pedido para “Em preparação”.",
    defaults: t({ name: "Em preparação", subject: "Estamos preparando o pedido {{order_number}}", title: "Seu pedido está em preparação",
      body: "<p>Olá, {{name}}. A equipe da DinoBlack começou a separar, testar e embalar o pedido <strong>{{order_number}}</strong>.</p>", showItems: true, ...ORDER_BTN }) },
  { key: "order_shipped", audience: "customer", label: "Saiu para entrega", when: "Quando o pedido é despachado.",
    defaults: t({ name: "Saiu para entrega", subject: "O pedido {{order_number}} saiu para entrega", title: "Seu pedido saiu para entrega!",
      body: "<p>Olá, {{name}}. O pedido <strong>{{order_number}}</strong> está a caminho.</p><p>Código de rastreio: <strong>{{tracking_code}}</strong></p>", showItems: true, buttonLabel: "Acompanhar entrega", buttonUrl: "{{order_url}}" }) },
  { key: "order_delivered", audience: "customer", label: "Entregue", when: "Quando o pedido é entregue.",
    defaults: t({ name: "Entregue", subject: "Pedido {{order_number}} entregue", title: "Pedido entregue",
      body: "<p>Olá, {{name}}. Seu pedido <strong>{{order_number}}</strong> foi entregue. Esperamos que você curta!</p><p>Se algo não estiver como esperado, fale com a gente: a garantia DinoBlack está com você.</p>", ...ORDER_BTN }) },
  { key: "order_cancelled", audience: "customer", label: "Pedido cancelado", when: "Quando o pedido é cancelado (cliente, equipe ou prazo de pagamento).",
    defaults: t({ name: "Pedido cancelado", subject: "Pedido {{order_number}} cancelado", title: "Pedido cancelado",
      body: "<p>Olá, {{name}}. O pedido <strong>{{order_number}}</strong> foi cancelado e os itens voltaram ao estoque.</p><p>Se foi um engano, é só fazer um novo pedido ou chamar a gente no WhatsApp.</p>", buttonLabel: "Voltar à loja", buttonUrl: "{{site_url}}/loja" }) },
  { key: "exchange_requested", audience: "customer", label: "Pedido de troca recebido", when: "Quando é aberta uma solicitação de troca.",
    defaults: t({ name: "Pedido de troca recebido", subject: "Recebemos o seu pedido de troca ({{order_number}})", title: "Pedido de troca recebido",
      body: "<p>Olá, {{name}}. Recebemos a solicitação de troca do pedido <strong>{{order_number}}</strong>.</p><p>Motivo informado: <em>{{reason}}</em></p><p>Nossa equipe analisa e responde com os próximos passos em até 2 dias úteis.</p>", ...ORDER_BTN }) },
  { key: "refund_requested", audience: "customer", label: "Pedido de estorno recebido", when: "Quando é aberta uma solicitação de estorno.",
    defaults: t({ name: "Pedido de estorno recebido", subject: "Recebemos o seu pedido de estorno ({{order_number}})", title: "Pedido de estorno recebido",
      body: "<p>Olá, {{name}}. Recebemos a solicitação de estorno do pedido <strong>{{order_number}}</strong>.</p><p>Motivo informado: <em>{{reason}}</em></p><p>Vamos analisar e avisar você assim que houver uma resposta.</p>", ...ORDER_BTN }) },
  { key: "order_refunded", audience: "customer", label: "Estorno realizado", when: "Quando o pedido passa para “Estornado”.",
    defaults: t({ name: "Estorno realizado", subject: "Estorno do pedido {{order_number}} realizado", title: "Estorno realizado",
      body: "<p>Olá, {{name}}. O estorno do pedido <strong>{{order_number}}</strong> foi realizado no valor de <strong>{{total}}</strong>.</p><p>O prazo para o valor aparecer depende do banco ou da operadora do cartão. No Pix, costuma ser imediato.</p>", ...ORDER_BTN }) },
  { key: "used_request_received", audience: "customer", label: "Avaliação de usado recebida", when: "Quando o cliente envia um usado para avaliação (Projeto Drop).",
    defaults: t({ name: "Avaliação de usado recebida", subject: "Recebemos a sua solicitação de avaliação", title: "Recebemos o seu usado",
      body: "<p>Olá! Recebemos os dados do item para avaliação. Nossa equipe responde com a próxima etapa, sem promessa de valor.</p>" }) },
  { key: "back_in_stock", audience: "customer", label: "Produto disponível novamente", when: "Quando um produto esgotado volta ao estoque.",
    defaults: t({ name: "Produto disponível novamente", subject: "{{product_name}} voltou ao estoque", title: "Boa notícia!",
      body: "<p><strong>{{product_name}}</strong> está disponível novamente. Corre, as unidades costumam acabar rápido.</p>", buttonLabel: "Ver produto", buttonUrl: "{{site_url}}/loja" }) },

  // ---------------------------------------------------------------- equipe
  { key: "admin_new_order", audience: "admin", label: "Novo pedido", when: "Quando um cliente faz um pedido.",
    defaults: t({ name: "Novo pedido", subject: "Novo pedido {{order_number}}: {{total}}", title: "Novo pedido recebido",
      body: "<p>Cliente: <strong>{{name}}</strong> ({{customer_email}})</p><p>Pedido <strong>{{order_number}}</strong> · {{total}} · {{payment_method}}</p><p>Status: {{status}}</p>", showItems: true, ...ADMIN_BTN }) },
  { key: "admin_payment_pending", audience: "admin", label: "Pagamento pendente", delayed: true, when: "Quando um pedido fica sem pagamento além do tempo definido abaixo.",
    defaults: t({ name: "Pagamento pendente", subject: "Pedido {{order_number}} segue sem pagamento", title: "Pedido com pagamento pendente", sendAfterMinutes: SEND_AFTER_DEFAULT,
      body: "<p>O pedido <strong>{{order_number}}</strong> de <strong>{{name}}</strong> ({{total}}) está sem pagamento há {{pending_minutes}} minutos.</p><p>Vale chamar o cliente antes que a reserva expire.</p>", showItems: true, ...ADMIN_BTN }) },
  { key: "admin_order_cancelled", audience: "admin", label: "Pedido cancelado", when: "Quando um pedido é cancelado.",
    defaults: t({ name: "Pedido cancelado", subject: "Pedido {{order_number}} cancelado", title: "Pedido cancelado",
      body: "<p>O pedido <strong>{{order_number}}</strong> de <strong>{{name}}</strong> ({{total}}) foi cancelado.</p><p>Motivo: {{reason}}</p>", ...ADMIN_BTN }) },
  { key: "admin_refund_requested", audience: "admin", label: "Cliente pediu estorno", when: "Quando um cliente pede estorno.",
    defaults: t({ name: "Cliente pediu estorno", subject: "Pedido de estorno: pedido {{order_number}}", title: "Pedido de estorno",
      body: "<p><strong>{{name}}</strong> pediu estorno do pedido <strong>{{order_number}}</strong> ({{total}}).</p><p>Motivo: <em>{{reason}}</em></p>", ...ADMIN_BTN }) },
  { key: "admin_exchange_requested", audience: "admin", label: "Cliente pediu troca", when: "Quando um cliente pede troca.",
    defaults: t({ name: "Cliente pediu troca", subject: "Pedido de troca: pedido {{order_number}}", title: "Pedido de troca",
      body: "<p><strong>{{name}}</strong> pediu troca no pedido <strong>{{order_number}}</strong>.</p><p>Motivo: <em>{{reason}}</em></p>", showItems: true, ...ADMIN_BTN }) },
  { key: "admin_order_refunded", audience: "admin", label: "Pedido estornado", when: "Quando um pedido passa para “Estornado”.",
    defaults: t({ name: "Pedido estornado", subject: "Pedido {{order_number}} estornado", title: "Pedido estornado",
      body: "<p>O pedido <strong>{{order_number}}</strong> de <strong>{{name}}</strong> foi estornado ({{total}}).</p>", ...ADMIN_BTN }) },

  // ---------------------------------------------------------------- usuários do painel
  { key: "staff_invited", audience: "staff", label: "Convite para o painel", when: "Quando um usuário (Gerente ou Super Admin) é cadastrado.",
    defaults: t({ name: "Convite para o painel", subject: "Você foi convidado para o painel da DinoBlack Games", title: "Seu acesso ao painel",
      body: "<p>Olá, {{name}}. Você foi cadastrado como <strong>{{role}}</strong> no painel administrativo da DinoBlack Games.</p><p>Seu acesso:<br>Usuário: <strong>{{staff_email}}</strong><br>Senha provisória: <strong>{{temp_password}}</strong></p><p>Entre e troque a senha no primeiro acesso. Se você não esperava este convite, ignore esta mensagem.</p>", buttonLabel: "Entrar no painel", buttonUrl: "{{admin_login_url}}" }) },
  { key: "staff_access_changed", audience: "staff", label: "Permissões alteradas", when: "Quando o perfil ou as permissões de um usuário mudam.",
    defaults: t({ name: "Permissões alteradas", subject: "Seu acesso ao painel foi atualizado", title: "Acesso atualizado",
      body: "<p>Olá, {{name}}. Seu acesso ao painel da DinoBlack Games foi atualizado. Perfil atual: <strong>{{role}}</strong>.</p><p>Permissões: {{permissions}}</p>", buttonLabel: "Abrir o painel", buttonUrl: "{{admin_login_url}}" }) },
];

export const EMAIL_TEMPLATE_KEYS = EMAIL_TEMPLATES.map((m) => m.key);
export type EmailTemplateKey = string;
export const AUDIENCE_LABEL: Record<EmailAudience, string> = { customer: "Clientes", admin: "Equipe (administradores)", staff: "Usuários do painel" };

export const validSendAfter = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= SEND_AFTER_MIN && value <= SEND_AFTER_MAX;

/** Variáveis que os templates aceitam, para o editor mostrar. */
export const EMAIL_VARIABLES: [string, string][] = [
  ["name", "Nome do cliente (ou do usuário)"],
  ["order_number", "Número do pedido"],
  ["total", "Valor total do pedido"],
  ["status", "Status atual do pedido"],
  ["order_url", "Link para o cliente acompanhar o pedido"],
  ["admin_url", "Link do pedido no painel"],
  ["tracking_code", "Código de rastreio"],
  ["payment_method", "Forma de pagamento"],
  ["customer_email", "E-mail do cliente"],
  ["reason", "Motivo informado (cancelamento, troca, estorno)"],
  ["pending_minutes", "Minutos sem pagamento"],
  ["site_url", "Endereço da loja"],
  ["role", "Perfil do usuário do painel"],
  ["staff_email", "E-mail do usuário do painel"],
  ["temp_password", "Senha provisória do usuário"],
  ["admin_login_url", "Link do login do painel"],
];

export function defaultTemplate(key: string): EmailTemplate | null {
  const meta = EMAIL_TEMPLATES.find((m) => m.key === key);
  return meta ? { ...meta.defaults } : null;
}
