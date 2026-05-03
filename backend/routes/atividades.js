const express = require('express');
const router = express.Router();
const getDb = require('../db');
const auth = require('../middleware/auth');
router.use(auth);
const filtroOrg = (req) => req.usuario.role === 'super_admin' ? null : req.usuario.organizacao_id;

router.get('/', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req);
  const { lead_id, concluida, limit } = req.query;
  let sql = 'SELECT * FROM atividades WHERE 1=1'; const p = [];
  if (orgId) { sql += ' AND organizacao_id = ?'; p.push(orgId); }
  if (lead_id) { sql += ' AND lead_id = ?'; p.push(lead_id); }
  if (concluida !== undefined) { sql += ' AND concluida = ?'; p.push(Number(concluida)); }
  sql += ' ORDER BY created_date DESC';
  if (limit) { sql += ' LIMIT ?'; p.push(Number(limit)); }
  res.json({ data: db.prepare(sql).all(...p) });
});

router.get('/:id', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req);
  let sql = 'SELECT * FROM atividades WHERE id = ?'; const p = [req.params.id];
  if (orgId) { sql += ' AND organizacao_id = ?'; p.push(orgId); }
  const row = db.prepare(sql).get(...p);
  if (!row) return res.status(404).json({ error: 'Atividade não encontrada' });
  res.json({ data: row });
});

router.post('/', (req, res) => {
  const db = getDb(); const d = req.body.atividade ?? req.body;
  const orgId = filtroOrg(req) ?? d.organizacao_id;
  const result = db.prepare('INSERT INTO atividades (lead_id,activity_type,titulo,descricao,data_agendada,concluida,concluida_em,organizacao_id,usuario_id) VALUES (?,?,?,?,?,?,?,?,?)').run(d.lead_id??null,d.activity_type??'nota',d.titulo??null,d.descricao??null,d.data_agendada??null,d.concluida?1:0,d.concluida_em??null,orgId,d.usuario_id??req.usuario.id);
  res.status(201).json({ data: db.prepare('SELECT * FROM atividades WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/:id', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req); const d = req.body.atividade ?? req.body;
  let chk = 'SELECT id FROM atividades WHERE id = ?'; const cp = [req.params.id];
  if (orgId) { chk += ' AND organizacao_id = ?'; cp.push(orgId); }
  if (!db.prepare(chk).get(...cp)) return res.status(404).json({ error: 'Atividade não encontrada' });
  const cols = ['activity_type','titulo','descricao','data_agendada','concluida','concluida_em'];
  const sets = []; const params = [];
  cols.forEach(c => { if (d[c] !== undefined) { sets.push(`${c} = ?`); params.push(c==='concluida'?(d[c]?1:0):d[c]); } });
  if (sets.length) { params.push(req.params.id); db.prepare(`UPDATE atividades SET ${sets.join(',')} WHERE id = ?`).run(...params); }
  res.json({ data: db.prepare('SELECT * FROM atividades WHERE id = ?').get(req.params.id) });
});

router.delete('/:id', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req);
  let sql = 'DELETE FROM atividades WHERE id = ?'; const p = [req.params.id];
  if (orgId) { sql += ' AND organizacao_id = ?'; p.push(orgId); }
  const r = db.prepare(sql).run(...p);
  if (r.changes === 0) return res.status(404).json({ error: 'Atividade não encontrada' });
  res.json({ data: { id: Number(req.params.id) } });
});

module.exports = router;
