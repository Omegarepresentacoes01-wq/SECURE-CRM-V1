const express = require('express');
const router = express.Router();
const getDb = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/v1/organizacoes
router.get('/', (req, res) => {
  const db = getDb();
  const { status, plano, limit } = req.query;

  // admin só vê a própria organização
  if (req.usuario.role !== 'super_admin') {
    const org = db.prepare('SELECT * FROM organizacoes WHERE id = ?').get(req.usuario.organizacao_id);
    return res.json({ data: org ? [org] : [] });
  }

  let sql = 'SELECT * FROM organizacoes WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (plano) { sql += ' AND plano = ?'; params.push(plano); }
  sql += ' ORDER BY created_date DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }

  res.json({ data: db.prepare(sql).all(...params) });
});

// GET /api/v1/organizacoes/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  if (req.usuario.role !== 'super_admin' && Number(req.params.id) !== req.usuario.organizacao_id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const row = db.prepare('SELECT * FROM organizacoes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Organização não encontrada' });
  res.json({ data: row });
});

// POST /api/v1/organizacoes (super_admin only)
router.post('/', (req, res) => {
  if (req.usuario.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });

  const db = getDb();
  const d = req.body.organizacao ?? req.body;

  const result = db.prepare(`
    INSERT INTO organizacoes (nome, cnpj, responsavel, email, telefone, status, plano,
      valor_mensal, limite_usuarios, vencimento_plano, trial_fim)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    d.nome,
    d.cnpj ?? null,
    d.responsavel ?? null,
    d.email ?? null,
    d.telefone ?? null,
    d.status ?? 'trial',
    d.plano ?? 'basico',
    d.valor_mensal ?? 0,
    d.limite_usuarios ?? 5,
    d.vencimento_plano ?? null,
    d.trial_fim ?? null
  );

  res.status(201).json({ data: db.prepare('SELECT * FROM organizacoes WHERE id = ?').get(result.lastInsertRowid) });
});

// PUT /api/v1/organizacoes/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  if (req.usuario.role !== 'super_admin' && Number(req.params.id) !== req.usuario.organizacao_id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const d = req.body.organizacao ?? req.body;
  const campos = ['nome','cnpj','responsavel','email','telefone','status','plano','valor_mensal','limite_usuarios','vencimento_plano','trial_fim'];
  const sets = [];
  const params = [];

  campos.forEach(c => { if (d[c] !== undefined) { sets.push(`${c} = ?`); params.push(d[c]); } });

  if (!db.prepare('SELECT id FROM organizacoes WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Organização não encontrada' });
  }

  if (sets.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE organizacoes SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  }

  res.json({ data: db.prepare('SELECT * FROM organizacoes WHERE id = ?').get(req.params.id) });
});

// DELETE /api/v1/organizacoes/:id (super_admin only)
router.delete('/:id', (req, res) => {
  if (req.usuario.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });

  const db = getDb();
  const result = db.prepare('DELETE FROM organizacoes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Organização não encontrada' });
  res.json({ data: { id: Number(req.params.id) } });
});

module.exports = router;
