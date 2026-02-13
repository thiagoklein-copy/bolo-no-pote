-- Operação Bolo no Pote: tabelas no Supabase
-- Cole e execute este SQL no Supabase (SQL Editor → New query → Run).

-- Tabela de vendas
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quantidade INTEGER NOT NULL DEFAULT 1,
  sabor TEXT NOT NULL DEFAULT 'Não informado',
  data DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para filtrar por data
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas (data);

-- Tabela de configuração (uma linha: insumos + receitas produzidas)
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  receitas_produzidas INTEGER NOT NULL DEFAULT 0,
  insumos JSONB NOT NULL DEFAULT '{"massa":[],"recheio":[],"cobertura":[]}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir que existe uma única linha de config
INSERT INTO config (id, receitas_produzidas, insumos)
VALUES (
  1,
  0,
  '{
    "massa": [
      {"nome":"Ovos","tipo":"unidade","quantidade":3,"preco":0.015},
      {"nome":"Açúcar refinado","tipo":"kg","quantidade":0.24,"preco":5},
      {"nome":"Leite","tipo":"kg","quantidade":0.12,"preco":6},
      {"nome":"Óleo","tipo":"kg","quantidade":0.125,"preco":10},
      {"nome":"Chocolate em pó","tipo":"kg","quantidade":0.1,"preco":55},
      {"nome":"Farinha de trigo","tipo":"kg","quantidade":0.36,"preco":5.5},
      {"nome":"Bicarbonato de sódio","tipo":"kg","quantidade":0.005,"preco":40},
      {"nome":"Fermento em pó","tipo":"kg","quantidade":0.015,"preco":30}
    ],
    "recheio": [
      {"nome":"Leite condensado","tipo":"unidade","quantidade":1.5,"preco":8},
      {"nome":"Chocolate em pó","tipo":"kg","quantidade":0.06,"preco":55},
      {"nome":"Manteiga","tipo":"kg","quantidade":0.015,"preco":72}
    ],
    "cobertura": [
      {"nome":"Leite condensado","tipo":"unidade","quantidade":1,"preco":8},
      {"nome":"Chocolate em pó","tipo":"kg","quantidade":0.06,"preco":55},
      {"nome":"Manteiga","tipo":"kg","quantidade":0.01,"preco":72}
    ]
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (RLS): permitir leitura e escrita com a chave anon
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendas_select" ON vendas;
DROP POLICY IF EXISTS "vendas_insert" ON vendas;
DROP POLICY IF EXISTS "config_select" ON config;
DROP POLICY IF EXISTS "config_update" ON config;

CREATE POLICY "vendas_select" ON vendas FOR SELECT USING (true);
CREATE POLICY "vendas_insert" ON vendas FOR INSERT WITH CHECK (true);
CREATE POLICY "config_select" ON config FOR SELECT USING (true);
CREATE POLICY "config_update" ON config FOR UPDATE USING (true);
CREATE POLICY "config_insert" ON config FOR INSERT WITH CHECK (true);

-- Tabela de fiado (vendas a prazo: nome, sabor, total de unidades, quantas já pagou)
CREATE TABLE IF NOT EXISTS fiado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  sabor TEXT NOT NULL DEFAULT 'Não informado',
  total_units INTEGER NOT NULL DEFAULT 0,
  paid_units INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Garantir coluna sabor em tabelas já existentes
ALTER TABLE fiado ADD COLUMN IF NOT EXISTS sabor TEXT NOT NULL DEFAULT 'Não informado';

ALTER TABLE fiado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fiado_select" ON fiado;
DROP POLICY IF EXISTS "fiado_insert" ON fiado;
DROP POLICY IF EXISTS "fiado_update" ON fiado;
CREATE POLICY "fiado_select" ON fiado FOR SELECT USING (true);
CREATE POLICY "fiado_insert" ON fiado FOR INSERT WITH CHECK (true);
CREATE POLICY "fiado_update" ON fiado FOR UPDATE USING (true);
