const express = require('express');
const router = express.Router();
const getDb = require('../db');
const auth = require('../middleware/auth');
router.use(auth);
const filtroOrg = (req) => req.usuario.role === 'super_admin' ? null : req.usuario.organizacao_id;

router.get('/', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req);
  const { status, contrato_id, comissao_usuario_id, limit } = req.query;
  let sql = 'SELECT * FROM financeiros WHERE 1=1'; const p = [];
  if (orgId) { sql += ' AND organizacao_id = ?'; p.push(orgId); }
  if (status) { sql += ' AND status = ?'; p.push(status); }
  if (contrato_id) { sql += ' AND contrato_id = ?'; p.push(contrato_id); }
  if (comissao_usuario_id) { sql += ' AND comissao_usuario_id = ?'; p.push(comissao_usuario_id); }
  sql += ' ORDER BY vencimento ASC';
  if (limit) { sql += ' LIMIT ?'; p.push(Number(limit)); }
  res.json({ data: db.prepare(sql).all(...p) });
});

router.get('/:id', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req);
  let sql = 'SELECT * FROM financeiros WHERE id = ?'; const p = [req.params.id];
  if (orgId) { sql += ' AND organizacao_id = ?'; p.push(orgId); }
  const row = db.prepare(sql).get(...p);
  if (!row) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json({ data: row });
});

router.post('/', (req, res) => {
  const db = getDb(); const d = req.body.financeiro ?? req.body;
  const orgId = filtroOrg(req) ?? d.organizacao_id;
  const result = db.prepare('INSERT INTO financeiros (contrato_id,cliente_nome,financial_type,valor,vencimento,status,payment_method,data_pagamento,comissao_usuario_id,comissao_valor,organizacao_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(d.contrato_id??null,d.cliente_nome??null,d.financial_type??'mensalidade',d.valor??0,d.vencimento??null,d.status??'pendente',d.payment_method??null,d.data_pagamento??null,d.comissao_usuario_id??null,d.comissao_valor??0,orgId);
  res.status(201).json({ data: db.prepare('SELECT * FROM financeiros WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/:id', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req); const d = req.body.financeiro ?? req.body;
  let chk = 'SELECT id FROM financeiros WHERE id = ?'; const cp = [req.params.id];
  if (orgId) { chk += ' AND organizacao_id = ?'; cp.push(orgId); }
  if (!db.prepare(chk).get(...cp)) return res.status(404).json({ error: 'Registro não encontrado' });
  const cols = ['cliente_nome','financial_type','valor','vencimento','status','payment_method','data_pagamento','comissao_usuario_id','comissao_valor'];
  const sets = []; const params = [];
  cols.forEach(c => { if (d[c] !== undefined) { sets.push(`${c} = ?`); params.push(d[c]); } });
  if (sets.length) { params.push(req.params.id); db.prepare(`UPDATE financeiros SET ${sets.join(',')} WHERE id = ?`).run(...params); }
  res.json({ data: db.prepare('SELECT * FROM financeiros WHERE id = ?').get(req.params.id) });
});

router.delete('/:id', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req);
  let sql = 'DELETE FROM financeiros WHERE id = ?'; const p = [req.params.id];
  if (orgId) { sql += ' AND organizacao_id = ?'; p.push(orgId); }
  const r = db.prepare(sql).run(...p);
  if (r.changes === 0) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json({ data: { id: Number(req.params.id) } });
});

module.exports = router;
