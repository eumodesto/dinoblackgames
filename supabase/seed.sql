-- =============================================================================
-- DADOS FICTÍCIOS PARA TESTES. GERADO por supabase/tools/build-seed.mjs. Não edite à mão.
-- Usuários de teste (senha padrão Teste@2026, SÓ para ambiente local):
--   owner@teste.dinoblack.example            owner
--   gerente@teste.dinoblack.example          manager
--   estoque@teste.dinoblack.example          stock
--   avaliador@teste.dinoblack.example        appraiser
--   atendimento@teste.dinoblack.example      support
--   editor@teste.dinoblack.example           editor
--   ana@teste.dinoblack.example              cliente
--   bruno@teste.dinoblack.example            cliente
--   carla@teste.dinoblack.example            cliente
--   diego@teste.dinoblack.example            cliente
-- =============================================================================

-- ----------------------------------------------------------------------
-- Usuários de teste (auth + perfis + papéis). Senha: Teste@2026
-- ----------------------------------------------------------------------
do $$
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  values
    ('00000001-0000-4000-8000-000000000001', 'owner@teste.dinoblack.example', crypt('Teste@2026', gen_salt('bf')), now(), '{"full_name":"Marina Dona (teste)"}'::jsonb),
    ('00000001-0000-4000-8000-000000000002', 'gerente@teste.dinoblack.example', crypt('Teste@2026', gen_salt('bf')), now(), '{"full_name":"Rafael Gerente (teste)"}'::jsonb),
    ('00000001-0000-4000-8000-000000000003', 'estoque@teste.dinoblack.example', crypt('Teste@2026', gen_salt('bf')), now(), '{"full_name":"Caio Estoque (teste)"}'::jsonb),
    ('00000001-0000-4000-8000-000000000004', 'avaliador@teste.dinoblack.example', crypt('Teste@2026', gen_salt('bf')), now(), '{"full_name":"Livia Avaliadora (teste)"}'::jsonb),
    ('00000001-0000-4000-8000-000000000005', 'atendimento@teste.dinoblack.example', crypt('Teste@2026', gen_salt('bf')), now(), '{"full_name":"Paula Atendimento (teste)"}'::jsonb),
    ('00000001-0000-4000-8000-000000000006', 'editor@teste.dinoblack.example', crypt('Teste@2026', gen_salt('bf')), now(), '{"full_name":"Davi Conteudo (teste)"}'::jsonb),
    ('00000001-0000-4000-8000-00000000000b', 'ana@teste.dinoblack.example', crypt('Teste@2026', gen_salt('bf')), now(), '{"full_name":"Ana Cliente (teste)"}'::jsonb),
    ('00000001-0000-4000-8000-00000000000c', 'bruno@teste.dinoblack.example', crypt('Teste@2026', gen_salt('bf')), now(), '{"full_name":"Bruno Cliente (teste)"}'::jsonb),
    ('00000001-0000-4000-8000-00000000000d', 'carla@teste.dinoblack.example', crypt('Teste@2026', gen_salt('bf')), now(), '{"full_name":"Carla Cliente (teste)"}'::jsonb),
    ('00000001-0000-4000-8000-00000000000e', 'diego@teste.dinoblack.example', crypt('Teste@2026', gen_salt('bf')), now(), '{"full_name":"Diego Cliente (teste)"}'::jsonb);
  -- No Supabase real, o login por senha também exige a identidade "email".
  if to_regclass('auth.identities') is not null then
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    select gen_random_uuid(), u.id, u.email, 'email',
           jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
           now(), now(), now()
    from auth.users u where u.email like '%@teste.dinoblack.example';
  end if;
end $$;
insert into profiles (id, full_name, email, phone) values
  ('00000001-0000-4000-8000-000000000001', 'Marina Dona (teste)', 'owner@teste.dinoblack.example', '(61) 90000-0001'),
  ('00000001-0000-4000-8000-000000000002', 'Rafael Gerente (teste)', 'gerente@teste.dinoblack.example', '(61) 90000-0002'),
  ('00000001-0000-4000-8000-000000000003', 'Caio Estoque (teste)', 'estoque@teste.dinoblack.example', '(61) 90000-0003'),
  ('00000001-0000-4000-8000-000000000004', 'Livia Avaliadora (teste)', 'avaliador@teste.dinoblack.example', '(61) 90000-0004'),
  ('00000001-0000-4000-8000-000000000005', 'Paula Atendimento (teste)', 'atendimento@teste.dinoblack.example', '(61) 90000-0005'),
  ('00000001-0000-4000-8000-000000000006', 'Davi Conteudo (teste)', 'editor@teste.dinoblack.example', '(61) 90000-0006'),
  ('00000001-0000-4000-8000-00000000000b', 'Ana Cliente (teste)', 'ana@teste.dinoblack.example', '(61) 90000-0011'),
  ('00000001-0000-4000-8000-00000000000c', 'Bruno Cliente (teste)', 'bruno@teste.dinoblack.example', '(61) 90000-0012'),
  ('00000001-0000-4000-8000-00000000000d', 'Carla Cliente (teste)', 'carla@teste.dinoblack.example', '(11) 90000-0013'),
  ('00000001-0000-4000-8000-00000000000e', 'Diego Cliente (teste)', 'diego@teste.dinoblack.example', '(21) 90000-0014') on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone;
insert into user_roles (user_id, role, granted_by) values
  ('00000001-0000-4000-8000-000000000001', 'owner', '00000001-0000-4000-8000-000000000001'),
  ('00000001-0000-4000-8000-000000000002', 'manager', '00000001-0000-4000-8000-000000000001'),
  ('00000001-0000-4000-8000-000000000003', 'stock', '00000001-0000-4000-8000-000000000001'),
  ('00000001-0000-4000-8000-000000000004', 'appraiser', '00000001-0000-4000-8000-000000000001'),
  ('00000001-0000-4000-8000-000000000005', 'support', '00000001-0000-4000-8000-000000000001'),
  ('00000001-0000-4000-8000-000000000006', 'editor', '00000001-0000-4000-8000-000000000001');
insert into addresses (id, user_id, label, recipient, phone, cep, street, number, complement, district, city, state, is_default) values
  ('0000000e-0000-4000-8000-000000000001', '00000001-0000-4000-8000-00000000000b', 'Casa', 'Ana Cliente (teste)', '(61) 90000-0000', '72510000', 'Quadra 101 Conjunto A', '10', 'Casa 1', 'Santa Maria', 'Brasília', 'DF', true),
  ('0000000e-0000-4000-8000-000000000002', '00000001-0000-4000-8000-00000000000c', 'Casa', 'Bruno Cliente (teste)', '(61) 90000-0000', '72515000', 'Quadra 205 Conjunto B', '22', null, 'Santa Maria', 'Brasília', 'DF', true),
  ('0000000e-0000-4000-8000-000000000003', '00000001-0000-4000-8000-00000000000d', 'Casa', 'Carla Cliente (teste)', '(61) 90000-0000', '01310100', 'Avenida Exemplo', '1000', 'Apto 12', 'Bela Vista', 'São Paulo', 'SP', true),
  ('0000000e-0000-4000-8000-000000000004', '00000001-0000-4000-8000-00000000000d', 'Trabalho', 'Carla Cliente (teste)', '(61) 90000-0000', '01415000', 'Rua Fictícia', '55', null, 'Jardins', 'São Paulo', 'SP', false),
  ('0000000e-0000-4000-8000-000000000005', '00000001-0000-4000-8000-00000000000e', 'Casa', 'Diego Cliente (teste)', '(61) 90000-0000', '22041001', 'Rua Imaginária', '300', null, 'Copacabana', 'Rio de Janeiro', 'RJ', true);

