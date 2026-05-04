const express = require('express');
const router  = express.Router();
const getDb   = require('../db');
const auth    = require('../middleware/auth');

router.use(auth);

function checkSuperAdmin(req, res, next) {
  if (req.usuario.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

// GET /api/v1/faturamentos
router.get('/', checkSuperAdmin, (req, res) => {
  const db = getDb();
  const { status, organizacao_id, limit } = req.query;
  let sql = 'SELECT * FROM faturamentos WHERE 1=1';
  const params = [];
  if (status)         { sql += ' AND status = ?';         params.push(status); }
  if (organizacao_id) { sql += ' AND organizacao_id = ?'; params.push(organizacao_id); }
  sql += ' ORDER BY created_date DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }
  res.json({ data: db.prepare(sql).all(...params) });
});

// GET /api/v1/faturamentos/:id
router.get('/:id', checkSuperAdmin, (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM faturamentos WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Faturamento não encontrado' });
  res.json({ data: row });
});

// POST /api/v1/faturamentos
router.post('/', checkSuperAdmin, (req, res) => {
  const db = getDb();
  const d  = req.body.faturamento ?? req.body;

  let orgNome = d.org_nome ?? null;
  if (d.organizacao_id && !orgNome) {
    const org = db.prepare('SELECT nome FROM organizacoes WHERE id = ?').get(d.organizacao_id);
    orgNome   = org?.nome ?? null;
  }

  const total  = (d.valor ?? 0) - (d.desconto ?? 0);
  const result = db.prepare(`
    INSERT INTO faturamentos
      (organizacao_id, org_nome, tipo, valor, desconto, total,
       vencimento, status, payment_method, pago_em,
       plano, coupon_code, periodo_inicio, periodo_fim)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.organizacao_id ?? null,
    orgNome,
    d.tipo           ?? 'renovacao',
    d.valor          ?? 0,
    d.desconto       ?? 0,
    total,
    d.vencimento     ?? null,
    d.status         ?? 'pendente',
    d.payment_method ?? 'pix',
    d.pago_em        ?? null,
    d.plano          ?? null,
    d.coupon_code    ?? null,
    d.periodo_inicio ?? null,
    d.periodo_fim    ?? null,
  );

  res.status(201).json({ data: db.prepare('SELECT * FROM faturamentos WHERE id = ?').get(result.lastInsertRowid) });
});

// PUT /api/v1/faturamentos/:id
router.put('/:id', checkSuperAdmin, (req, res) => {
  const db = getDb();
  const d  = req.body.faturamento ?? req.body;

  if (!db.prepare('SELECT id FROM faturamentos WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Faturamento não encontrado' });
  }

  const campos = ['organizacao_id','org_nome','tipo','valor','desconto','total',
                  'vencimento','status','payment_method','pago_em',
                  'plano','coupon_code','periodo_inicio','periodo_fim'];
  const sets = []; const params = [];

  campos.forEach(c => { if (d[c] !== undefined) { sets.push(`${c} = ?`); params.push(d[c]); } });

  // Recalculate total if value or discount changed
  if ((d.valor !== undefined || d.desconto !== undefined) && !sets.includes('total = ?')) {
    const atual = db.prepare('SELECT valor, desconto FROM faturamentos WHERE id = ?').get(req.params.id);
    sets.push('total = ?');
    params.push((d.valor ?? atual.valor) - (d.desconto ?? atual.desconto));
  }

  if (sets.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE faturamentos SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  }

  res.json({ data: db.prepare('SELECT * FROM faturamentos WHERE id = ?').get(req.params.id) });
});

// DELETE /api/v1/faturamentos/:id
router.delete('/:id', checkSuperAdmin, (req, res) => {
  const db     = getDb();
  const result = db.prepare('DELETE FROM faturamentos WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Faturamento não encontrado' });
  res.json({ data: { id: Number(req.params.id) } });
});

module.exports = router;
