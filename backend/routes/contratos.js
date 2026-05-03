const express = require('express');
const router = express.Router();
const getDb = require('../db');
const auth = require('../middleware/auth');
router.use(auth);
const filtroOrg = (req) => req.usuario.role === 'super_admin' ? null : req.usuario.organizacao_id;

router.get('/', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req);
  const { status, limit } = req.query;
  let sql = 'SELECT * FROM contratos WHERE 1=1'; const p = [];
  if (orgId) { sql += ' AND organizacao_id = ?'; p.push(orgId); }
  if (status) { sql += ' AND status = ?'; p.push(status); }
  sql += ' ORDER BY created_date DESC';
  if (limit) { sql += ' LIMIT ?'; p.push(Number(limit)); }
  res.json({ data: db.prepare(sql).all(...p) });
});

router.get('/:id', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req);
  let sql = 'SELECT * FROM contratos WHERE id = ?'; const p = [req.params.id];
  if (orgId) { sql += ' AND organizacao_id = ?'; p.push(orgId); }
  const row = db.prepare(sql).get(...p);
  if (!row) return res.status(404).json({ error: 'Contrato não encontrado' });
  res.json({ data: row });
});

router.post('/', (req, res) => {
  const db = getDb(); const d = req.body.contrato ?? req.body;
  const orgId = filtroOrg(req) ?? d.organizacao_id;
  const result = db.prepare('INSERT INTO contratos (lead_id,cliente_nome,contract_type,valor_mensal,valor_instalacao,data_inicio,data_fim,status,payment_method,organizacao_id) VALUES (?,?,?,?,?,?,?,?,?,?)').run(d.lead_id??null,d.cliente_nome??null,d.contract_type??'monitoramento_comodato',d.valor_mensal??0,d.valor_instalacao??0,d.data_inicio??null,d.data_fim??null,d.status??'ativo',d.payment_method??'boleto',orgId);
  res.status(201).json({ data: db.prepare('SELECT * FROM contratos WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/:id', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req); const d = req.body.contrato ?? req.body;
  let chk = 'SELECT id FROM contratos WHERE id = ?'; const cp = [req.params.id];
  if (orgId) { chk += ' AND organizacao_id = ?'; cp.push(orgId); }
  if (!db.prepare(chk).get(...cp)) return res.status(404).json({ error: 'Contrato não encontrado' });
  const cols = ['cliente_nome','contract_type','valor_mensal','valor_instalacao','data_inicio','data_fim','status','payment_method'];
  const sets = []; const params = [];
  cols.forEach(c => { if (d[c] !== undefined) { sets.push(`${c} = ?`); params.push(d[c]); } });
  if (sets.length) { params.push(req.params.id); db.prepare(`UPDATE contratos SET ${sets.join(',')} WHERE id = ?`).run(...params); }
  res.json({ data: db.prepare('SELECT * FROM contratos WHERE id = ?').get(req.params.id) });
});

router.delete('/:id', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req);
  let sql = 'DELETE FROM contratos WHERE id = ?'; const p = [req.params.id];
  if (orgId) { sql += ' AND organizacao_id = ?'; p.push(orgId); }
  const r = db.prepare(sql).run(...p);
  if (r.changes === 0) return res.status(404).json({ error: 'Contrato não encontrado' });
  res.json({ data: { id: Number(req.params.id) } });
});

module.exports = router;
