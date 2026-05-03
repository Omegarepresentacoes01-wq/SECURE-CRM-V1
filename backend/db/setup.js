require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'crm.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS organizacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL, cnpj TEXT, responsavel TEXT, email TEXT, telefone TEXT,
    status TEXT DEFAULT 'trial', plano TEXT DEFAULT 'basico',
    valor_mensal REAL DEFAULT 0, limite_usuarios INTEGER DEFAULT 5,
    vencimento_plano TEXT, trial_fim TEXT,
    created_date TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, senha_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    organizacao_id INTEGER REFERENCES organizacoes(id) ON DELETE SET NULL,
    avatar TEXT, created_date TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL, empresa TEXT, telefone TEXT, email TEXT,
    cep TEXT, endereco TEXT, cidade TEXT, estado TEXT,
    status TEXT DEFAULT 'novo', temperatura TEXT DEFAULT 'frio',
    origem TEXT, tipo_negocio TEXT, tipo_imovel TEXT, subtipo_imovel TEXT,
    urgencia TEXT DEFAULT 'media', valor_estimado REAL,
    latitude REAL, longitude REAL,
    organizacao_id INTEGER REFERENCES organizacoes(id) ON DELETE CASCADE,
    criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_date TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS atividades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL DEFAULT 'nota',
    titulo TEXT, descricao TEXT, data_agendada TEXT,
    concluida INTEGER DEFAULT 0, concluida_em TEXT,
    organizacao_id INTEGER REFERENCES organizacoes(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_date TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS contratos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    cliente_nome TEXT, contract_type TEXT DEFAULT 'monitoramento_comodato',
    valor_mensal REAL DEFAULT 0, valor_instalacao REAL DEFAULT 0,
    data_inicio TEXT, data_fim TEXT,
    status TEXT DEFAULT 'ativo', payment_method TEXT DEFAULT 'boleto',
    organizacao_id INTEGER REFERENCES organizacoes(id) ON DELETE CASCADE,
    created_date TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS financeiros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contrato_id INTEGER REFERENCES contratos(id) ON DELETE SET NULL,
    cliente_nome TEXT, financial_type TEXT DEFAULT 'mensalidade',
    valor REAL DEFAULT 0, vencimento TEXT,
    status TEXT DEFAULT 'pendente', payment_method TEXT, data_pagamento TEXT,
    comissao_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    comissao_valor REAL DEFAULT 0,
    organizacao_id INTEGER REFERENCES organizacoes(id) ON DELETE CASCADE,
    created_date TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS pos_vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT, post_sale_type TEXT DEFAULT 'onboarding',
    titulo TEXT, descricao TEXT, status TEXT DEFAULT 'pendente',
    due_date TEXT, satisfaction_score INTEGER, notes TEXT, completed_date TEXT,
    organizacao_id INTEGER REFERENCES organizacoes(id) ON DELETE CASCADE,
    created_date TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS faturamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organizacao_id INTEGER REFERENCES organizacoes(id) ON DELETE SET NULL,
    org_nome TEXT, tipo TEXT DEFAULT 'renovacao',
    valor REAL DEFAULT 0, desconto REAL DEFAULT 0, total REAL DEFAULT 0,
    vencimento TEXT, status TEXT DEFAULT 'pendente',
    payment_method TEXT DEFAULT 'pix', pago_em TEXT,
    created_date TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS cupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL, desconto REAL DEFAULT 0,
    tipo_desconto TEXT DEFAULT 'percentual', validade TEXT,
    limite_uso INTEGER, usos INTEGER DEFAULT 0,
    created_date TEXT DEFAULT (datetime('now'))
  );
`);

const existente = db.prepare("SELECT id FROM usuarios WHERE role = 'super_admin'").get();
if (!existente) {
  const orgId = db.prepare(
    "INSERT INTO organizacoes (nome, email, status, plano, valor_mensal) VALUES (?, ?, ?, ?, ?)"
  ).run('SECURE-CRM Plataforma', 'admin@securecRM.com'.toLowerCase(), 'ativo', 'enterprise', 0).lastInsertRowid;

  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(
    "INSERT INTO usuarios (nome, email, senha_hash, role, organizacao_id) VALUES (?, ?, ?, ?, ?)"
  ).run('Super Admin', 'admin@securecRM.com'.toLowerCase(), hash, 'super_admin', orgId);

  console.log('\n✅ Banco criado!');
  console.log('👤 Login: admin@securecRM.com');
  console.log('🔑 Senha: admin123');
  console.log('⚠️  Troque a senha após o primeiro acesso.\n');
} else {
  console.log('✅ Banco já existe — nenhuma alteração feita.');
}
db.close();
