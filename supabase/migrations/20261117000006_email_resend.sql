-- Integração de e-mail transacional. A chave do Resend fica somente em RESEND_API_KEY.
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_domain_check;
ALTER TABLE integrations ADD CONSTRAINT integrations_domain_check
  CHECK (domain IN ('payments', 'shipping', 'erp', 'fiscal', 'messaging', 'analytics', 'email'));

INSERT INTO integrations (domain, provider, status, owner_name, notes)
VALUES ('email', 'resend', 'not_configured', 'Resend', 'A chave é mantida somente na variável RESEND_API_KEY.')
ON CONFLICT (domain) DO NOTHING;

INSERT INTO store_settings (key, value, is_public)
VALUES (
  'email_templates',
  '{
    "account_created": {"name":"Nova conta","subject":"Bem-vindo à DinoBlack Games, {{name}}!","enabled":true,"body":"<h1>Bem-vindo, {{name}}!</h1><p>Sua conta foi criada com sucesso. Agora você pode acompanhar pedidos e finalizar compras com mais rapidez.</p><p><a href=\"{{site_url}}/minhaconta\">Acessar minha conta</a></p>"},
    "order_created": {"name":"Nova compra","subject":"Pedido {{order_number}} recebido","enabled":true,"body":"<h1>Pedido recebido</h1><p>Olá, {{name}}. Recebemos o pedido <strong>{{order_number}}</strong> no valor de {{total}}.</p><p>Você receberá novas atualizações por e-mail.</p>"},
    "order_paid": {"name":"Pagamento confirmado","subject":"Pagamento confirmado — pedido {{order_number}}","enabled":true,"body":"<h1>Pagamento confirmado</h1><p>O pagamento do pedido <strong>{{order_number}}</strong> foi confirmado. Estamos preparando tudo para o envio.</p>"},
    "order_shipped": {"name":"Pedido enviado","subject":"Seu pedido {{order_number}} foi enviado","enabled":true,"body":"<h1>Pedido enviado</h1><p>Seu pedido <strong>{{order_number}}</strong> já está a caminho.</p><p>Código de rastreio: <strong>{{tracking_code}}</strong></p>"},
    "order_delivered": {"name":"Pedido entregue","subject":"Pedido {{order_number}} entregue","enabled":true,"body":"<h1>Pedido entregue</h1><p>O pedido <strong>{{order_number}}</strong> foi entregue. Esperamos que você aproveite!</p>"},
    "used_request_received": {"name":"Solicitação de avaliação recebida","subject":"Recebemos sua solicitação de troca","enabled":true,"body":"<h1>Solicitação recebida</h1><p>Olá, {{name}}. Recebemos os dados do item enviado para avaliação. Nossa equipe entrará em contato em breve.</p>"},
    "back_in_stock": {"name":"Produto disponível novamente","subject":"{{product_name}} voltou ao estoque","enabled":true,"body":"<h1>Boa notícia!</h1><p>O produto <strong>{{product_name}}</strong> está disponível novamente.</p><p><a href=\"{{product_url}}\">Ver produto</a></p>"}
  }'::jsonb,
  false
)
ON CONFLICT (key) DO NOTHING;
