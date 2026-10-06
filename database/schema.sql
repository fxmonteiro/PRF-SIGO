CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  email VARCHAR(180) UNIQUE,
  perfil VARCHAR(40) NOT NULL DEFAULT 'SOLICITANTE',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solicitacoes (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(30) UNIQUE NOT NULL,
  solicitante VARCHAR(160) NOT NULL,
  unidade VARCHAR(160) NOT NULL,
  tipo VARCHAR(80) NOT NULL,
  prioridade VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  insumo VARCHAR(160) NOT NULL,
  quantidade NUMERIC(14,2) NOT NULL,
  prazo DATE,
  justificativa TEXT NOT NULL,
  responsavel_id INTEGER REFERENCES usuarios(id),
  status VARCHAR(30) NOT NULL DEFAULT 'EM_ANALISE',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historico_processos (
  id SERIAL PRIMARY KEY,
  solicitacao_id INTEGER NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id),
  acao VARCHAR(120) NOT NULL,
  status_anterior VARCHAR(30),
  status_novo VARCHAR(30),
  observacao TEXT,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estoques (
  id SERIAL PRIMARY KEY,
  insumo VARCHAR(160) NOT NULL,
  unidade_medida VARCHAR(30) NOT NULL DEFAULT 'un',
  quantidade_atual NUMERIC(14,2) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  estoque_maximo NUMERIC(14,2),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contratos (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(50) UNIQUE NOT NULL,
  fornecedor VARCHAR(180) NOT NULL,
  objeto TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  valor NUMERIC(14,2) DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'EM_VIGENCIA'
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id SERIAL PRIMARY KEY,
  nota_fiscal VARCHAR(60) NOT NULL,
  fornecedor VARCHAR(180) NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  vencimento DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
  pago_em DATE
);

CREATE TABLE IF NOT EXISTS alertas (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT NOT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'ATENCAO',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO usuarios (nome,email,perfil) VALUES
('Emanuel Monteiro','admin@prf.local','ADMIN')
ON CONFLICT (email) DO NOTHING;

INSERT INTO estoques (insumo,unidade_medida,quantidade_atual,estoque_minimo) VALUES
('Papel A4','un',5,20),
('Combustível Diesel','L',2400,5000),
('Alimento não perecível','kg',120,200),
('Material de limpeza','un',300,100)
ON CONFLICT DO NOTHING;

INSERT INTO contratos (numero,fornecedor,objeto,data_inicio,data_fim,valor,status) VALUES
('CT-003/2024','Alimentos Ltda.','Fornecimento de alimentos','2026-01-01','2026-10-05',150000,'EM_VIGENCIA'),
('CT-007/2024','Combustível S/A','Fornecimento de combustível','2026-01-01','2026-10-12',420000,'EM_VIGENCIA')
ON CONFLICT (numero) DO NOTHING;

INSERT INTO alertas (titulo,descricao,tipo) VALUES
('Estoque de papel A4 em nível crítico','Almoxarifado Central','CRITICO'),
('Contrato de manutenção próximo do vencimento','Verifique os contratos nos próximos 5 dias','ATENCAO'),
('Acompanhe os pagamentos pendentes','Existem documentos aguardando processamento','ATENCAO')
ON CONFLICT DO NOTHING;

-- Extensões do SIGO: todas são criadas de forma segura para bancos já existentes.
CREATE TABLE IF NOT EXISTS materiais (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(60) UNIQUE,
  nome VARCHAR(160) NOT NULL,
  categoria VARCHAR(100),
  unidade_medida VARCHAR(30) NOT NULL DEFAULT 'un',
  estoque_minimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  estoque_maximo NUMERIC(14,2),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(180) NOT NULL,
  documento VARCHAR(40),
  contato VARCHAR(160),
  email VARCHAR(180),
  telefone VARCHAR(50),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id SERIAL PRIMARY KEY,
  estoque_id INTEGER REFERENCES estoques(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materiais(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL,
  quantidade NUMERIC(14,2) NOT NULL,
  saldo_anterior NUMERIC(14,2) NOT NULL DEFAULT 0,
  saldo_novo NUMERIC(14,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compras (
  id SERIAL PRIMARY KEY,
  solicitacao_id INTEGER REFERENCES solicitacoes(id) ON DELETE SET NULL,
  fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
  numero VARCHAR(50) UNIQUE NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  previsao_entrega DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'EM_COTACAO',
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cotacoes (
  id SERIAL PRIMARY KEY,
  solicitacao_id INTEGER REFERENCES solicitacoes(id) ON DELETE SET NULL,
  fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  prazo_entrega INTEGER,
  status VARCHAR(30) NOT NULL DEFAULT 'RECEBIDA',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS unidades (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(160) UNIQUE NOT NULL,
  sigla VARCHAR(30),
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES materiais(id) ON DELETE SET NULL;
ALTER TABLE estoques ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES materiais(id) ON DELETE SET NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL;

INSERT INTO materiais (codigo,nome,categoria,unidade_medida,estoque_minimo,estoque_maximo)
SELECT 'MAT-'||LPAD(id::text,4,'0'), insumo, 'Catálogo inicial', unidade_medida, estoque_minimo, estoque_maximo
FROM estoques e
WHERE NOT EXISTS (SELECT 1 FROM materiais m WHERE LOWER(m.nome)=LOWER(e.insumo));

UPDATE estoques e SET material_id=m.id
FROM materiais m WHERE e.material_id IS NULL AND LOWER(m.nome)=LOWER(e.insumo);

UPDATE solicitacoes s SET material_id=m.id
FROM materiais m WHERE s.material_id IS NULL AND LOWER(m.nome)=LOWER(s.insumo);



-- Dados demonstrativos do SIGO: inseridos de forma idempotente para manter dados já existentes.
INSERT INTO fornecedores(nome,documento,contato,email,telefone)
SELECT * FROM (VALUES
('Alimentos Brasil Distribuidora','12.345.678/0001-90','Mariana Costa','comercial@alimentosbrasil.local','(82) 3333-1200'),
('Combustível Nordeste S/A','23.456.789/0001-11','Rafael Lima','vendas@combustivelnordeste.local','(82) 3333-2400'),
('Suprimentos Maceió Ltda.','34.567.890/0001-22','Juliana Alves','atendimento@suprimentosmaceio.local','(82) 3333-3500'),
('Higieniza Serviços','45.678.901/0001-33','Carlos Mendes','comercial@higieniza.local','(82) 3333-4600')
) AS v(nome,documento,contato,email,telefone)
WHERE NOT EXISTS (SELECT 1 FROM fornecedores f WHERE LOWER(f.nome)=LOWER(v.nome));

INSERT INTO materiais(codigo,nome,categoria,unidade_medida,estoque_minimo,estoque_maximo) VALUES
('MAT-0101','Toner para impressora','Informática','un',5,20),
('MAT-0102','Papel higiênico institucional','Higiene','pct',30,120),
('MAT-0103','Luva nitrílica','EPI','cx',20,80),
('MAT-0104','Água mineral 20L','Apoio operacional','un',15,50)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO estoques(insumo,unidade_medida,quantidade_atual,estoque_minimo,estoque_maximo,material_id)
SELECT m.nome,m.unidade_medida,CASE m.codigo WHEN 'MAT-0101' THEN 8 WHEN 'MAT-0102' THEN 72 WHEN 'MAT-0103' THEN 18 WHEN 'MAT-0104' THEN 26 END,m.estoque_minimo,m.estoque_maximo,m.id
FROM materiais m WHERE m.codigo IN ('MAT-0101','MAT-0102','MAT-0103','MAT-0104') AND NOT EXISTS (SELECT 1 FROM estoques e WHERE e.material_id=m.id);

INSERT INTO solicitacoes(numero,solicitante,unidade,tipo,prioridade,insumo,material_id,quantidade,prazo,justificativa,status)
SELECT * FROM (VALUES
('SOL-000001','Emanuel Monteiro','Superintendência Regional - AL','Material de expediente','ALTA','Papel A4',(SELECT id FROM materiais WHERE LOWER(nome)=LOWER('Papel A4')),40,'2026-10-09','Reposição para impressão de documentos operacionais e administrativos.','EM_ANDAMENTO'),
('SOL-000002','Ana Beatriz Santos','Delegacia de Maceió','EPI','URGENTE','Luva nitrílica',(SELECT id FROM materiais WHERE LOWER(nome)=LOWER('Luva nitrílica')),25,'2026-10-07','Reposição de EPI para equipes em atividade externa.','EM_ANALISE'),
('SOL-000003','Lucas Ferreira','Unidade Operacional Arapiraca','Higiene','NORMAL','Papel higiênico institucional',(SELECT id FROM materiais WHERE LOWER(nome)=LOWER('Papel higiênico institucional')),40,'2026-10-15','Reposição mensal do almoxarifado da unidade.','CONCLUIDA'),
('SOL-000004','Marcos Oliveira','Delegacia de União dos Palmares','Apoio operacional','NORMAL','Água mineral 20L',(SELECT id FROM materiais WHERE LOWER(nome)=LOWER('Água mineral 20L')),20,'2026-10-12','Abastecimento da unidade para atendimento e equipes de plantão.','EM_ANALISE'),
('SOL-000005','Carla Mendes','Superintendência Regional - AL','Informática','ALTA','Toner para impressora',(SELECT id FROM materiais WHERE LOWER(nome)=LOWER('Toner para impressora')),6,'2026-10-11','Reposição para impressão de relatórios e expedientes.','REJEITADA')
) AS v(numero,solicitante,unidade,tipo,prioridade,insumo,material_id,quantidade,prazo,justificativa,status)
WHERE NOT EXISTS (SELECT 1 FROM solicitacoes s WHERE s.numero=v.numero);

INSERT INTO historico_processos(solicitacao_id,acao,status_anterior,status_novo,observacao)
SELECT s.id,'Solicitação criada',NULL,s.status,'Registro inicial de demonstração do SIGO' FROM solicitacoes s
WHERE s.numero IN ('SOL-000001','SOL-000002','SOL-000003','SOL-000004','SOL-000005') AND NOT EXISTS (SELECT 1 FROM historico_processos h WHERE h.solicitacao_id=s.id);

INSERT INTO compras(solicitacao_id,fornecedor_id,numero,valor,previsao_entrega,status,observacao)
SELECT s.id,f.id,'COMP-00001',18450.00,'2026-10-10','EM_ANDAMENTO','Compra relacionada à reposição de materiais de expediente.' FROM solicitacoes s,fornecedores f WHERE s.numero='SOL-000001' AND f.nome='Suprimentos Maceió Ltda.' AND NOT EXISTS (SELECT 1 FROM compras c WHERE c.numero='COMP-00001');
INSERT INTO compras(solicitacao_id,fornecedor_id,numero,valor,previsao_entrega,status,observacao)
SELECT s.id,f.id,'COMP-00002',32700.00,'2026-10-08','APROVADA','Aquisição de EPI para equipes operacionais.' FROM solicitacoes s,fornecedores f WHERE s.numero='SOL-000002' AND f.nome='Higieniza Serviços' AND NOT EXISTS (SELECT 1 FROM compras c WHERE c.numero='COMP-00002');

INSERT INTO pagamentos(nota_fiscal,fornecedor,valor,vencimento,status) SELECT * FROM (VALUES
('NF-2026-1845','Suprimentos Maceió Ltda.',18450.00,'2026-10-10','PENDENTE'),
('NF-2026-1762','Alimentos Brasil Distribuidora',12600.00,'2026-10-06','PENDENTE'),
('NF-2026-1651','Combustível Nordeste S/A',45800.00,'2026-10-02','PAGO'),
('NF-2026-1519','Higieniza Serviços',9800.00,'2026-09-28','PAGO')
) AS v(nota_fiscal,fornecedor,valor,vencimento,status) WHERE NOT EXISTS (SELECT 1 FROM pagamentos p WHERE p.nota_fiscal=v.nota_fiscal);

INSERT INTO movimentacoes_estoque(estoque_id,material_id,tipo,quantidade,saldo_anterior,saldo_novo,observacao,usuario_id)
SELECT e.id,e.material_id,'ENTRADA',30,42,72,'Recebimento de reposição mensal',u.id FROM estoques e JOIN materiais m ON m.id=e.material_id CROSS JOIN usuarios u
WHERE m.nome='Papel higiênico institucional' AND u.email='admin@prf.local' AND NOT EXISTS (SELECT 1 FROM movimentacoes_estoque mv WHERE mv.observacao='Recebimento de reposição mensal');
INSERT INTO movimentacoes_estoque(estoque_id,material_id,tipo,quantidade,saldo_anterior,saldo_novo,observacao,usuario_id)
SELECT e.id,e.material_id,'SAIDA',7,25,18,'Distribuição para equipe operacional',u.id FROM estoques e JOIN materiais m ON m.id=e.material_id CROSS JOIN usuarios u
WHERE m.nome='Luva nitrílica' AND u.email='admin@prf.local' AND NOT EXISTS (SELECT 1 FROM movimentacoes_estoque mv WHERE mv.observacao='Distribuição para equipe operacional');
INSERT INTO movimentacoes_estoque(estoque_id,material_id,tipo,quantidade,saldo_anterior,saldo_novo,observacao,usuario_id)
SELECT e.id,e.material_id,'AJUSTE',8,0,8,'Saldo inicial conferido no inventário',u.id FROM estoques e JOIN materiais m ON m.id=e.material_id CROSS JOIN usuarios u
WHERE m.nome='Toner para impressora' AND u.email='admin@prf.local' AND NOT EXISTS (SELECT 1 FROM movimentacoes_estoque mv WHERE mv.observacao='Saldo inicial conferido no inventário');
