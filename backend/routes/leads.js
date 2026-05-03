const express = require('express');
const router = express.Router();
const getDb = require('../db');
const auth = require('../middleware/auth');
router.use(auth);

const filtroOrg = (req) => req.usuario.role === 'super_admin' ? null : req.usuario.organizacao_id;

router.get('/', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req);
  const { status, temperatura, origem, tipo_negocio, tipo_imovel, urgencia, limit } = req.query;
  let sql = 'SELECT * FROM leads WHERE 1=1'; const p = [];
  if (orgId) { sql += ' AND organizacao_id = ?'; p.push(orgId); }
  if (status) { sql += ' AND status = ?'; p.push(status); }
  if (temperatura) { sql += ' AND temperatura = ?'; p.push(temperatura); }
  if (origem) { sql += ' AND origem = ?'; p.push(origem); }
  if (tipo_negocio) { sql += ' AND tipo_negocio = ?'; p.push(tipo_negocio); }
  if (tipo_imovel) { sql += ' AND tipo_imovel = ?'; p.push(tipo_imovel); }
  if (urgencia) { sql += ' AND urgencia = ?'; p.push(urgencia); }
  sql += ' ORDER BY created_date DESC';
  if (limit) { sql += ' LIMIT ?'; p.push(Number(limit)); }
  res.json({ data: db.prepare(sql).all(...p) });
});

router.get('/:id', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req);
  let sql = 'SELECT * FROM leads WHERE id = ?'; const p = [req.params.id];
  if (orgId) { sql += ' AND organizacao_id = ?'; p.push(orgId); }
  const row = db.prepare(sql).get(...p);
  if (!row) return res.status(404).json({ error: 'Lead não encontrado' });
  res.json({ data: row });
});

router.post('/', (req, res) => {
  const db = getDb(); const d = req.body.lead ?? req.body;
  const orgId = filtroOrg(req) ?? d.organizacao_id;
  const result = db.prepare(`INSERT INTO leads (nome,empresa,telefone,email,cep,endereco,cidade,estado,status,temperatura,origem,tipo_negocio,tipo_imovel,subtipo_imovel,urgencia,valor_estimado,latitude,longitude,organizacao_id,criado_por) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(d.nome,d.empresa??null,d.telefone??null,d.email??null,d.cep??null,d.endereco??null,d.cidade??null,d.estado??null,d.status??'novo',d.temperatura??'frio',d.origem??null,d.tipo_negocio??null,d.tipo_imovel??null,d.subtipo_imovel??null,d.urgencia??'media',d.valor_estimado??null,d.latitude??null,d.longitude??null,orgId,req.usuario.id);
  res.status(201).json({ data: db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/:id', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req); const d = req.body.lead ?? req.body;
  let chk = 'SELECT id FROM leads WHERE id = ?'; const cp = [req.params.id];
  if (orgId) { chk += ' AND organizacao_id = ?'; cp.push(orgId); }
  if (!db.prepare(chk).get(...cp)) return res.status(404).json({ error: 'Lead não encontrado' });
  const cols = ['nome','empresa','telefone','email','cep','endereco','cidade','estado','status','temperatura','origem','tipo_negocio','tipo_imovel','subtipo_imovel','urgencia','valor_estimado','latitude','longitude'];
  const sets = []; const params = [];
  cols.forEach(c => { if (d[c] !== undefined) { sets.push(`${c} = ?`); params.push(d[c]); } });
  if (sets.length) { params.push(req.params.id); db.prepare(`UPDATE leads SET ${sets.join(',')} WHERE id = ?`).run(...params); }
  res.json({ data: db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id) });
});

router.delete('/:id', (req, res) => {
  const db = getDb(); const orgId = filtroOrg(req);
  let sql = 'DELETE FROM leads WHERE id = ?'; const p = [req.params.id];
  if (orgId) { sql += ' AND organizacao_id = ?'; p.push(orgId); }
  const r = db.prepare(sql).run(...p);
  if (r.changes === 0) return res.status(404).json({ error: 'Lead não encontrado' });
  res.json({ data: { id: Number(req.params.id) } });
});

module.exports = router;
