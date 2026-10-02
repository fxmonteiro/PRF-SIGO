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