-- ----------------------------------------------------------------------
-- Categorias e coleções
-- ----------------------------------------------------------------------
insert into categories (id, slug, name, position, image_url) values
  ('00000002-0000-4000-8000-000000000001', 'consoles', 'Consoles', 1, 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80'),
  ('00000002-0000-4000-8000-000000000002', 'pc-gamer', 'PC Gamer', 2, 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=900&q=80'),
  ('00000002-0000-4000-8000-000000000003', 'retro', 'Retro', 3, 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80'),
  ('00000002-0000-4000-8000-000000000004', 'notebooks', 'Notebooks', 4, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80');
insert into collections (id, slug, name, description, status, position) values
  ('00000003-0000-4000-8000-000000000001', 'ofertas', 'Ofertas', 'Produtos com preço promocional.', 'published', 1),
  ('00000003-0000-4000-8000-000000000002', 'lancamentos', 'Lançamentos', 'Chegou agora.', 'published', 2),
  ('00000003-0000-4000-8000-000000000003', 'seminovos', 'Seminovos', 'Unidades únicas revisadas pela DinoBlack.', 'published', 3),
  ('00000003-0000-4000-8000-000000000004', 'raridades', 'Raridades', 'Itens raros e de colecionador.', 'published', 4),
  ('00000003-0000-4000-8000-000000000005', 'destaques', 'Destaques', 'Seleção da casa.', 'published', 5);

-- ----------------------------------------------------------------------
-- Locais de estoque
-- ----------------------------------------------------------------------
insert into stock_locations (id, code, name, is_pickup) values
  ('00000006-0000-4000-8000-000000000001', 'LOJA-SM', 'Loja Santa Maria (Brasília - DF)', true),
  ('00000006-0000-4000-8000-000000000002', 'DEP-01', 'Depósito', false);

-- ----------------------------------------------------------------------
-- Produtos, mídia, filtros e variações
-- ----------------------------------------------------------------------
insert into products (id, slug, sku, name, category_id, condition, status, brand, tagline, badge, warranty_months, warranty_text, highlights, specs, in_box, faq, sold_count, rating, published_at) values
  ('00000004-0000-4000-8000-000000000001', 'playstation-5-slim-1tb', 'DB-PS5-01', 'PlayStation 5 Slim · 1 TB', '00000002-0000-4000-8000-000000000001', 'novo', 'published', 'Sony', 'SSD ultrarrápido, DualSense e o catálogo exclusivo da PlayStation em um console mais compacto.', 'Flagship', 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"Carregamento quase instantâneo","text":"O SSD de alta velocidade praticamente elimina as telas de espera."},{"title":"DualSense: você sente o jogo","text":"Feedback tátil e gatilhos adaptáveis em jogos compatíveis."},{"title":"Imagem em até 4K","text":"Jogos em alta resolução e taxa de quadros elevada."}]'::jsonb, '[{"group":"Desempenho","rows":[["Armazenamento","SSD de 1 TB"],["Resolução","Até 4K"]]},{"group":"Geral","rows":[["Marca","Sony"],["Condição","Novo, lacrado"]]}]'::jsonb, '["Console PlayStation 5 Slim","1 controle DualSense","Cabo HDMI","Cabo de energia","Cabo USB","Base de apoio"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 120, 4.9, now() - interval '31 days'),
  ('00000004-0000-4000-8000-000000000002', 'nintendo-switch-oled', 'DB-SWO-02', 'Nintendo Switch OLED', '00000002-0000-4000-8000-000000000001', 'novo', 'published', 'Nintendo', 'Tela OLED vibrante, base com porta de rede e a liberdade de jogar em casa ou na rua.', 'Flagship', 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"Tela OLED de 7 polegadas","text":"Cores intensas e pretos profundos."},{"title":"Três modos, um console","text":"TV, portátil ou de mesa."},{"title":"Biblioteca Nintendo","text":"Exclusivos para jogar sozinho ou em grupo."}]'::jsonb, '[{"group":"Tela e jogo","rows":[["Tela","OLED de 7 polegadas"],["Armazenamento","64 GB"]]},{"group":"Geral","rows":[["Marca","Nintendo"],["Condição","Novo, lacrado"]]}]'::jsonb, '["Console Nintendo Switch OLED","2 controles Joy-Con","Base (dock)","Cabo HDMI","Adaptador de energia"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 86, 4.8, now() - interval '32 days'),
  ('00000004-0000-4000-8000-000000000003', 'dualsense-branco', 'DB-DU-03', 'Controle DualSense · Branco', '00000002-0000-4000-8000-000000000001', 'seminovo', 'published', 'Sony', 'Unidade seminovo revisada pela DinoBlack, com laudo, fotos reais e garantia.', 'Premium Gear', 3, 'Garantia de 90 dias da DinoBlack, cobrindo defeitos de funcionamento.', '[{"title":"Unidade única e revisada","text":"Você compra exatamente o controle das fotos."},{"title":"Feedback tátil","text":"Vibração de alta precisão e gatilhos adaptáveis."},{"title":"Preço de seminovo","text":"Mais barato que um novo, com garantia e laudo."}]'::jsonb, '[{"group":"Controle","rows":[["Conexão","Bluetooth e cabo USB-C"],["Compatível com","PlayStation 5 e PC"]]},{"group":"Geral","rows":[["Condição","Seminovo, unidade única"],["Garantia","90 dias"]]}]'::jsonb, '["Controle DualSense","Cabo USB-C"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 0, null, now() - interval '33 days'),
  ('00000004-0000-4000-8000-000000000004', 'notebook-gamer-rtx4060', 'DB-NB-04', 'Notebook Gamer RTX 4060 · 16GB', '00000002-0000-4000-8000-000000000004', 'novo', 'published', 'Gamer', 'Placa de vídeo dedicada e 16 GB de memória para jogar em alto desempenho.', 'Flagship', 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"GPU dedicada RTX 4060","text":"Desempenho para jogos atuais."},{"title":"16 GB de memória","text":"Jogar e transmitir sem travar."}]'::jsonb, '[{"group":"Desempenho","rows":[["Placa de vídeo","NVIDIA GeForce RTX 4060"],["Memória RAM","16 GB"]]}]'::jsonb, '["Notebook","Carregador","Manual e documentos de garantia"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 12, null, now() - interval '34 days'),
  ('00000004-0000-4000-8000-000000000005', 'pc-gamer-ryzen7', 'DB-PC-05', 'PC Gamer Ryzen 7 · RTX 4070', '00000002-0000-4000-8000-000000000002', 'novo', 'published', 'Gamer', 'Montado e testado pela DinoBlack, pronto para jogos em alta resolução.', 'Premium Gear', 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"Montado e testado","text":"Teste de estresse antes do envio."}]'::jsonb, '[{"group":"Desempenho","rows":[["Processador","Ryzen 7"],["Placa de vídeo","GeForce RTX 4070"],["Memória RAM","32 GB"]]}]'::jsonb, '["Gabinete montado","Cabo de energia","Manual"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 5, null, now() - interval '35 days'),
  ('00000004-0000-4000-8000-000000000006', 'console-retro-mini', 'DB-RT-06', 'Console Retrô Mini · 10.000 jogos', '00000002-0000-4000-8000-000000000003', 'novo', 'published', 'Retrô', 'Milhares de clássicos em um console compacto.', 'Premium Gear', 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"Clássicos prontos para jogar","text":"Biblioteca embutida."}]'::jsonb, '[{"group":"Geral","rows":[["Condição","Novo"]]}]'::jsonb, '["Console","2 controles","Cabo HDMI"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 41, null, now() - interval '36 days'),
  ('00000004-0000-4000-8000-000000000007', 'headset-gamer-7-1', 'DB-HS-07', 'Headset Gamer 7.1 Surround', '00000002-0000-4000-8000-000000000002', 'novo', 'published', 'Gamer', 'Som envolvente para jogar com precisão.', 'Premium Gear', 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"Som 7.1","text":"Posicionamento de som para jogos competitivos."}]'::jsonb, '[{"group":"Geral","rows":[["Condição","Novo"]]}]'::jsonb, '["Headset","Cabo USB"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 58, null, now() - interval '37 days'),
  ('00000004-0000-4000-8000-000000000008', 'teclado-mecanico-rgb', 'DB-KB-08', 'Teclado Mecânico RGB Switch Red', '00000002-0000-4000-8000-000000000002', 'novo', 'published', 'Gamer', 'Resposta rápida e iluminação RGB.', 'Premium Gear', 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"Switch Red","text":"Acionamento linear e silencioso."}]'::jsonb, '[{"group":"Geral","rows":[["Condição","Novo"]]}]'::jsonb, '["Teclado","Cabo USB"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 33, null, now() - interval '38 days'),
  ('00000004-0000-4000-8000-000000000009', 'xbox-series-s-512gb', 'DB-XB-09', 'Xbox Series S · 512 GB', '00000002-0000-4000-8000-000000000001', 'novo', 'published', 'Microsoft', 'Console digital compacto para a geração atual.', null, 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"Compacto e digital","text":"Sem leitor de disco."}]'::jsonb, '[{"group":"Geral","rows":[["Armazenamento","512 GB"]]}]'::jsonb, '["Console","Controle","Cabo HDMI"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 18, null, now() - interval '39 days'),
  ('00000004-0000-4000-8000-00000000000a', 'nintendo-switch-lite', 'DB-SWL-10', 'Nintendo Switch Lite', '00000002-0000-4000-8000-000000000001', 'novo', 'published', 'Nintendo', 'Portátil, leve e pronto para jogar.', null, 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"100% portátil","text":"Para jogar em qualquer lugar."}]'::jsonb, '[{"group":"Geral","rows":[["Modo de jogo","Portátil"]]}]'::jsonb, '["Console","Cabo de energia"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 22, null, now() - interval '40 days'),
  ('00000004-0000-4000-8000-00000000000b', 'playstation-4-pro-1tb', 'DB-PS4-11', 'PlayStation 4 Pro · 1 TB', '00000002-0000-4000-8000-000000000001', 'seminovo', 'published', 'Sony', 'Seminovo revisado, com laudo e garantia.', null, 3, 'Garantia de 90 dias da DinoBlack, cobrindo defeitos de funcionamento.', '[{"title":"Revisado pela DinoBlack","text":"Testes de leitor, rede e armazenamento."}]'::jsonb, '[{"group":"Geral","rows":[["Condição","Seminovo, unidade única"]]}]'::jsonb, '["Console","Controle","Cabo HDMI","Cabo de energia"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 0, null, now() - interval '41 days'),
  ('00000004-0000-4000-8000-00000000000c', 'controle-pro-switch', 'DB-PRO-12', 'Controle Pro Switch', '00000002-0000-4000-8000-000000000001', 'novo', 'published', 'Nintendo', 'Controle confortável para sessões longas.', null, 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"Ergonômico","text":"Pegada pensada para sessões longas."}]'::jsonb, '[{"group":"Geral","rows":[["Conexão","Bluetooth e USB"]]}]'::jsonb, '["Controle","Cabo USB"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 9, null, now() - interval '42 days'),
  ('00000004-0000-4000-8000-00000000000d', 'mouse-gamer-8000-dpi', 'DB-MS-13', 'Mouse Gamer 8000 DPI', '00000002-0000-4000-8000-000000000002', 'novo', 'published', 'Gamer', 'Sensor preciso e leve.', null, 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"8000 DPI","text":"Sensor ajustável."}]'::jsonb, '[{"group":"Geral","rows":[["DPI","Até 8000"]]}]'::jsonb, '["Mouse","Cabo USB"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 27, null, now() - interval '43 days'),
  ('00000004-0000-4000-8000-00000000000e', 'monitor-gamer-27-165hz', 'DB-MN-14', 'Monitor Gamer 27" 165 Hz', '00000002-0000-4000-8000-000000000002', 'novo', 'published', 'Gamer', 'Fluidez de 165 Hz em 27 polegadas.', null, 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"165 Hz","text":"Imagem fluida em jogos rápidos."}]'::jsonb, '[{"group":"Tela","rows":[["Tamanho","27 polegadas"],["Taxa de atualização","165 Hz"]]}]'::jsonb, '["Monitor","Cabo HDMI","Fonte"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 14, null, now() - interval '44 days'),
  ('00000004-0000-4000-8000-00000000000f', 'ssd-nvme-1tb', 'DB-SSD-15', 'SSD NVMe 1 TB', '00000002-0000-4000-8000-000000000002', 'novo', 'published', 'Gamer', 'Leitura rápida para carregar jogos e sistema.', null, 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"NVMe","text":"Muito mais rápido que um HD."}]'::jsonb, '[{"group":"Geral","rows":[["Capacidade","1 TB"]]}]'::jsonb, '["SSD"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 31, null, now() - interval '45 days'),
  ('00000004-0000-4000-8000-000000000010', 'placa-de-video-rtx-4060-8gb', 'DB-GPU-16', 'Placa de Vídeo RTX 4060 8 GB', '00000002-0000-4000-8000-000000000002', 'novo', 'published', 'Gamer', 'Desempenho para jogos em Full HD e além.', null, 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"8 GB de memória","text":"Para texturas pesadas."}]'::jsonb, '[{"group":"Geral","rows":[["Memória","8 GB"]]}]'::jsonb, '["Placa de vídeo"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 7, null, now() - interval '46 days'),
  ('00000004-0000-4000-8000-000000000011', 'mega-drive-2-controles', 'DB-MD-17', 'Mega Drive com 2 Controles', '00000002-0000-4000-8000-000000000003', 'raridade', 'published', 'Sega', 'Raridade de coleção, testada e funcionando.', null, 3, 'Garantia de 90 dias da DinoBlack, cobrindo defeitos de funcionamento.', '[{"title":"Peça de coleção","text":"Testada em TV de tubo e LED."}]'::jsonb, '[{"group":"Geral","rows":[["Região","NTSC-B"],["Estado","Usado, funcionando"]]}]'::jsonb, '["Console","2 controles","Cabo AV","Fonte"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 0, null, now() - interval '47 days'),
  ('00000004-0000-4000-8000-000000000012', 'super-nintendo-2-controles', 'DB-SN-18', 'Super Nintendo com 2 Controles', '00000002-0000-4000-8000-000000000003', 'seminovo', 'published', 'Nintendo', 'Clássico revisado, pronto para jogar.', null, 3, 'Garantia de 90 dias da DinoBlack, cobrindo defeitos de funcionamento.', '[{"title":"Revisado","text":"Limpeza e teste completos."}]'::jsonb, '[{"group":"Geral","rows":[["Região","NTSC"]]}]'::jsonb, '["Console","2 controles","Cabo AV","Fonte"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 0, null, now() - interval '48 days'),
  ('00000004-0000-4000-8000-000000000013', 'cartucho-super-mario-world', 'DB-CT-19', 'Cartucho Super Mario World', '00000002-0000-4000-8000-000000000003', 'raridade', 'published', 'Nintendo', 'Cartucho original testado.', null, 3, 'Garantia de 90 dias da DinoBlack, cobrindo defeitos de funcionamento.', '[{"title":"Original","text":"Verificado e testado."}]'::jsonb, '[{"group":"Geral","rows":[["Plataforma","Super Nintendo"]]}]'::jsonb, '["Cartucho"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 0, null, now() - interval '49 days'),
  ('00000004-0000-4000-8000-000000000014', 'notebook-15-core-i5-16gb', 'DB-NB-20', 'Notebook 15" Core i5 · 16 GB', '00000002-0000-4000-8000-000000000004', 'novo', 'published', 'Office', 'Para trabalho, estudo e jogos leves.', null, 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"16 GB de memória","text":"Fluido no dia a dia."}]'::jsonb, '[{"group":"Desempenho","rows":[["Processador","Core i5"],["Memória RAM","16 GB"]]}]'::jsonb, '["Notebook","Carregador"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 15, null, now() - interval '50 days'),
  ('00000004-0000-4000-8000-000000000015', 'notebook-core-i7-seminovo', 'DB-NB-21', 'Notebook Core i7 Seminovo · 16 GB', '00000002-0000-4000-8000-000000000004', 'seminovo', 'published', 'Office', 'Seminovo revisado com garantia.', null, 3, 'Garantia de 90 dias da DinoBlack, cobrindo defeitos de funcionamento.', '[{"title":"Bateria testada","text":"Autonomia verificada."}]'::jsonb, '[{"group":"Desempenho","rows":[["Processador","Core i7"],["Memória RAM","16 GB"]]}]'::jsonb, '["Notebook","Carregador"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 0, null, now() - interval '51 days'),
  ('00000004-0000-4000-8000-000000000016', 'playstation-5-pro-2tb', 'DB-PS5P-22', 'PlayStation 5 Pro · 2 TB', '00000002-0000-4000-8000-000000000001', 'pre_venda', 'published', 'Sony', 'Reserve o seu. Data de chegada a confirmar.', null, 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[{"title":"Pré-venda","text":"Reserva sujeita à política de cancelamento."}]'::jsonb, '[{"group":"Geral","rows":[["Armazenamento","2 TB"]]}]'::jsonb, '["Console","Controle","Cabos"]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 0, null, now() - interval '52 days'),
  ('00000004-0000-4000-8000-000000000017', 'fone-gamer-sem-fio-rascunho', 'DB-DRAFT-23', 'Fone Gamer sem fio (rascunho)', '00000002-0000-4000-8000-000000000002', 'novo', 'draft', 'Gamer', 'Produto em cadastro.', null, 12, 'Garantia de 12 meses, com suporte da DinoBlack para acionar o fabricante.', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 0, null, null),
  ('00000004-0000-4000-8000-000000000018', 'console-antigo-arquivado', 'DB-OLD-24', 'Console antigo (arquivado)', '00000002-0000-4000-8000-000000000003', 'raridade', 'archived', 'Retrô', 'Produto fora de catálogo.', null, 12, 'Garantia de 90 dias da DinoBlack, cobrindo defeitos de funcionamento.', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[{"q":"Como funciona a entrega?","a":"Enviamos para todo o Brasil. O prazo e o valor aparecem ao informar o CEP. Em Brasília também é possível retirar na loja."},{"q":"Posso trocar ou devolver?","a":"Sim. As regras ficam na política de troca e devolução da loja."},{"q":"Vocês compram usados?","a":"Sim, pelo Projeto Drop. A avaliação não é uma oferta final de valor."}]'::jsonb, 0, null, null);
insert into product_media (id, product_id, url, alt, position, crop) values
  ('00000009-0000-4000-8000-0000000003f2', '00000004-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80', 'PlayStation 5 Slim · 1 TB', 1, default),
  ('00000009-0000-4000-8000-0000000003f3', '00000004-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80', 'PlayStation 5 Slim · 1 TB, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-0000000003f4', '00000004-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80', 'PlayStation 5 Slim · 1 TB, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-0000000003fc', '00000004-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80', 'Nintendo Switch OLED', 1, default),
  ('00000009-0000-4000-8000-0000000003fd', '00000004-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80', 'Nintendo Switch OLED, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-0000000003fe', '00000004-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80', 'Nintendo Switch OLED, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-000000000406', '00000004-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=80', 'Controle DualSense · Branco', 1, default),
  ('00000009-0000-4000-8000-000000000407', '00000004-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=80', 'Controle DualSense · Branco, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-000000000408', '00000004-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=80', 'Controle DualSense · Branco, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-000000000410', '00000004-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80', 'Notebook Gamer RTX 4060 · 16GB', 1, default),
  ('00000009-0000-4000-8000-000000000411', '00000004-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80', 'Notebook Gamer RTX 4060 · 16GB, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-000000000412', '00000004-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80', 'Notebook Gamer RTX 4060 · 16GB, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-00000000041a', '00000004-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80', 'PC Gamer Ryzen 7 · RTX 4070', 1, default),
  ('00000009-0000-4000-8000-00000000041b', '00000004-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80', 'PC Gamer Ryzen 7 · RTX 4070, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-00000000041c', '00000004-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80', 'PC Gamer Ryzen 7 · RTX 4070, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-000000000424', '00000004-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Console Retrô Mini · 10.000 jogos', 1, default),
  ('00000009-0000-4000-8000-000000000425', '00000004-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Console Retrô Mini · 10.000 jogos, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-000000000426', '00000004-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Console Retrô Mini · 10.000 jogos, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-00000000042e', '00000004-0000-4000-8000-000000000007', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80', 'Headset Gamer 7.1 Surround', 1, default),
  ('00000009-0000-4000-8000-00000000042f', '00000004-0000-4000-8000-000000000007', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80', 'Headset Gamer 7.1 Surround, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-000000000430', '00000004-0000-4000-8000-000000000007', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80', 'Headset Gamer 7.1 Surround, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-000000000438', '00000004-0000-4000-8000-000000000008', 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=900&q=80', 'Teclado Mecânico RGB Switch Red', 1, default),
  ('00000009-0000-4000-8000-000000000439', '00000004-0000-4000-8000-000000000008', 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=900&q=80', 'Teclado Mecânico RGB Switch Red, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-00000000043a', '00000004-0000-4000-8000-000000000008', 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=900&q=80', 'Teclado Mecânico RGB Switch Red, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-000000000442', '00000004-0000-4000-8000-000000000009', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80', 'Xbox Series S · 512 GB', 1, default),
  ('00000009-0000-4000-8000-000000000443', '00000004-0000-4000-8000-000000000009', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80', 'Xbox Series S · 512 GB, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-000000000444', '00000004-0000-4000-8000-000000000009', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80', 'Xbox Series S · 512 GB, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-00000000044c', '00000004-0000-4000-8000-00000000000a', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80', 'Nintendo Switch Lite', 1, default),
  ('00000009-0000-4000-8000-00000000044d', '00000004-0000-4000-8000-00000000000a', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80', 'Nintendo Switch Lite, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-00000000044e', '00000004-0000-4000-8000-00000000000a', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80', 'Nintendo Switch Lite, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-000000000456', '00000004-0000-4000-8000-00000000000b', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80', 'PlayStation 4 Pro · 1 TB', 1, default),
  ('00000009-0000-4000-8000-000000000457', '00000004-0000-4000-8000-00000000000b', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80', 'PlayStation 4 Pro · 1 TB, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-000000000458', '00000004-0000-4000-8000-00000000000b', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80', 'PlayStation 4 Pro · 1 TB, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-000000000460', '00000004-0000-4000-8000-00000000000c', 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=80', 'Controle Pro Switch', 1, default),
  ('00000009-0000-4000-8000-000000000461', '00000004-0000-4000-8000-00000000000c', 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=80', 'Controle Pro Switch, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-000000000462', '00000004-0000-4000-8000-00000000000c', 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=80', 'Controle Pro Switch, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-00000000046a', '00000004-0000-4000-8000-00000000000d', 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=900&q=80', 'Mouse Gamer 8000 DPI', 1, default),
  ('00000009-0000-4000-8000-00000000046b', '00000004-0000-4000-8000-00000000000d', 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=900&q=80', 'Mouse Gamer 8000 DPI, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-00000000046c', '00000004-0000-4000-8000-00000000000d', 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=900&q=80', 'Mouse Gamer 8000 DPI, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-000000000474', '00000004-0000-4000-8000-00000000000e', 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=900&q=80', 'Monitor Gamer 27" 165 Hz', 1, default),
  ('00000009-0000-4000-8000-000000000475', '00000004-0000-4000-8000-00000000000e', 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=900&q=80', 'Monitor Gamer 27" 165 Hz, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-000000000476', '00000004-0000-4000-8000-00000000000e', 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=900&q=80', 'Monitor Gamer 27" 165 Hz, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-00000000047e', '00000004-0000-4000-8000-00000000000f', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80', 'SSD NVMe 1 TB', 1, default),
  ('00000009-0000-4000-8000-00000000047f', '00000004-0000-4000-8000-00000000000f', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80', 'SSD NVMe 1 TB, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-000000000480', '00000004-0000-4000-8000-00000000000f', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80', 'SSD NVMe 1 TB, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-000000000488', '00000004-0000-4000-8000-000000000010', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80', 'Placa de Vídeo RTX 4060 8 GB', 1, default),
  ('00000009-0000-4000-8000-000000000489', '00000004-0000-4000-8000-000000000010', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80', 'Placa de Vídeo RTX 4060 8 GB, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-00000000048a', '00000004-0000-4000-8000-000000000010', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80', 'Placa de Vídeo RTX 4060 8 GB, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-000000000492', '00000004-0000-4000-8000-000000000011', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Mega Drive com 2 Controles', 1, default),
  ('00000009-0000-4000-8000-000000000493', '00000004-0000-4000-8000-000000000011', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Mega Drive com 2 Controles, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-000000000494', '00000004-0000-4000-8000-000000000011', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Mega Drive com 2 Controles, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-00000000049c', '00000004-0000-4000-8000-000000000012', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Super Nintendo com 2 Controles', 1, default),
  ('00000009-0000-4000-8000-00000000049d', '00000004-0000-4000-8000-000000000012', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Super Nintendo com 2 Controles, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-00000000049e', '00000004-0000-4000-8000-000000000012', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Super Nintendo com 2 Controles, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-0000000004a6', '00000004-0000-4000-8000-000000000013', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Cartucho Super Mario World', 1, default),
  ('00000009-0000-4000-8000-0000000004a7', '00000004-0000-4000-8000-000000000013', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Cartucho Super Mario World, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-0000000004a8', '00000004-0000-4000-8000-000000000013', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Cartucho Super Mario World, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-0000000004b0', '00000004-0000-4000-8000-000000000014', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80', 'Notebook 15" Core i5 · 16 GB', 1, default),
  ('00000009-0000-4000-8000-0000000004b1', '00000004-0000-4000-8000-000000000014', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80', 'Notebook 15" Core i5 · 16 GB, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-0000000004b2', '00000004-0000-4000-8000-000000000014', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80', 'Notebook 15" Core i5 · 16 GB, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-0000000004ba', '00000004-0000-4000-8000-000000000015', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80', 'Notebook Core i7 Seminovo · 16 GB', 1, default),
  ('00000009-0000-4000-8000-0000000004bb', '00000004-0000-4000-8000-000000000015', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80', 'Notebook Core i7 Seminovo · 16 GB, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-0000000004bc', '00000004-0000-4000-8000-000000000015', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80', 'Notebook Core i7 Seminovo · 16 GB, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-0000000004c4', '00000004-0000-4000-8000-000000000016', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80', 'PlayStation 5 Pro · 2 TB', 1, default),
  ('00000009-0000-4000-8000-0000000004c5', '00000004-0000-4000-8000-000000000016', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80', 'PlayStation 5 Pro · 2 TB, detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-0000000004c6', '00000004-0000-4000-8000-000000000016', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80', 'PlayStation 5 Pro · 2 TB, vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-0000000004ce', '00000004-0000-4000-8000-000000000017', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80', 'Fone Gamer sem fio (rascunho)', 1, default),
  ('00000009-0000-4000-8000-0000000004cf', '00000004-0000-4000-8000-000000000017', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80', 'Fone Gamer sem fio (rascunho), detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-0000000004d0', '00000004-0000-4000-8000-000000000017', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80', 'Fone Gamer sem fio (rascunho), vista lateral', 3, '85% 70%'),
  ('00000009-0000-4000-8000-0000000004d8', '00000004-0000-4000-8000-000000000018', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Console antigo (arquivado)', 1, default),
  ('00000009-0000-4000-8000-0000000004d9', '00000004-0000-4000-8000-000000000018', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Console antigo (arquivado), detalhe', 2, '20% 30%'),
  ('00000009-0000-4000-8000-0000000004da', '00000004-0000-4000-8000-000000000018', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 'Console antigo (arquivado), vista lateral', 3, '85% 70%');
insert into product_facets (product_id, facet_key, facet_value) values
  ('00000004-0000-4000-8000-000000000001', 'platform', 'PlayStation'),
  ('00000004-0000-4000-8000-000000000001', 'type', 'Console'),
  ('00000004-0000-4000-8000-000000000001', 'brand', 'Sony'),
  ('00000004-0000-4000-8000-000000000001', 'storage', '1 TB'),
  ('00000004-0000-4000-8000-000000000002', 'platform', 'Nintendo'),
  ('00000004-0000-4000-8000-000000000002', 'type', 'Console'),
  ('00000004-0000-4000-8000-000000000002', 'brand', 'Nintendo'),
  ('00000004-0000-4000-8000-000000000002', 'storage', '64 GB'),
  ('00000004-0000-4000-8000-000000000003', 'platform', 'PlayStation'),
  ('00000004-0000-4000-8000-000000000003', 'type', 'Acessório'),
  ('00000004-0000-4000-8000-000000000003', 'brand', 'Sony'),
  ('00000004-0000-4000-8000-000000000004', 'platform', 'Windows'),
  ('00000004-0000-4000-8000-000000000004', 'type', 'Notebook'),
  ('00000004-0000-4000-8000-000000000004', 'brand', 'Gamer'),
  ('00000004-0000-4000-8000-000000000004', 'gpu', 'NVIDIA GeForce RTX 4060'),
  ('00000004-0000-4000-8000-000000000004', 'ram', '16 GB'),
  ('00000004-0000-4000-8000-000000000005', 'platform', 'Windows'),
  ('00000004-0000-4000-8000-000000000005', 'type', 'PC completo'),
  ('00000004-0000-4000-8000-000000000005', 'brand', 'Gamer'),
  ('00000004-0000-4000-8000-000000000005', 'cpu', 'Ryzen 7'),
  ('00000004-0000-4000-8000-000000000005', 'gpu', 'NVIDIA GeForce RTX 4070'),
  ('00000004-0000-4000-8000-000000000005', 'ram', '32 GB'),
  ('00000004-0000-4000-8000-000000000006', 'platform', 'Retro'),
  ('00000004-0000-4000-8000-000000000006', 'type', 'Console'),
  ('00000004-0000-4000-8000-000000000006', 'brand', 'Retrô'),
  ('00000004-0000-4000-8000-000000000007', 'platform', 'Multiplataforma'),
  ('00000004-0000-4000-8000-000000000007', 'type', 'Periférico'),
  ('00000004-0000-4000-8000-000000000007', 'brand', 'Gamer'),
  ('00000004-0000-4000-8000-000000000008', 'platform', 'Windows'),
  ('00000004-0000-4000-8000-000000000008', 'type', 'Periférico'),
  ('00000004-0000-4000-8000-000000000008', 'brand', 'Gamer'),
  ('00000004-0000-4000-8000-000000000009', 'platform', 'Xbox'),
  ('00000004-0000-4000-8000-000000000009', 'type', 'Console'),
  ('00000004-0000-4000-8000-000000000009', 'brand', 'Microsoft'),
  ('00000004-0000-4000-8000-000000000009', 'storage', '512 GB'),
  ('00000004-0000-4000-8000-00000000000a', 'platform', 'Nintendo'),
  ('00000004-0000-4000-8000-00000000000a', 'type', 'Console'),
  ('00000004-0000-4000-8000-00000000000a', 'brand', 'Nintendo'),
  ('00000004-0000-4000-8000-00000000000b', 'platform', 'PlayStation'),
  ('00000004-0000-4000-8000-00000000000b', 'type', 'Console'),
  ('00000004-0000-4000-8000-00000000000b', 'brand', 'Sony'),
  ('00000004-0000-4000-8000-00000000000b', 'storage', '1 TB'),
  ('00000004-0000-4000-8000-00000000000c', 'platform', 'Nintendo'),
  ('00000004-0000-4000-8000-00000000000c', 'type', 'Acessório'),
  ('00000004-0000-4000-8000-00000000000c', 'brand', 'Nintendo'),
  ('00000004-0000-4000-8000-00000000000d', 'platform', 'Windows'),
  ('00000004-0000-4000-8000-00000000000d', 'type', 'Periférico'),
  ('00000004-0000-4000-8000-00000000000d', 'brand', 'Gamer'),
  ('00000004-0000-4000-8000-00000000000e', 'platform', 'Windows'),
  ('00000004-0000-4000-8000-00000000000e', 'type', 'Periférico'),
  ('00000004-0000-4000-8000-00000000000e', 'brand', 'Gamer'),
  ('00000004-0000-4000-8000-00000000000f', 'platform', 'Windows'),
  ('00000004-0000-4000-8000-00000000000f', 'type', 'Componente'),
  ('00000004-0000-4000-8000-00000000000f', 'brand', 'Gamer'),
  ('00000004-0000-4000-8000-00000000000f', 'storage', '1 TB'),
  ('00000004-0000-4000-8000-000000000010', 'platform', 'Windows'),
  ('00000004-0000-4000-8000-000000000010', 'type', 'Componente'),
  ('00000004-0000-4000-8000-000000000010', 'brand', 'Gamer'),
  ('00000004-0000-4000-8000-000000000010', 'gpu', 'NVIDIA GeForce RTX 4060'),
  ('00000004-0000-4000-8000-000000000011', 'platform', 'Retro'),
  ('00000004-0000-4000-8000-000000000011', 'type', 'Console'),
  ('00000004-0000-4000-8000-000000000011', 'brand', 'Sega'),
  ('00000004-0000-4000-8000-000000000012', 'platform', 'Retro'),
  ('00000004-0000-4000-8000-000000000012', 'type', 'Console'),
  ('00000004-0000-4000-8000-000000000012', 'brand', 'Nintendo'),
  ('00000004-0000-4000-8000-000000000013', 'platform', 'Retro'),
  ('00000004-0000-4000-8000-000000000013', 'type', 'Jogo'),
  ('00000004-0000-4000-8000-000000000013', 'brand', 'Nintendo'),
  ('00000004-0000-4000-8000-000000000014', 'platform', 'Windows'),
  ('00000004-0000-4000-8000-000000000014', 'type', 'Notebook'),
  ('00000004-0000-4000-8000-000000000014', 'brand', 'Office'),
  ('00000004-0000-4000-8000-000000000014', 'cpu', 'Core i5'),
  ('00000004-0000-4000-8000-000000000014', 'ram', '16 GB'),
  ('00000004-0000-4000-8000-000000000015', 'platform', 'Windows'),
  ('00000004-0000-4000-8000-000000000015', 'type', 'Notebook'),
  ('00000004-0000-4000-8000-000000000015', 'brand', 'Office'),
  ('00000004-0000-4000-8000-000000000015', 'cpu', 'Core i7'),
  ('00000004-0000-4000-8000-000000000015', 'ram', '16 GB'),
  ('00000004-0000-4000-8000-000000000016', 'platform', 'PlayStation'),
  ('00000004-0000-4000-8000-000000000016', 'type', 'Console'),
  ('00000004-0000-4000-8000-000000000016', 'brand', 'Sony'),
  ('00000004-0000-4000-8000-000000000016', 'storage', '2 TB'),
  ('00000004-0000-4000-8000-000000000017', 'platform', 'Windows'),
  ('00000004-0000-4000-8000-000000000017', 'type', 'Periférico'),
  ('00000004-0000-4000-8000-000000000018', 'platform', 'Retro'),
  ('00000004-0000-4000-8000-000000000018', 'type', 'Console');
insert into product_options (id, product_id, code, name, position) values
  ('00000012-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000001', 'color', 'Cor', 0),
  ('00000012-0000-4000-8000-000000000002', '00000004-0000-4000-8000-000000000001', 'storage', 'Armazenamento', 1),
  ('00000012-0000-4000-8000-000000000003', '00000004-0000-4000-8000-000000000002', 'color', 'Cor', 0);
insert into product_option_values (id, option_id, label, position) values
  ('00000013-0000-4000-8000-00000000000a', '00000012-0000-4000-8000-000000000001', 'Branco', 0),
  ('00000013-0000-4000-8000-00000000000b', '00000012-0000-4000-8000-000000000001', 'Preto', 1),
  ('00000013-0000-4000-8000-000000000014', '00000012-0000-4000-8000-000000000002', '1 TB', 0),
  ('00000013-0000-4000-8000-00000000001e', '00000012-0000-4000-8000-000000000003', 'Branco', 0),
  ('00000013-0000-4000-8000-00000000001f', '00000012-0000-4000-8000-000000000003', 'Neon azul e vermelho', 1);
insert into product_variants (id, product_id, sku, option_values, price, compare_at, max_installments, weight_grams, width_mm, height_mm, length_mm) values
  ('00000005-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000001', 'DB-PS5-01-BR', '{"color":"Branco","storage":"1 TB"}'::jsonb, 3899, 4299, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000002', '00000004-0000-4000-8000-000000000001', 'DB-PS5-01-PT', '{"color":"Preto","storage":"1 TB"}'::jsonb, 3899, 4299, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000003', '00000004-0000-4000-8000-000000000002', 'DB-SWO-02-BR', '{"color":"Branco"}'::jsonb, 2149.9, 2399, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000004', '00000004-0000-4000-8000-000000000002', 'DB-SWO-02-NE', '{"color":"Neon azul e vermelho"}'::jsonb, 2149.9, 2399, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000005', '00000004-0000-4000-8000-000000000003', 'DB-DU-03-U1', '{}'::jsonb, 449, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000006', '00000004-0000-4000-8000-000000000004', 'DB-NB-04-U', '{}'::jsonb, 5799, 6499, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000007', '00000004-0000-4000-8000-000000000005', 'DB-PC-05-U', '{}'::jsonb, 7499, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000008', '00000004-0000-4000-8000-000000000006', 'DB-RT-06-U', '{}'::jsonb, 329, 399, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000009', '00000004-0000-4000-8000-000000000007', 'DB-HS-07-U', '{}'::jsonb, 399, 499, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-00000000000a', '00000004-0000-4000-8000-000000000008', 'DB-KB-08-U', '{}'::jsonb, 349, 429, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-00000000000b', '00000004-0000-4000-8000-000000000009', 'DB-XB-09-U', '{}'::jsonb, 2299, 2499, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-00000000000c', '00000004-0000-4000-8000-00000000000a', 'DB-SWL-10-U', '{}'::jsonb, 1499, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-00000000000d', '00000004-0000-4000-8000-00000000000b', 'DB-PS4-11-U1', '{}'::jsonb, 1599, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-00000000000e', '00000004-0000-4000-8000-00000000000c', 'DB-PRO-12-U', '{}'::jsonb, 399, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-00000000000f', '00000004-0000-4000-8000-00000000000d', 'DB-MS-13-U', '{}'::jsonb, 169, 199, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000010', '00000004-0000-4000-8000-00000000000e', 'DB-MN-14-U', '{}'::jsonb, 1399, 1599, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000011', '00000004-0000-4000-8000-00000000000f', 'DB-SSD-15-U', '{}'::jsonb, 449, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000012', '00000004-0000-4000-8000-000000000010', 'DB-GPU-16-U', '{}'::jsonb, 2199, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000013', '00000004-0000-4000-8000-000000000011', 'DB-MD-17-U1', '{}'::jsonb, 899, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000014', '00000004-0000-4000-8000-000000000012', 'DB-SN-18-U1', '{}'::jsonb, 1099, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000015', '00000004-0000-4000-8000-000000000013', 'DB-CT-19-U1', '{}'::jsonb, 349, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000016', '00000004-0000-4000-8000-000000000014', 'DB-NB-20-U', '{}'::jsonb, 3299, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000017', '00000004-0000-4000-8000-000000000015', 'DB-NB-21-U1', '{}'::jsonb, 3999, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000018', '00000004-0000-4000-8000-000000000016', 'DB-PS5P-22-U', '{}'::jsonb, 7299, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-000000000019', '00000004-0000-4000-8000-000000000017', 'DB-DRAFT-23-U', '{}'::jsonb, 599, null, 10, 800, 300, 120, 400),
  ('00000005-0000-4000-8000-00000000001a', '00000004-0000-4000-8000-000000000018', 'DB-OLD-24-U', '{}'::jsonb, 500, null, 10, 800, 300, 120, 400);
insert into collection_products (collection_id, product_id, position) values
  ('00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000001', 0),
  ('00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000002', 1),
  ('00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000004', 2),
  ('00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000006', 3),
  ('00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000007', 4),
  ('00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000008', 5),
  ('00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000009', 6),
  ('00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-00000000000d', 7),
  ('00000003-0000-4000-8000-000000000001', '00000004-0000-4000-8000-00000000000e', 8),
  ('00000003-0000-4000-8000-000000000002', '00000004-0000-4000-8000-000000000009', 0),
  ('00000003-0000-4000-8000-000000000002', '00000004-0000-4000-8000-00000000000a', 1),
  ('00000003-0000-4000-8000-000000000002', '00000004-0000-4000-8000-000000000016', 2),
  ('00000003-0000-4000-8000-000000000003', '00000004-0000-4000-8000-000000000003', 0),
  ('00000003-0000-4000-8000-000000000003', '00000004-0000-4000-8000-00000000000b', 1),
  ('00000003-0000-4000-8000-000000000003', '00000004-0000-4000-8000-000000000012', 2),
  ('00000003-0000-4000-8000-000000000003', '00000004-0000-4000-8000-000000000015', 3),
  ('00000003-0000-4000-8000-000000000004', '00000004-0000-4000-8000-000000000011', 0),
  ('00000003-0000-4000-8000-000000000004', '00000004-0000-4000-8000-000000000013', 1),
  ('00000003-0000-4000-8000-000000000005', '00000004-0000-4000-8000-000000000001', 0),
  ('00000003-0000-4000-8000-000000000005', '00000004-0000-4000-8000-000000000002', 1),
  ('00000003-0000-4000-8000-000000000005', '00000004-0000-4000-8000-000000000004', 2),
  ('00000003-0000-4000-8000-000000000005', '00000004-0000-4000-8000-000000000005', 3),
  ('00000003-0000-4000-8000-000000000005', '00000004-0000-4000-8000-000000000006', 4);
insert into kits (id, base_product_id, name, status) values
  ('00000014-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000001', 'Kit PS5 + controle extra', 'draft');
insert into kit_components (kit_id, product_id, slot, is_required, extra_price) values
  ('00000014-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000003', 'controle', false, 0);

-- ----------------------------------------------------------------------
-- Estoque: saldos, unidades únicas e movimentações
-- ----------------------------------------------------------------------
insert into inventory_units (id, product_id, variant_id, location_id, serial, status, grade, report, photos, warranty_days, cost, acquired_at) values
  ('00000007-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000003', '00000005-0000-4000-8000-000000000005', '00000006-0000-4000-8000-000000000001', 'SN-DEMO-DU-0001', 'disponivel', 'Muito bom', '{"summary":"Poucos sinais de uso, tudo funcionando.","tested":["Botões e direcional","Gatilhos adaptáveis","Analógicos","Bateria","Conexão Bluetooth e USB"],"included":["Controle","Cabo USB-C"],"knownMarks":["Pequenas marcas de uso na parte traseira, visíveis nas fotos"]}'::jsonb, '[{"url":"https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=80","alt":"Controle DualSense · Branco, foto da unidade 1"},{"url":"https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=80","alt":"Controle DualSense · Branco, foto da unidade 2"}]'::jsonb, 90, 260, now() - interval '41 days'),
  ('00000007-0000-4000-8000-000000000002', '00000004-0000-4000-8000-00000000000b', '00000005-0000-4000-8000-00000000000d', '00000006-0000-4000-8000-000000000001', 'SN-DEMO-PS4-0001', 'disponivel', 'Bom', '{"summary":"Funcionamento perfeito, marcas de uso na carcaça.","tested":["Leitor de disco","HDMI","Rede","Disco rígido"],"included":["Console","Controle","Cabo HDMI","Cabo de energia"],"knownMarks":["Riscos leves na parte superior"]}'::jsonb, '[{"url":"https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80","alt":"PlayStation 4 Pro · 1 TB, foto da unidade 1"},{"url":"https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80","alt":"PlayStation 4 Pro · 1 TB, foto da unidade 2"}]'::jsonb, 90, 900, now() - interval '42 days'),
  ('00000007-0000-4000-8000-000000000003', '00000004-0000-4000-8000-000000000011', '00000005-0000-4000-8000-000000000013', '00000006-0000-4000-8000-000000000001', 'SN-DEMO-MD-0001', 'disponivel', 'Bom', '{"summary":"Console de coleção funcionando, com marcas do tempo.","tested":["Imagem","Som","Controles"],"included":["Console","2 controles","Cabos"],"knownMarks":["Amarelamento leve da carcaça"]}'::jsonb, '[{"url":"https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80","alt":"Mega Drive com 2 Controles, foto da unidade 1"},{"url":"https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80","alt":"Mega Drive com 2 Controles, foto da unidade 2"}]'::jsonb, 90, 450, now() - interval '43 days'),
  ('00000007-0000-4000-8000-000000000004', '00000004-0000-4000-8000-000000000012', '00000005-0000-4000-8000-000000000014', '00000006-0000-4000-8000-000000000001', 'SN-DEMO-SN-0001', 'vendido', 'Muito bom', '{"summary":"Console revisado e limpo.","tested":["Imagem","Som","Controles","Slot de cartucho"],"included":["Console","2 controles","Cabos"],"knownMarks":["Sem marcas relevantes"]}'::jsonb, '[{"url":"https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80","alt":"Super Nintendo com 2 Controles, foto da unidade 1"},{"url":"https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80","alt":"Super Nintendo com 2 Controles, foto da unidade 2"}]'::jsonb, 90, 600, now() - interval '44 days'),
  ('00000007-0000-4000-8000-000000000005', '00000004-0000-4000-8000-000000000013', '00000005-0000-4000-8000-000000000015', '00000006-0000-4000-8000-000000000001', 'SN-DEMO-CT-0001', 'disponivel', 'Bom', '{"summary":"Cartucho original testado.","tested":["Leitura","Save"],"included":["Cartucho"],"knownMarks":["Etiqueta com desgaste leve"]}'::jsonb, '[{"url":"https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80","alt":"Cartucho Super Mario World, foto da unidade 1"},{"url":"https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80","alt":"Cartucho Super Mario World, foto da unidade 2"}]'::jsonb, 90, 180, now() - interval '45 days'),
  ('00000007-0000-4000-8000-000000000006', '00000004-0000-4000-8000-000000000015', '00000005-0000-4000-8000-000000000017', '00000006-0000-4000-8000-000000000001', 'SN-DEMO-NB-0001', 'disponivel', 'Muito bom', '{"summary":"Revisado, bateria saudável.","tested":["Tela","Teclado","Bateria","Portas"],"included":["Notebook","Carregador"],"knownMarks":["Marcas leves na tampa"]}'::jsonb, '[{"url":"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80","alt":"Notebook Core i7 Seminovo · 16 GB, foto da unidade 1"},{"url":"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80","alt":"Notebook Core i7 Seminovo · 16 GB, foto da unidade 2"}]'::jsonb, 90, 2300, now() - interval '46 days');
insert into inventory_levels (variant_id, location_id, on_hand, reserved, min_level) values
  ('00000005-0000-4000-8000-000000000001', '00000006-0000-4000-8000-000000000001', 4, 1, 5),
  ('00000005-0000-4000-8000-000000000002', '00000006-0000-4000-8000-000000000001', 0, 0, 2),
  ('00000005-0000-4000-8000-000000000003', '00000006-0000-4000-8000-000000000001', 3, 0, 4),
  ('00000005-0000-4000-8000-000000000004', '00000006-0000-4000-8000-000000000001', 2, 0, 2),
  ('00000005-0000-4000-8000-000000000006', '00000006-0000-4000-8000-000000000001', 6, 0, 2),
  ('00000005-0000-4000-8000-000000000007', '00000006-0000-4000-8000-000000000001', 3, 0, 1),
  ('00000005-0000-4000-8000-000000000008', '00000006-0000-4000-8000-000000000001', 14, 0, 4),
  ('00000005-0000-4000-8000-000000000009', '00000006-0000-4000-8000-000000000001', 11, 0, 3),
  ('00000005-0000-4000-8000-00000000000a', '00000006-0000-4000-8000-000000000001', 9, 0, 3),
  ('00000005-0000-4000-8000-00000000000b', '00000006-0000-4000-8000-000000000001', 5, 0, 2),
  ('00000005-0000-4000-8000-00000000000c', '00000006-0000-4000-8000-000000000001', 7, 0, 2),
  ('00000005-0000-4000-8000-00000000000e', '00000006-0000-4000-8000-000000000001', 8, 0, 3),
  ('00000005-0000-4000-8000-00000000000f', '00000006-0000-4000-8000-000000000001', 20, 0, 5),
  ('00000005-0000-4000-8000-000000000010', '00000006-0000-4000-8000-000000000001', 6, 0, 2),
  ('00000005-0000-4000-8000-000000000011', '00000006-0000-4000-8000-000000000001', 18, 0, 5),
  ('00000005-0000-4000-8000-000000000012', '00000006-0000-4000-8000-000000000001', 4, 0, 2),
  ('00000005-0000-4000-8000-000000000016', '00000006-0000-4000-8000-000000000001', 8, 0, 2),
  ('00000005-0000-4000-8000-000000000018', '00000006-0000-4000-8000-000000000001', 0, 0, 0),
  ('00000005-0000-4000-8000-000000000019', '00000006-0000-4000-8000-000000000001', 0, 0, 0),
  ('00000005-0000-4000-8000-00000000001a', '00000006-0000-4000-8000-000000000001', 0, 0, 0);

-- ----------------------------------------------------------------------
-- Cupons, promoções e pedidos de teste
-- ----------------------------------------------------------------------
insert into coupons (id, code, kind, value, min_subtotal, max_uses, max_uses_per_user, starts_at, ends_at, is_active) values
  ('0000000b-0000-4000-8000-000000000001', 'DINO10', 'percent', 10, 0, 100, 1, now() - interval '10 days', now() + interval '60 days', true),
  ('0000000b-0000-4000-8000-000000000002', 'BEMVINDO50', 'amount', 50, 500, null, 1, null, null, true),
  ('0000000b-0000-4000-8000-000000000003', 'EXPIRADO', 'percent', 15, 0, null, 1, now() - interval '40 days', now() - interval '5 days', true),
  ('0000000b-0000-4000-8000-000000000004', 'LIMITE1', 'percent', 5, 0, 1, 1, null, null, true);
insert into promotions (id, name, kind, value, scope, starts_at, ends_at, status, show_countdown, collection_id, category_id) values
  ('0000000c-0000-4000-8000-000000000001', 'Flash Drop de novembro', 'percent', 10, 'products', now() - interval '1 hour', now() + interval '6 hours', 'published', true, default, default),
  ('0000000c-0000-4000-8000-000000000002', 'Oferta Retro (rascunho)', 'percent', 10, 'collection', now() + interval '2 days', now() + interval '12 days', 'draft', false, '00000003-0000-4000-8000-000000000004', default),
  ('0000000c-0000-4000-8000-000000000003', 'Semana Gamer (encerrada)', 'percent', 5, 'category', now() - interval '20 days', now() - interval '10 days', 'published', false, default, '00000002-0000-4000-8000-000000000002');
insert into promotion_products (promotion_id, product_id) values
  ('0000000c-0000-4000-8000-000000000001', '00000004-0000-4000-8000-00000000000d'),
  ('0000000c-0000-4000-8000-000000000001', '00000004-0000-4000-8000-00000000000e'),
  ('0000000c-0000-4000-8000-000000000001', '00000004-0000-4000-8000-00000000000f');
insert into orders (id, number, user_id, guest_email, status, coupon_id, subtotal, discount_total, shipping_total, total, shipping_address, shipping_method, shipping_eta_days, placed_at, paid_at, cancelled_at, cancel_reason) values
  ('00000008-0000-4000-8000-000000000001', 'DB-1001', '00000001-0000-4000-8000-00000000000b', null, 'delivered', null, 2548.9, 0, 24.9, 2573.8, '{"recipient":"Ana Cliente (teste)","cep":"72510000","street":"Quadra 101 Conjunto A","number":"10","complement":"Casa 1","district":"Santa Maria","city":"Brasília","state":"DF"}'::jsonb, 'SEDEX', 3, now() - interval '14 days', now() - interval '14 days', null, null),
  ('00000008-0000-4000-8000-000000000002', 'DB-1002', '00000001-0000-4000-8000-00000000000c', null, 'shipped', null, 5799, 0, 14.9, 5813.9, '{"recipient":"Bruno Cliente (teste)","cep":"72515000","street":"Quadra 205 Conjunto B","number":"22","complement":null,"district":"Santa Maria","city":"Brasília","state":"DF"}'::jsonb, 'Entrega local', 2, now() - interval '3 days', now() - interval '3 days', null, null),
  ('00000008-0000-4000-8000-000000000003', 'DB-1003', '00000001-0000-4000-8000-00000000000d', null, 'preparing', null, 687, 0, 38.5, 725.5, '{"recipient":"Carla Cliente (teste)","cep":"01310100","street":"Avenida Exemplo","number":"1000","complement":"Apto 12","district":"Bela Vista","city":"São Paulo","state":"SP"}'::jsonb, 'Econômica', 7, now() - interval '1 day', now() - interval '1 day', null, null),
  ('00000008-0000-4000-8000-000000000004', 'DB-1004', '00000001-0000-4000-8000-00000000000b', null, 'paid', null, 1399, 0, 0, 1399, '{"recipient":"Ana Cliente (teste)","cep":"72510000","street":"Quadra 101 Conjunto A","number":"10","complement":"Casa 1","district":"Santa Maria","city":"Brasília","state":"DF"}'::jsonb, 'Retirada na loja', 0, now() - interval '3 hours', now() - interval '3 hours', null, null),
  ('00000008-0000-4000-8000-000000000005', 'DB-1005', '00000001-0000-4000-8000-00000000000e', null, 'pending_payment', null, 3899, 0, 52.3, 3951.3, '{"recipient":"Diego Cliente (teste)","cep":"22041001","street":"Rua Imaginária","number":"300","complement":null,"district":"Copacabana","city":"Rio de Janeiro","state":"RJ"}'::jsonb, 'Expressa', 4, now() - interval '10 minutes', null, null, null),
  ('00000008-0000-4000-8000-000000000006', 'DB-1006', '00000001-0000-4000-8000-00000000000c', null, 'cancelled', null, 1499, 0, 14.9, 1513.9, '{"recipient":"Bruno Cliente (teste)","cep":"72515000","street":"Quadra 205 Conjunto B","number":"22","complement":null,"district":"Santa Maria","city":"Brasília","state":"DF"}'::jsonb, 'Entrega local', 2, now() - interval '5 days', null, now() - interval '5 days', 'Pagamento não confirmado no prazo'),
  ('00000008-0000-4000-8000-000000000007', 'DB-1007', null, 'visitante@teste.dinoblack.example', 'paid', null, 1099, 0, 0, 1099, '{"recipient":"Visitante Teste","cep":"70040010","street":"Quadra Fictícia","number":"1","complement":null,"district":"Asa Sul","city":"Brasília","state":"DF"}'::jsonb, 'Retirada na loja', 0, now() - interval '2 days', now() - interval '2 days', null, null),
  ('00000008-0000-4000-8000-000000000008', 'DB-1008', '00000001-0000-4000-8000-00000000000d', null, 'returned', null, 399, 0, 38.5, 437.5, '{"recipient":"Carla Cliente (teste)","cep":"01310100","street":"Avenida Exemplo","number":"1000","complement":"Apto 12","district":"Bela Vista","city":"São Paulo","state":"SP"}'::jsonb, 'Econômica', 7, now() - interval '12 days', now() - interval '12 days', null, null),
  ('00000008-0000-4000-8000-000000000009', 'DB-1009', '00000001-0000-4000-8000-00000000000e', null, 'delivered', '0000000b-0000-4000-8000-000000000001', 329, 32.9, 31.2, 327.3, '{"recipient":"Diego Cliente (teste)","cep":"22041001","street":"Rua Imaginária","number":"300","complement":null,"district":"Copacabana","city":"Rio de Janeiro","state":"RJ"}'::jsonb, 'PAC', 8, now() - interval '20 days', now() - interval '20 days', null, null),
  ('00000008-0000-4000-8000-00000000000a', 'DB-1010', '00000001-0000-4000-8000-00000000000c', null, 'paid', '0000000b-0000-4000-8000-000000000002', 2299, 50, 14.9, 2263.9, '{"recipient":"Bruno Cliente (teste)","cep":"72515000","street":"Quadra 205 Conjunto B","number":"22","complement":null,"district":"Santa Maria","city":"Brasília","state":"DF"}'::jsonb, 'Entrega local', 2, now() - interval '6 hours', now() - interval '6 hours', null, null);
insert into order_items (id, order_id, product_id, variant_id, unit_id, quantity, unit_price, snapshot) values
  ('00000009-0000-4000-8000-000000000001', '00000008-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000002', '00000005-0000-4000-8000-000000000003', null, 1, 2149.9, '{"name":"Nintendo Switch OLED","sku":"DB-SWO-02-BR","condition":"novo","options":{"color":"Branco"},"image":"https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80","warrantyMonths":12,"locationId":"00000006-0000-4000-8000-000000000001"}'::jsonb),
  ('00000009-0000-4000-8000-000000000002', '00000008-0000-4000-8000-000000000001', '00000004-0000-4000-8000-000000000007', '00000005-0000-4000-8000-000000000009', null, 1, 399, '{"name":"Headset Gamer 7.1 Surround","sku":"DB-HS-07-U","condition":"novo","options":{},"image":"https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80","warrantyMonths":12,"locationId":"00000006-0000-4000-8000-000000000001"}'::jsonb),
  ('00000009-0000-4000-8000-000000000003', '00000008-0000-4000-8000-000000000002', '00000004-0000-4000-8000-000000000004', '00000005-0000-4000-8000-000000000006', null, 1, 5799, '{"name":"Notebook Gamer RTX 4060 · 16GB","sku":"DB-NB-04-U","condition":"novo","options":{},"image":"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80","warrantyMonths":12,"locationId":"00000006-0000-4000-8000-000000000001"}'::jsonb),
  ('00000009-0000-4000-8000-000000000004', '00000008-0000-4000-8000-000000000003', '00000004-0000-4000-8000-00000000000d', '00000005-0000-4000-8000-00000000000f', null, 2, 169, '{"name":"Mouse Gamer 8000 DPI","sku":"DB-MS-13-U","condition":"novo","options":{},"image":"https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=900&q=80","warrantyMonths":12,"locationId":"00000006-0000-4000-8000-000000000001"}'::jsonb),
  ('00000009-0000-4000-8000-000000000005', '00000008-0000-4000-8000-000000000003', '00000004-0000-4000-8000-000000000008', '00000005-0000-4000-8000-00000000000a', null, 1, 349, '{"name":"Teclado Mecânico RGB Switch Red","sku":"DB-KB-08-U","condition":"novo","options":{},"image":"https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=900&q=80","warrantyMonths":12,"locationId":"00000006-0000-4000-8000-000000000001"}'::jsonb),
  ('00000009-0000-4000-8000-000000000006', '00000008-0000-4000-8000-000000000004', '00000004-0000-4000-8000-00000000000e', '00000005-0000-4000-8000-000000000010', null, 1, 1399, '{"name":"Monitor Gamer 27\" 165 Hz","sku":"DB-MN-14-U","condition":"novo","options":{},"image":"https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=900&q=80","warrantyMonths":12,"locationId":"00000006-0000-4000-8000-000000000001"}'::jsonb),
  ('00000009-0000-4000-8000-000000000007', '00000008-0000-4000-8000-000000000005', '00000004-0000-4000-8000-000000000001', '00000005-0000-4000-8000-000000000001', null, 1, 3899, '{"name":"PlayStation 5 Slim · 1 TB","sku":"DB-PS5-01-BR","condition":"novo","options":{"color":"Branco","storage":"1 TB"},"image":"https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80","warrantyMonths":12,"locationId":"00000006-0000-4000-8000-000000000001"}'::jsonb),
  ('00000009-0000-4000-8000-000000000008', '00000008-0000-4000-8000-000000000006', '00000004-0000-4000-8000-00000000000a', '00000005-0000-4000-8000-00000000000c', null, 1, 1499, '{"name":"Nintendo Switch Lite","sku":"DB-SWL-10-U","condition":"novo","options":{},"image":"https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80","warrantyMonths":12,"locationId":"00000006-0000-4000-8000-000000000001"}'::jsonb),
  ('00000009-0000-4000-8000-000000000009', '00000008-0000-4000-8000-000000000007', '00000004-0000-4000-8000-000000000012', '00000005-0000-4000-8000-000000000014', '00000007-0000-4000-8000-000000000004', 1, 1099, '{"name":"Super Nintendo com 2 Controles","sku":"DB-SN-18-U1","condition":"seminovo","options":{},"image":"https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80","warrantyMonths":3,"grade":"Muito bom"}'::jsonb),
  ('00000009-0000-4000-8000-00000000000a', '00000008-0000-4000-8000-000000000008', '00000004-0000-4000-8000-000000000007', '00000005-0000-4000-8000-000000000009', null, 1, 399, '{"name":"Headset Gamer 7.1 Surround","sku":"DB-HS-07-U","condition":"novo","options":{},"image":"https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80","warrantyMonths":12,"locationId":"00000006-0000-4000-8000-000000000001"}'::jsonb),
  ('00000009-0000-4000-8000-00000000000b', '00000008-0000-4000-8000-000000000009', '00000004-0000-4000-8000-000000000006', '00000005-0000-4000-8000-000000000008', null, 1, 329, '{"name":"Console Retrô Mini · 10.000 jogos","sku":"DB-RT-06-U","condition":"novo","options":{},"image":"https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80","warrantyMonths":12,"locationId":"00000006-0000-4000-8000-000000000001"}'::jsonb),
  ('00000009-0000-4000-8000-00000000000c', '00000008-0000-4000-8000-00000000000a', '00000004-0000-4000-8000-000000000009', '00000005-0000-4000-8000-00000000000b', null, 1, 2299, '{"name":"Xbox Series S · 512 GB","sku":"DB-XB-09-U","condition":"novo","options":{},"image":"https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80","warrantyMonths":12,"locationId":"00000006-0000-4000-8000-000000000001"}'::jsonb);
insert into payments (id, order_id, method, status, amount, installments, provider, provider_ref, pix_expires_at, paid_at) values
  ('00000015-0000-4000-8000-000000000001', '00000008-0000-4000-8000-000000000001', 'credit_card', 'paid', 2573.8, 3, 'mock', 'MOCK-PAY-1', null, now() - interval '14 days'),
  ('00000015-0000-4000-8000-000000000002', '00000008-0000-4000-8000-000000000002', 'pix', 'paid', 5813.9, 1, 'mock', 'MOCK-PAY-2', now() - interval '3 days' + interval '30 minutes', now() - interval '3 days'),
  ('00000015-0000-4000-8000-000000000003', '00000008-0000-4000-8000-000000000003', 'pix', 'paid', 725.5, 1, 'mock', 'MOCK-PAY-3', now() - interval '1 day' + interval '30 minutes', now() - interval '1 day'),
  ('00000015-0000-4000-8000-000000000004', '00000008-0000-4000-8000-000000000004', 'pix', 'paid', 1399, 1, 'mock', 'MOCK-PAY-4', now() - interval '3 hours' + interval '30 minutes', now() - interval '3 hours'),
  ('00000015-0000-4000-8000-000000000005', '00000008-0000-4000-8000-000000000005', 'pix', 'pending', 3951.3, 1, 'mock', 'MOCK-PAY-5', now() - interval '10 minutes' + interval '30 minutes', null),
  ('00000015-0000-4000-8000-000000000006', '00000008-0000-4000-8000-000000000006', 'pix', 'expired', 1513.9, 1, 'mock', 'MOCK-PAY-6', now() - interval '5 days' + interval '30 minutes', null),
  ('00000015-0000-4000-8000-000000000007', '00000008-0000-4000-8000-000000000007', 'credit_card', 'paid', 1099, 1, 'mock', 'MOCK-PAY-7', null, now() - interval '2 days'),
  ('00000015-0000-4000-8000-000000000008', '00000008-0000-4000-8000-000000000008', 'credit_card', 'paid', 437.5, 2, 'mock', 'MOCK-PAY-8', null, now() - interval '12 days'),
  ('00000015-0000-4000-8000-000000000009', '00000008-0000-4000-8000-000000000009', 'credit_card', 'paid', 327.3, 1, 'mock', 'MOCK-PAY-9', null, now() - interval '20 days'),
  ('00000015-0000-4000-8000-00000000000a', '00000008-0000-4000-8000-00000000000a', 'credit_card', 'paid', 2263.9, 4, 'mock', 'MOCK-PAY-10', null, now() - interval '6 hours');
insert into shipments (id, order_id, status, carrier, service, tracking_code, shipped_at, delivered_at, events) values
  ('00000016-0000-4000-8000-000000000001', '00000008-0000-4000-8000-000000000001', 'delivered', 'Correios', 'SEDEX', 'BR000000001TE', now() - interval '13 days', now() - interval '10 days', '[{"at":"2026-11-01T10:00:00Z","status":"Objeto postado","place":"Brasília - DF"}]'::jsonb),
  ('00000016-0000-4000-8000-000000000002', '00000008-0000-4000-8000-000000000002', 'shipped', 'Transportadora Fictícia', 'Expressa', 'TF000000002TE', now() - interval '1 day', null, '[{"at":"2026-11-01T10:00:00Z","status":"Objeto postado","place":"Brasília - DF"}]'::jsonb),
  ('00000016-0000-4000-8000-000000000003', '00000008-0000-4000-8000-000000000003', 'ready', null, null, null, null, null, '[]'::jsonb),
  ('00000016-0000-4000-8000-000000000004', '00000008-0000-4000-8000-000000000004', 'pending', null, null, null, null, null, '[]'::jsonb),
  ('00000016-0000-4000-8000-000000000007', '00000008-0000-4000-8000-000000000007', 'pending', null, null, null, null, null, '[]'::jsonb),
  ('00000016-0000-4000-8000-000000000008', '00000008-0000-4000-8000-000000000008', 'delivered', 'Correios', 'PAC', 'BR000000008TE', now() - interval '11 days', now() - interval '6 days', '[{"at":"2026-11-01T10:00:00Z","status":"Objeto postado","place":"Brasília - DF"}]'::jsonb),
  ('00000016-0000-4000-8000-000000000009', '00000008-0000-4000-8000-000000000009', 'delivered', 'Correios', 'PAC', 'BR000000009TE', now() - interval '19 days', now() - interval '12 days', '[{"at":"2026-11-01T10:00:00Z","status":"Objeto postado","place":"Brasília - DF"}]'::jsonb),
  ('00000016-0000-4000-8000-00000000000a', '00000008-0000-4000-8000-00000000000a', 'pending', null, null, null, null, null, '[]'::jsonb);
insert into order_events (order_id, type, to_status, message, actor_id, created_at, from_status) values
  ('00000008-0000-4000-8000-000000000001', 'status_changed', 'pending_payment', 'Pedido criado', '00000001-0000-4000-8000-00000000000b', now() - interval '14 days', default),
  ('00000008-0000-4000-8000-000000000001', 'status_changed', 'paid', 'Pagamento confirmado', default, now() - interval '14 days', 'pending_payment'),
  ('00000008-0000-4000-8000-000000000001', 'status_changed', 'shipped', 'Pedido enviado', '00000001-0000-4000-8000-000000000003', now() - interval '13 days', 'preparing'),
  ('00000008-0000-4000-8000-000000000001', 'status_changed', 'delivered', 'Pedido entregue', default, now() - interval '10 days', 'shipped'),
  ('00000008-0000-4000-8000-000000000002', 'status_changed', 'pending_payment', 'Pedido criado', '00000001-0000-4000-8000-00000000000c', now() - interval '3 days', default),
  ('00000008-0000-4000-8000-000000000002', 'status_changed', 'paid', 'Pagamento confirmado', default, now() - interval '3 days', 'pending_payment'),
  ('00000008-0000-4000-8000-000000000002', 'status_changed', 'shipped', 'Pedido enviado', '00000001-0000-4000-8000-000000000003', now() - interval '1 day', 'preparing'),
  ('00000008-0000-4000-8000-000000000003', 'status_changed', 'pending_payment', 'Pedido criado', '00000001-0000-4000-8000-00000000000d', now() - interval '1 day', default),
  ('00000008-0000-4000-8000-000000000003', 'status_changed', 'paid', 'Pagamento confirmado', default, now() - interval '1 day', 'pending_payment'),
  ('00000008-0000-4000-8000-000000000004', 'status_changed', 'pending_payment', 'Pedido criado', '00000001-0000-4000-8000-00000000000b', now() - interval '3 hours', default),
  ('00000008-0000-4000-8000-000000000004', 'status_changed', 'paid', 'Pagamento confirmado', default, now() - interval '3 hours', 'pending_payment'),
  ('00000008-0000-4000-8000-000000000005', 'status_changed', 'pending_payment', 'Pedido criado', '00000001-0000-4000-8000-00000000000e', now() - interval '10 minutes', default),
  ('00000008-0000-4000-8000-000000000006', 'status_changed', 'pending_payment', 'Pedido criado', '00000001-0000-4000-8000-00000000000c', now() - interval '5 days', default),
  ('00000008-0000-4000-8000-000000000006', 'status_changed', 'cancelled', 'Pagamento não confirmado no prazo', default, now() - interval '5 days', 'pending_payment'),
  ('00000008-0000-4000-8000-000000000007', 'status_changed', 'pending_payment', 'Pedido criado', null, now() - interval '2 days', default),
  ('00000008-0000-4000-8000-000000000007', 'status_changed', 'paid', 'Pagamento confirmado', default, now() - interval '2 days', 'pending_payment'),
  ('00000008-0000-4000-8000-000000000008', 'status_changed', 'pending_payment', 'Pedido criado', '00000001-0000-4000-8000-00000000000d', now() - interval '12 days', default),
  ('00000008-0000-4000-8000-000000000008', 'status_changed', 'paid', 'Pagamento confirmado', default, now() - interval '12 days', 'pending_payment'),
  ('00000008-0000-4000-8000-000000000008', 'status_changed', 'shipped', 'Pedido enviado', '00000001-0000-4000-8000-000000000003', now() - interval '11 days', 'preparing'),
  ('00000008-0000-4000-8000-000000000008', 'status_changed', 'delivered', 'Pedido entregue', default, now() - interval '6 days', 'shipped'),
  ('00000008-0000-4000-8000-000000000008', 'status_changed', 'returned', 'Devolução aprovada (garantia)', '00000001-0000-4000-8000-000000000005', now() - interval '3 days', 'delivered'),
  ('00000008-0000-4000-8000-000000000009', 'status_changed', 'pending_payment', 'Pedido criado', '00000001-0000-4000-8000-00000000000e', now() - interval '20 days', default),
  ('00000008-0000-4000-8000-000000000009', 'status_changed', 'paid', 'Pagamento confirmado', default, now() - interval '20 days', 'pending_payment'),
  ('00000008-0000-4000-8000-000000000009', 'status_changed', 'shipped', 'Pedido enviado', '00000001-0000-4000-8000-000000000003', now() - interval '19 days', 'preparing'),
  ('00000008-0000-4000-8000-000000000009', 'status_changed', 'delivered', 'Pedido entregue', default, now() - interval '12 days', 'shipped'),
  ('00000008-0000-4000-8000-00000000000a', 'status_changed', 'pending_payment', 'Pedido criado', '00000001-0000-4000-8000-00000000000c', now() - interval '6 hours', default),
  ('00000008-0000-4000-8000-00000000000a', 'status_changed', 'paid', 'Pagamento confirmado', default, now() - interval '6 hours', 'pending_payment');
insert into coupon_redemptions (coupon_id, order_id, user_id, discount) values
  ('0000000b-0000-4000-8000-000000000001', '00000008-0000-4000-8000-000000000009', '00000001-0000-4000-8000-00000000000e', 32.9),
  ('0000000b-0000-4000-8000-000000000002', '00000008-0000-4000-8000-00000000000a', '00000001-0000-4000-8000-00000000000c', 50);
insert into return_requests (id, order_id, order_item_id, user_id, kind, status, reason, resolution, created_at) values
  ('00000017-0000-4000-8000-000000000001', '00000008-0000-4000-8000-000000000008', '00000009-0000-4000-8000-00000000000a', '00000001-0000-4000-8000-00000000000d', 'garantia', 'approved', 'Microfone com falha intermitente.', 'Troca aprovada.', now() - interval '5 days');
insert into inventory_movements (variant_id, location_id, type, quantity, reason, actor_id, created_at, order_id, unit_id) values
  ('00000005-0000-4000-8000-000000000001', '00000006-0000-4000-8000-000000000001', 'entrada', 4, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000002', '00000006-0000-4000-8000-000000000001', 'entrada', 0, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000003', '00000006-0000-4000-8000-000000000001', 'entrada', 4, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000004', '00000006-0000-4000-8000-000000000001', 'entrada', 2, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000006', '00000006-0000-4000-8000-000000000001', 'entrada', 7, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000007', '00000006-0000-4000-8000-000000000001', 'entrada', 3, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000008', '00000006-0000-4000-8000-000000000001', 'entrada', 15, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000009', '00000006-0000-4000-8000-000000000001', 'entrada', 13, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-00000000000a', '00000006-0000-4000-8000-000000000001', 'entrada', 10, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-00000000000b', '00000006-0000-4000-8000-000000000001', 'entrada', 6, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-00000000000c', '00000006-0000-4000-8000-000000000001', 'entrada', 6, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-00000000000e', '00000006-0000-4000-8000-000000000001', 'entrada', 8, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-00000000000f', '00000006-0000-4000-8000-000000000001', 'entrada', 22, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000010', '00000006-0000-4000-8000-000000000001', 'entrada', 7, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000011', '00000006-0000-4000-8000-000000000001', 'entrada', 18, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000012', '00000006-0000-4000-8000-000000000001', 'entrada', 4, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000016', '00000006-0000-4000-8000-000000000001', 'entrada', 8, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000018', '00000006-0000-4000-8000-000000000001', 'entrada', 0, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000019', '00000006-0000-4000-8000-000000000001', 'entrada', 0, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-00000000001a', '00000006-0000-4000-8000-000000000001', 'entrada', 0, 'Entrada inicial (compra de fornecedor, dado fictício)', '00000001-0000-4000-8000-000000000003', now() - interval '45 days', default, default),
  ('00000005-0000-4000-8000-000000000003', '00000006-0000-4000-8000-000000000001', 'saida', 1, 'venda DB-1001', default, now() - interval '14 days', '00000008-0000-4000-8000-000000000001', default),
  ('00000005-0000-4000-8000-000000000009', '00000006-0000-4000-8000-000000000001', 'saida', 1, 'venda DB-1001', default, now() - interval '14 days', '00000008-0000-4000-8000-000000000001', default),
  ('00000005-0000-4000-8000-000000000006', '00000006-0000-4000-8000-000000000001', 'saida', 1, 'venda DB-1002', default, now() - interval '3 days', '00000008-0000-4000-8000-000000000002', default),
  ('00000005-0000-4000-8000-00000000000f', '00000006-0000-4000-8000-000000000001', 'saida', 2, 'venda DB-1003', default, now() - interval '1 day', '00000008-0000-4000-8000-000000000003', default),
  ('00000005-0000-4000-8000-00000000000a', '00000006-0000-4000-8000-000000000001', 'saida', 1, 'venda DB-1003', default, now() - interval '1 day', '00000008-0000-4000-8000-000000000003', default),
  ('00000005-0000-4000-8000-000000000010', '00000006-0000-4000-8000-000000000001', 'saida', 1, 'venda DB-1004', default, now() - interval '3 hours', '00000008-0000-4000-8000-000000000004', default),
  ('00000005-0000-4000-8000-000000000001', '00000006-0000-4000-8000-000000000001', 'reserva', 1, 'pedido DB-1005 aguardando pagamento', default, now() - interval '10 minutes', '00000008-0000-4000-8000-000000000005', default),
  (default, default, 'saida', 1, 'venda DB-1007', default, now() - interval '2 days', '00000008-0000-4000-8000-000000000007', '00000007-0000-4000-8000-000000000004'),
  ('00000005-0000-4000-8000-000000000009', '00000006-0000-4000-8000-000000000001', 'saida', 1, 'venda DB-1008', default, now() - interval '12 days', '00000008-0000-4000-8000-000000000008', default),
  ('00000005-0000-4000-8000-000000000008', '00000006-0000-4000-8000-000000000001', 'saida', 1, 'venda DB-1009', default, now() - interval '20 days', '00000008-0000-4000-8000-000000000009', default),
  ('00000005-0000-4000-8000-00000000000b', '00000006-0000-4000-8000-000000000001', 'saida', 1, 'venda DB-1010', default, now() - interval '6 hours', '00000008-0000-4000-8000-00000000000a', default),
  ('00000005-0000-4000-8000-00000000000c', '00000006-0000-4000-8000-000000000001', 'ajuste', 1, 'Contagem de inventário: 1 unidade encontrada a mais', '00000001-0000-4000-8000-000000000003', now() - interval '2 days', default, default);
select setval('order_number_seq', 1010);

-- ----------------------------------------------------------------------
-- Carrinhos abertos
-- ----------------------------------------------------------------------
insert into carts (id, user_id, status) values
  ('0000000d-0000-4000-8000-000000000001', '00000001-0000-4000-8000-00000000000b', 'open'),
  ('0000000d-0000-4000-8000-000000000002', '00000001-0000-4000-8000-00000000000e', 'open');
insert into cart_items (cart_id, variant_id, quantity, unit_id) values
  ('0000000d-0000-4000-8000-000000000001', '00000005-0000-4000-8000-000000000004', 1, default),
  ('0000000d-0000-4000-8000-000000000001', '00000005-0000-4000-8000-000000000011', 2, default),
  ('0000000d-0000-4000-8000-000000000002', '00000005-0000-4000-8000-000000000005', 1, '00000007-0000-4000-8000-000000000001');

-- ----------------------------------------------------------------------
-- Venda de usados (Projeto Drop)
-- ----------------------------------------------------------------------
insert into used_requests (id, protocol, user_id, contact_name, contact_email, contact_phone, item_description, category_id, declared_condition, accessories, status, assigned_to, terms_accepted_at, created_at) values
  ('0000000a-0000-4000-8000-000000000050', 'US-0080', '00000001-0000-4000-8000-00000000000b', 'Ana Cliente (teste)', 'ana@teste.dinoblack.example', '(61) 90000-0011', 'PlayStation 4 Slim 500 GB com 2 controles', '00000002-0000-4000-8000-000000000001', 'Bom, funcionando', 'Controles e cabos', 'accepted', '00000001-0000-4000-8000-000000000004', now() - interval '25 days', now() - interval '25 days'),
  ('0000000a-0000-4000-8000-000000000051', 'US-0081', '00000001-0000-4000-8000-00000000000c', 'Bruno Cliente (teste)', 'bruno@teste.dinoblack.example', '(61) 90000-0012', 'Nintendo Switch com tela trincada', '00000002-0000-4000-8000-000000000001', 'Tela trincada', 'Somente o console', 'declined', '00000001-0000-4000-8000-000000000004', now() - interval '15 days', now() - interval '15 days'),
  ('0000000a-0000-4000-8000-000000000052', 'US-0082', '00000001-0000-4000-8000-00000000000d', 'Carla Cliente (teste)', 'carla@teste.dinoblack.example', '(11) 90000-0013', 'Jogo retrô Super Nintendo (cartucho)', '00000002-0000-4000-8000-000000000001', 'Bom estado', 'Cartucho', 'in_review', '00000001-0000-4000-8000-000000000004', now() - interval '4 days', now() - interval '4 days'),
  ('0000000a-0000-4000-8000-000000000053', 'US-0083', '00000001-0000-4000-8000-00000000000e', 'Diego Cliente (teste)', 'diego@teste.dinoblack.example', '(21) 90000-0014', 'Notebook gamer 2021, 16 GB', '00000002-0000-4000-8000-000000000004', 'Funcionando, bateria fraca', 'Carregador', 'awaiting_customer', '00000001-0000-4000-8000-000000000004', now() - interval '3 days', now() - interval '3 days'),
  ('0000000a-0000-4000-8000-000000000054', 'US-0084', null, 'Visitante Teste', 'visitante@teste.dinoblack.example', '(61) 90000-0099', 'Console retrô sem marca, funcionando', '00000002-0000-4000-8000-000000000003', 'Usado', 'Sem acessórios', 'new', null, now() - interval '5 hours', now() - interval '5 hours');
insert into used_request_photos (request_id, storage_path) values
  ('0000000a-0000-4000-8000-000000000050', 'used-requests/US-0080/foto-1.jpg'),
  ('0000000a-0000-4000-8000-000000000050', 'used-requests/US-0080/foto-2.jpg'),
  ('0000000a-0000-4000-8000-000000000051', 'used-requests/US-0081/foto-1.jpg'),
  ('0000000a-0000-4000-8000-000000000051', 'used-requests/US-0081/foto-2.jpg'),
  ('0000000a-0000-4000-8000-000000000052', 'used-requests/US-0082/foto-1.jpg'),
  ('0000000a-0000-4000-8000-000000000052', 'used-requests/US-0082/foto-2.jpg'),
  ('0000000a-0000-4000-8000-000000000053', 'used-requests/US-0083/foto-1.jpg'),
  ('0000000a-0000-4000-8000-000000000053', 'used-requests/US-0083/foto-2.jpg'),
  ('0000000a-0000-4000-8000-000000000054', 'used-requests/US-0084/foto-1.jpg'),
  ('0000000a-0000-4000-8000-000000000054', 'used-requests/US-0084/foto-2.jpg');
insert into used_offers (request_id, amount, kind, message, decision, created_by, created_at) values
  ('0000000a-0000-4000-8000-000000000050', 700, 'dinheiro', 'Proposta de avaliação (dado fictício). Não é oferta final automática.', 'accepted', '00000001-0000-4000-8000-000000000004', now() - interval '10 days'),
  ('0000000a-0000-4000-8000-000000000051', 300, 'credito', 'Proposta de avaliação (dado fictício). Não é oferta final automática.', 'declined', '00000001-0000-4000-8000-000000000004', now() - interval '10 days');
insert into used_request_events (request_id, type, message, created_at, actor_id) values
  ('0000000a-0000-4000-8000-000000000050', 'created', 'Solicitação recebida', now() - interval '25 days', default),
  ('0000000a-0000-4000-8000-000000000050', 'status_changed', 'Status: accepted', now() - interval '25 days', '00000001-0000-4000-8000-000000000004'),
  ('0000000a-0000-4000-8000-000000000051', 'created', 'Solicitação recebida', now() - interval '15 days', default),
  ('0000000a-0000-4000-8000-000000000051', 'status_changed', 'Status: declined', now() - interval '15 days', '00000001-0000-4000-8000-000000000004'),
  ('0000000a-0000-4000-8000-000000000052', 'created', 'Solicitação recebida', now() - interval '4 days', default),
  ('0000000a-0000-4000-8000-000000000052', 'status_changed', 'Status: in_review', now() - interval '4 days', '00000001-0000-4000-8000-000000000004'),
  ('0000000a-0000-4000-8000-000000000053', 'created', 'Solicitação recebida', now() - interval '3 days', default),
  ('0000000a-0000-4000-8000-000000000053', 'status_changed', 'Status: awaiting_customer', now() - interval '3 days', '00000001-0000-4000-8000-000000000004'),
  ('0000000a-0000-4000-8000-000000000054', 'created', 'Solicitação recebida', now() - interval '5 hours', default);
select setval('used_protocol_seq', 85, false);

-- ----------------------------------------------------------------------
-- Banners, páginas, menus, redirects e configurações
-- ----------------------------------------------------------------------
insert into banners (id, placement, eyebrow, title, description, cta_label, href, image_url, position, status, starts_at, ends_at) values
  ('0000000f-0000-4000-8000-000000000001', 'home_hero', 'POTÊNCIA. VELOCIDADE. NEXT GEN.', 'PlayStation 5 Slim', 'SSD ultrarrápido, DualSense e catálogo exclusivo para uma experiência de console sem igual.', 'Explorar agora', '/produto/playstation-5-slim-1tb', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1400&q=80', 1, 'published', default, default),
  ('0000000f-0000-4000-8000-000000000002', 'home_hero', 'PERFORMANCE PARA JOGO E CRIAÇÃO', 'Notebook Gamer RTX 4060', 'Tela de alto refresh, 16 GB de RAM e placa dedicada para AAA e streaming.', 'Explorar agora', '/produto/notebook-gamer-rtx4060', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1400&q=80', 2, 'published', default, default),
  ('0000000f-0000-4000-8000-000000000003', 'home_hero', 'JOGUE EM CASA OU NA RUA', 'Nintendo Switch OLED', 'Tela OLED vibrante, dock inclusa e biblioteca completa de exclusivos Nintendo.', 'Explorar agora', '/produto/nintendo-switch-oled', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=1400&q=80', 3, 'published', default, default),
  ('0000000f-0000-4000-8000-000000000004', 'shop_banner', 'Potência. Preço bom. Garantia.', 'Loja', 'Tudo para o seu setup, do console ao notebook.', 'Ver promoções', '/loja?promocao=1', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80', 1, 'published', default, default),
  ('0000000f-0000-4000-8000-000000000005', 'home_hero', default, 'Campanha Retro (rascunho)', default, 'Ver retro', '/loja?categoria=retro', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80', 4, 'draft', default, default),
  ('0000000f-0000-4000-8000-000000000006', 'home_hero', default, 'Campanha encerrada', default, 'Ver ofertas', '/loja?promocao=1', 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=900&q=80', 5, 'published', now() - interval '30 days', now() - interval '20 days');
insert into pages (id, slug, title, kind, body_md, status, published_at, noindex) values
  ('00000010-0000-4000-8000-000000000001', 'quem-somos', 'Quem somos', 'institutional', '# Quem somos

Texto de exemplo (dado fictício). Substituir pelo conteúdo oficial aprovado pelo cliente e pela assessoria competente.', 'published', now() - interval '20 days', false),
  ('00000010-0000-4000-8000-000000000002', 'sobre', 'Sobre nós', 'institutional', '# Sobre nós

Texto de exemplo (dado fictício). Substituir pelo conteúdo oficial aprovado pelo cliente e pela assessoria competente.', 'published', now() - interval '20 days', false),
  ('00000010-0000-4000-8000-000000000003', 'contato', 'Contato', 'institutional', '# Contato

Texto de exemplo (dado fictício). Substituir pelo conteúdo oficial aprovado pelo cliente e pela assessoria competente.', 'published', now() - interval '20 days', false),
  ('00000010-0000-4000-8000-000000000004', 'trabalhe-conosco', 'Trabalhe conosco', 'institutional', '# Trabalhe conosco

Texto de exemplo (dado fictício). Substituir pelo conteúdo oficial aprovado pelo cliente e pela assessoria competente.', 'published', now() - interval '20 days', false),
  ('00000010-0000-4000-8000-000000000005', 'projeto-drop', 'Projeto Drop: a DinoBlack compra seu usado', 'institutional', '# Projeto Drop: a DinoBlack compra seu usado

Texto de exemplo (dado fictício). Substituir pelo conteúdo oficial aprovado pelo cliente e pela assessoria competente.', 'published', now() - interval '20 days', false),
  ('00000010-0000-4000-8000-000000000006', 'politica-de-troca-e-devolucao', 'Política de troca e devolução', 'policy', '# Política de troca e devolução

Texto de exemplo (dado fictício). Substituir pelo conteúdo oficial aprovado pelo cliente e pela assessoria competente.', 'published', now() - interval '20 days', false),
  ('00000010-0000-4000-8000-000000000007', 'politica-de-privacidade', 'Política de privacidade', 'policy', '# Política de privacidade

Texto de exemplo (dado fictício). Substituir pelo conteúdo oficial aprovado pelo cliente e pela assessoria competente.', 'published', now() - interval '20 days', false),
  ('00000010-0000-4000-8000-000000000008', 'entrega-e-garantia', 'Entrega e garantia', 'policy', '# Entrega e garantia

Texto de exemplo (dado fictício). Substituir pelo conteúdo oficial aprovado pelo cliente e pela assessoria competente.', 'published', now() - interval '20 days', false),
  ('00000010-0000-4000-8000-000000000009', 'regulamento-promocao-site-novo-premiado', 'Regulamento: promoção Site Novo Premiado', 'campaign', '# Regulamento: promoção Site Novo Premiado

Texto de exemplo (dado fictício). Substituir pelo conteúdo oficial aprovado pelo cliente e pela assessoria competente.', 'draft', null, true);
insert into nav_items (id, menu, parent_id, label, href, position) values
  ('00000011-0000-4000-8000-000000000001', 'header', null, 'Início', '/', 0),
  ('00000011-0000-4000-8000-000000000002', 'header', null, 'Loja', '/loja', 1),
  ('00000011-0000-4000-8000-000000000003', 'header', null, 'Sobre', '/sobre', 2),
  ('00000011-0000-4000-8000-000000000004', 'header', null, 'Contato', '/contato', 3),
  ('00000011-0000-4000-8000-000000000005', 'categories', null, 'Consoles', '/loja?categoria=consoles', 0),
  ('00000011-0000-4000-8000-000000000006', 'categories', null, 'PC Gamer', '/loja?categoria=pc-gamer', 1),
  ('00000011-0000-4000-8000-000000000007', 'categories', null, 'Retro', '/loja?categoria=retro', 2),
  ('00000011-0000-4000-8000-000000000008', 'categories', null, 'Notebooks', '/loja?categoria=notebooks', 3),
  ('00000011-0000-4000-8000-000000000009', 'footer', null, 'Departamentos', null, 0),
  ('00000011-0000-4000-8000-00000000000a', 'footer', '00000011-0000-4000-8000-000000000009', 'PlayStation', null, 0),
  ('00000011-0000-4000-8000-00000000000b', 'footer', '00000011-0000-4000-8000-000000000009', 'Nintendo', null, 1),
  ('00000011-0000-4000-8000-00000000000c', 'footer', '00000011-0000-4000-8000-000000000009', 'Xbox', null, 2),
  ('00000011-0000-4000-8000-00000000000d', 'footer', '00000011-0000-4000-8000-000000000009', 'Variados', null, 3),
  ('00000011-0000-4000-8000-00000000000e', 'footer', '00000011-0000-4000-8000-000000000009', 'Pré-Vendas', null, 4),
  ('00000011-0000-4000-8000-00000000000f', 'footer', null, 'Institucional', null, 1),
  ('00000011-0000-4000-8000-000000000010', 'footer', '00000011-0000-4000-8000-00000000000f', 'Projeto Drop - A DinoBlack Compra seu Usado!', null, 0),
  ('00000011-0000-4000-8000-000000000011', 'footer', '00000011-0000-4000-8000-00000000000f', 'Quem Somos', null, 1),
  ('00000011-0000-4000-8000-000000000012', 'footer', '00000011-0000-4000-8000-00000000000f', 'Trabalhe Conosco', null, 2),
  ('00000011-0000-4000-8000-000000000013', 'footer', '00000011-0000-4000-8000-00000000000f', 'Políticas de Troca e Devoluções', null, 3),
  ('00000011-0000-4000-8000-000000000014', 'footer', '00000011-0000-4000-8000-00000000000f', 'Políticas de Privacidade', null, 4),
  ('00000011-0000-4000-8000-000000000015', 'footer', null, 'Minha conta', null, 2),
  ('00000011-0000-4000-8000-000000000016', 'footer', '00000011-0000-4000-8000-000000000015', 'Minha Conta', null, 0),
  ('00000011-0000-4000-8000-000000000017', 'footer', '00000011-0000-4000-8000-000000000015', 'Meus Pedidos', null, 1),
  ('00000011-0000-4000-8000-000000000018', 'footer', null, 'Novidade e promoções', null, 3),
  ('00000011-0000-4000-8000-000000000019', 'footer', '00000011-0000-4000-8000-000000000018', 'Regulamento Promoção - Site Novo Premiado', null, 0);
insert into redirects (from_path, to_path, status_code, note) values
  ('/loja/', '/loja', 301, 'Site antigo'),
  ('/categoria-produto/playstation/', '/loja?plataforma=playstation', 301, 'Site antigo'),
  ('/categoria-produto/nintendo/', '/loja?plataforma=nintendo', 301, 'Site antigo'),
  ('/categoria-produto/xbox/', '/loja?plataforma=xbox', 301, 'Site antigo'),
  ('/minha-conta/', '/conta', 301, 'Site antigo'),
  ('/minha-conta/pedidos/', '/pedidos', 301, 'Site antigo'),
  ('/quem-somos', '/sobre', 301, 'Site antigo');
insert into store_settings (key, value, is_public) values
  ('store_name', '"DinoBlack Games e Informática"'::jsonb, true),
  ('address', '{"text":"Qr 117 Conjunto Q, 05 - Santa Maria, Brasília - DF.","maps":"https://maps.app.goo.gl/Kte3czHkyV267t836"}'::jsonb, true),
  ('contact', '{"whatsapp":"5561992926551","display":"(61) 99292-6551"}'::jsonb, true),
  ('socials', '{"youtube":"https://www.youtube.com/@DinoBlackGames","tiktok":"https://www.tiktok.com/@dinoblack.games","facebook":"https://www.facebook.com/dinoblackgames"}'::jsonb, true),
  ('checkout', '{"maxInstallments":10,"pickupLocation":"LOJA-SM"}'::jsonb, true),
  ('shipping_origin', '{"cep":"72510000","note":"Dado fictício"}'::jsonb, false),
  ('stock_alerts', '{"notifyRoles":["owner","manager","stock"]}'::jsonb, false);

-- ----------------------------------------------------------------------
-- Consentimentos, privacidade, suporte e operação
-- ----------------------------------------------------------------------
insert into consents (user_id, channel, purpose, granted, source, created_at, email) values
  ('00000001-0000-4000-8000-00000000000b', 'email', 'transactional', true, 'cadastro', default, default),
  ('00000001-0000-4000-8000-00000000000b', 'whatsapp', 'marketing', true, 'checkout', now() - interval '14 days', default),
  ('00000001-0000-4000-8000-00000000000c', 'email', 'transactional', true, 'cadastro', default, default),
  ('00000001-0000-4000-8000-00000000000c', 'email', 'marketing', false, 'checkout', default, default),
  ('00000001-0000-4000-8000-00000000000d', 'email', 'marketing', true, 'cadastro', now() - interval '20 days', default),
  ('00000001-0000-4000-8000-00000000000d', 'email', 'marketing', false, 'central de preferências', now() - interval '2 days', default),
  (default, 'email', 'transactional', true, 'checkout visitante', default, 'visitante@teste.dinoblack.example');
insert into privacy_requests (user_id, contact_email, type, status, details, due_at) values
  ('00000001-0000-4000-8000-00000000000d', 'carla@teste.dinoblack.example', 'access', 'in_progress', 'Solicito cópia dos meus dados.', now() + interval '10 days'),
  ('00000001-0000-4000-8000-00000000000e', 'diego@teste.dinoblack.example', 'deletion', 'received', 'Solicito a exclusão da conta.', now() + interval '14 days');
insert into contact_messages (name, email, phone, subject, message, handled) values
  ('Visitante Teste', 'visitante@teste.dinoblack.example', '(61) 90000-0099', 'Dúvida sobre garantia', 'Qual o prazo de garantia dos seminovos?', false),
  ('Ana Cliente (teste)', 'ana@teste.dinoblack.example', default, 'Prazo de entrega', 'Vocês entregam em Santa Maria no mesmo dia?', true),
  ('Empresa Teste', 'parceria@teste.dinoblack.example', default, 'Parceria', 'Gostaríamos de conversar sobre uma parceria.', false);
insert into back_in_stock_alerts (product_id, variant_id, user_id, email) values
  ('00000004-0000-4000-8000-000000000001', '00000005-0000-4000-8000-000000000002', '00000001-0000-4000-8000-00000000000e', default),
  ('00000004-0000-4000-8000-000000000001', '00000005-0000-4000-8000-000000000002', default, 'visitante@teste.dinoblack.example'),
  ('00000004-0000-4000-8000-000000000016', default, '00000001-0000-4000-8000-00000000000b', default);
insert into product_reviews (product_id, user_id, rating, body, source, status) values
  ('00000004-0000-4000-8000-000000000007', '00000001-0000-4000-8000-00000000000b', 5, 'Avaliação de teste, não publicada (sem fonte confiável definida).', 'teste', 'draft'),
  ('00000004-0000-4000-8000-000000000002', '00000001-0000-4000-8000-00000000000b', 4, 'Avaliação de teste, não publicada.', 'teste', 'draft');
insert into integrations (domain, provider, status, owner_name, notes) values
  ('payments', 'mock', 'sandbox', 'A definir', 'Gateway de teste interno. Fornecedor real ainda não escolhido.'),
  ('shipping', default, 'not_configured', default, 'Cotação por CEP simulada na loja.'),
  ('erp', default, 'not_configured', default, 'ERP e fonte canônica de estoque a validar na descoberta.'),
  ('fiscal', default, 'not_configured', default, default),
  ('messaging', default, 'not_configured', default, 'E-mail e WhatsApp transacionais pendentes.'),
  ('analytics', default, 'not_configured', default, default);
insert into integration_events (domain, provider, external_id, event_type, payload, status, attempts, received_at, processed_at, error) values
  ('payments', 'mock', 'evt_mock_001', 'payment.paid', '{"order":"DB-1004"}'::jsonb, 'processed', 1, now() - interval '3 hours', now() - interval '3 hours', default),
  ('payments', 'mock', 'evt_mock_002', 'payment.paid', '{"order":"DB-1999"}'::jsonb, 'failed', 3, now() - interval '1 day', default, 'pedido inexistente');
insert into admin_notifications (kind, title, body, ref_table, ref_id, is_read) values
  ('estoque_baixo', 'PS5 Slim Branco abaixo do mínimo', 'Disponível 3, mínimo 5.', 'product_variants', '00000005-0000-4000-8000-000000000001', default),
  ('sem_saldo', 'PS5 Slim Preto sem saldo', 'Sem unidades disponíveis.', 'product_variants', '00000005-0000-4000-8000-000000000002', default),
  ('pagamento_expirado', 'Pagamento expirado no pedido DB-1006', default, 'orders', '00000008-0000-4000-8000-000000000006', true),
  ('usado_novo', 'Nova solicitação de usado US-0084', default, 'used_requests', '0000000a-0000-4000-8000-000000000054', default);
insert into audit_log (actor_id, action, entity, entity_id, changes, created_at) values
  ('00000001-0000-4000-8000-000000000006', 'update', 'banners', '0000000f-0000-4000-8000-000000000004', '{"cta_label":["Ver ofertas","Ver promoções"]}'::jsonb, now() - interval '2 days'),
  ('00000001-0000-4000-8000-000000000002', 'update', 'products', '00000004-0000-4000-8000-000000000001', '{"price":[4099,3899]}'::jsonb, now() - interval '5 days'),
  ('00000001-0000-4000-8000-000000000003', 'adjust', 'inventory_levels', '00000005-0000-4000-8000-00000000000c', '{"on_hand":[6,7]}'::jsonb, now() - interval '2 days'),
  ('00000001-0000-4000-8000-000000000001', 'grant_role', 'user_roles', '00000001-0000-4000-8000-000000000004', '{"role":"appraiser"}'::jsonb, now() - interval '30 days');
insert into analytics_events (event, session_id, props, created_at) values
  ('view_item_list', 'sess-1', '{"productSlug":"playstation-5-slim-1tb","ordem":0}'::jsonb, now() - interval '0 hours'),
  ('view_item', 'sess-2', '{"productSlug":"nintendo-switch-oled","ordem":1}'::jsonb, now() - interval '3 hours'),
  ('add_to_cart', 'sess-3', '{"productSlug":"dualsense-branco","ordem":2}'::jsonb, now() - interval '6 hours'),
  ('shipping_calculated', 'sess-4', '{"productSlug":"notebook-gamer-rtx4060","ordem":0}'::jsonb, now() - interval '9 hours'),
  ('whatsapp_click', 'sess-5', '{"productSlug":"pc-gamer-ryzen7","ordem":1}'::jsonb, now() - interval '12 hours'),
  ('filter_applied', 'sess-6', '{"productSlug":"console-retro-mini","ordem":2}'::jsonb, now() - interval '15 hours'),
  ('view_item_list', 'sess-1', '{"productSlug":"headset-gamer-7-1","ordem":0}'::jsonb, now() - interval '18 hours'),
  ('view_item', 'sess-2', '{"productSlug":"teclado-mecanico-rgb","ordem":1}'::jsonb, now() - interval '21 hours'),
  ('add_to_cart', 'sess-3', '{"productSlug":"playstation-5-slim-1tb","ordem":2}'::jsonb, now() - interval '24 hours'),
  ('shipping_calculated', 'sess-4', '{"productSlug":"nintendo-switch-oled","ordem":0}'::jsonb, now() - interval '27 hours'),
  ('whatsapp_click', 'sess-5', '{"productSlug":"dualsense-branco","ordem":1}'::jsonb, now() - interval '30 hours'),
  ('filter_applied', 'sess-6', '{"productSlug":"notebook-gamer-rtx4060","ordem":2}'::jsonb, now() - interval '33 hours'),
  ('view_item_list', 'sess-1', '{"productSlug":"pc-gamer-ryzen7","ordem":0}'::jsonb, now() - interval '36 hours'),
  ('view_item', 'sess-2', '{"productSlug":"console-retro-mini","ordem":1}'::jsonb, now() - interval '39 hours'),
  ('add_to_cart', 'sess-3', '{"productSlug":"headset-gamer-7-1","ordem":2}'::jsonb, now() - interval '42 hours'),
  ('shipping_calculated', 'sess-4', '{"productSlug":"teclado-mecanico-rgb","ordem":0}'::jsonb, now() - interval '45 hours'),
  ('whatsapp_click', 'sess-5', '{"productSlug":"playstation-5-slim-1tb","ordem":1}'::jsonb, now() - interval '48 hours'),
  ('filter_applied', 'sess-6', '{"productSlug":"nintendo-switch-oled","ordem":2}'::jsonb, now() - interval '51 hours'),
  ('view_item_list', 'sess-1', '{"productSlug":"dualsense-branco","ordem":0}'::jsonb, now() - interval '54 hours'),
  ('view_item', 'sess-2', '{"productSlug":"notebook-gamer-rtx4060","ordem":1}'::jsonb, now() - interval '57 hours'),
  ('add_to_cart', 'sess-3', '{"productSlug":"pc-gamer-ryzen7","ordem":2}'::jsonb, now() - interval '60 hours'),
  ('shipping_calculated', 'sess-4', '{"productSlug":"console-retro-mini","ordem":0}'::jsonb, now() - interval '63 hours'),
  ('whatsapp_click', 'sess-5', '{"productSlug":"headset-gamer-7-1","ordem":1}'::jsonb, now() - interval '66 hours'),
  ('filter_applied', 'sess-6', '{"productSlug":"teclado-mecanico-rgb","ordem":2}'::jsonb, now() - interval '69 hours');
