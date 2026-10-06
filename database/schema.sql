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

