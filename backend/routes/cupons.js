const express = require('express');
const router  = express.Router();
const getDb   = require('../db');
const auth    = require('../middleware/auth');

router.use(auth);

// GET /api/v1/cupons
router.get('/', (req, res) => {
  const db   = getDb();
  const rows = db.prepare('SELECT * FROM cupons ORDER BY created_date DESC').all();
  res.json({ data: rows });
});

// GET /api/v1/cupons/:id  (accepts numeric id or coupon code)
router.get('/:id', (req, res) => {
  const db        = getDb();
  const isNumeric = /^\d+$/.test(req.params.id);
  const row = isNumeric
    ? db.prepare('SELECT * FROM cupons WHERE id = ?').get(req.params.id)
    : db.prepare('SELECT * FROM cupons WHERE codigo = ?').get(req.params.id.toUpperCase());
  if (!row) return res.status(404).json({ error: 'Cupom não encontrado' });
  res.json({ data: row });
});

// POST /api/v1/cupons (super_admin only)
router.post('/', (req, res) => {
  if (req.usuario.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });

  const db = getDb();
  const d  = req.body.cupom ?? req.body;
  if (!d.codigo) return res.status(400).json({ error: 'Código do cupom é obrigatório' });

  try {
    const result = db.prepare(`
      INSERT INTO cupons
        (codigo, desconto, tipo_desconto, validade, limite_uso, usos,
         descricao, valido_de, status_manual)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      d.codigo.toUpperCase().trim(),
      d.desconto       ?? 0,
      d.tipo_desconto  ?? 'percentual',
      d.validade       ?? null,
      d.limite_uso     ?? null,
      0,
      d.descricao      ?? null,
      d.valido_de      ?? null,
      d.status_manual  ?? 'active',
    );
    res.status(201).json({ data: db.prepare('SELECT * FROM cupons WHERE id = ?').get(result.lastInsertRowid) });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(422).json({ error: 'Código já existe' });
    throw e;
  }
});

// PUT /api/v1/cupons/:id
router.put('/:id', (req, res) => {
  if (req.usuario.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });

  const db = getDb();
  const d  = req.body.cupom ?? req.body;

  if (!db.prepare('SELECT id FROM cupons WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Cupom não encontrado' });
  }

  const campos = ['codigo','desconto','tipo_desconto','validade','limite_uso','usos',
                  'descricao','valido_de','status_manual'];
  const sets = []; const params = [];

  campos.forEach(c => {
    if (d[c] !== undefined) {
      sets.push(`${c} = ?`);
      params.push(c === 'codigo' ? d[c].toUpperCase().trim() : d[c]);
    }
  });

  if (sets.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE cupons SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  }

  res.json({ data: db.prepare('SELECT * FROM cupons WHERE id = ?').get(req.params.id) });
});

// DELETE /api/v1/cupons/:id (super_admin only)
router.delete('/:id', (req, res) => {
  if (req.usuario.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });

  const db     = getDb();
  const result = db.prepare('DELETE FROM cupons WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Cupom não encontrado' });
  res.json({ data: { id: Number(req.params.id) } });
});

module.exports = router;
