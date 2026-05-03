const express = require('express');
const router = express.Router();
const getDb = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

function filtroOrg(req) {
  return req.usuario.role === 'super_admin' ? null : req.usuario.organizacao_id;
}

// GET /api/v1/pos_vendas
router.get('/', (req, res) => {
  const db = getDb();
  const orgId = filtroOrg(req);
  const { status, limit } = req.query;

  let sql = 'SELECT * FROM pos_vendas WHERE 1=1';
  const params = [];

  if (orgId) { sql += ' AND organizacao_id = ?'; params.push(orgId); }
  if (status) { sql += ' AND status = ?'; params.push(status); }

  sql += ' ORDER BY created_date DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }

  res.json({ data: db.prepare(sql).all(...params) });
});

// GET /api/v1/pos_vendas/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const orgId = filtroOrg(req);
  let sql = 'SELECT * FROM pos_vendas WHERE id = ?';
  const params = [req.params.id];
  if (orgId) { sql += ' AND organizacao_id = ?'; params.push(orgId); }

  const row = db.prepare(sql).get(...params);
  if (!row) return res.status(404).json({ error: 'Ação não encontrada' });
  res.json({ data: row });
});

// POST /api/v1/pos_vendas
router.post('/', (req, res) => {
  const db = getDb();
  const d = req.body.pos_venda ?? req.body;
  const orgId = filtroOrg(req) ?? d.organizacao_id;

  const result = db.prepare(`
    INSERT INTO pos_vendas (client_name, post_sale_type, titulo, descricao, status,
      due_date, satisfaction_score, notes, completed_date, organizacao_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.client_name ?? null,
    d.post_sale_type ?? 'onboarding',
    d.titulo ?? null,
    d.descricao ?? null,
    d.status ?? 'pendente',
    d.due_date ?? null,
    d.satisfaction_score ?? null,
    d.notes ?? null,
    d.completed_date ?? null,
    orgId
  );

  res.status(201).json({ data: db.prepare('SELECT * FROM pos_vendas WHERE id = ?').get(result.lastInsertRowid) });
});

// PUT /api/v1/pos_vendas/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const orgId = filtroOrg(req);
  const d = req.body.pos_venda ?? req.body;

  let check = 'SELECT id FROM pos_vendas WHERE id = ?';
  const cp = [req.params.id];
  if (orgId) { check += ' AND organizacao_id = ?'; cp.push(orgId); }
  if (!db.prepare(check).get(...cp)) return res.status(404).json({ error: 'Ação não encontrada' });

  const campos = ['client_name','post_sale_type','titulo','descricao','status','due_date','satisfaction_score','notes','completed_date'];
  const sets = [];
  const params = [];

  campos.forEach(c => { if (d[c] !== undefined) { sets.push(`${c} = ?`); params.push(d[c]); } });

  if (sets.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE pos_vendas SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  }

  res.json({ data: db.prepare('SELECT * FROM pos_vendas WHERE id = ?').get(req.params.id) });
});

// DELETE /api/v1/pos_vendas/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const orgId = filtroOrg(req);
  let sql = 'DELETE FROM pos_vendas WHERE id = ?';
  const params = [req.params.id];
  if (orgId) { sql += ' AND organizacao_id = ?'; params.push(orgId); }

  const result = db.prepare(sql).run(...params);
  if (result.changes === 0) return res.status(404).json({ error: 'Ação não encontrada' });
  res.json({ data: { id: Number(req.params.id) } });
});

module.exports = router;
