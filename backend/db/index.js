const Database = require('better-sqlite3');
const path = require('path');
const DB_PATH = path.join(__dirname, 'crm.db');

// Migrations applied on every server start (idempotent — silently ignored if column already exists)
const MIGRATIONS = [
  'ALTER TABLE organizacoes ADD COLUMN inicio_assinatura TEXT',
  'ALTER TABLE faturamentos ADD COLUMN plano TEXT',
  'ALTER TABLE faturamentos ADD COLUMN coupon_code TEXT',
  'ALTER TABLE faturamentos ADD COLUMN periodo_inicio TEXT',
  'ALTER TABLE faturamentos ADD COLUMN periodo_fim TEXT',
  'ALTER TABLE cupons ADD COLUMN descricao TEXT',
  'ALTER TABLE cupons ADD COLUMN valido_de TEXT',
  "ALTER TABLE cupons ADD COLUMN status_manual TEXT DEFAULT 'active'",
];

let _db;
function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    MIGRATIONS.forEach(sql => { try { _db.exec(sql); } catch (_e) {} });
  }
  return _db;
}
module.exports = getDb;
