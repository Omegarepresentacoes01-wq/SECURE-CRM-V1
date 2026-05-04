const express = require('express');
const router = express.Router();
const getDb = require('../db');
const auth = require('../middleware/auth');
router.use(auth);

const PLAN_LIMITS = { basico: 3, profissional: 10, enterprise: 50 };

function comStats(org, db) {
  if (!org) return org;
  const vendedores = db.prepare("SELECT COUNT(*) as c FROM usuarios WHERE organizacao_id = ? AND role = 'user'").get(org.id)?.c ?? 0;
  const limite = org.limite_usuarios ?? PLAN_LIMITS[org.plano] ?? 3;
  // Dias restantes de trial
  let trial_dias = null;
  if (org.trial_fim) {
    const ms = new Date(org.trial_fim) - new Date();
    trial_dias = Math.max(0, Math.ceil(ms / 86400000));
  }
  return { ...org, vendedores_ativos: vendedores, limite_vendedores: limite, trial_dias };
}

// GET /api/v1/organizacoes/minha  (admin/user vê a própria org)
router.get('/minha', (req, res) => {
  const db = getDb();
  if (!req.usuario.organizacao_id) return res.status(404).json({ error: 'Sem organização vinculada' });
  const org = db.prepare('SELECT * FROM organizacoes WHERE id = ?').get(req.usuario.organizacao_id);
  if (!org) return res.status(404).json({ error: 'Organização não encontrada' });
  res.json({ data: comStats(org, db) });
});

// GET /api/v1/organizacoes
router.get('/', (req, res) => {
  const db = getDb();
  if (req.usuario.role !== 'super_admin') {
    const org = db.prepare('SELECT * FROM organizacoes WHERE id = ?').get(req.usuario.organizacao_id);
    return res.json({ data: org ? [comStats(org, db)] : [] });
  }
  const { status, plano, limit } = req.query;
  let sql = 'SELECT * FROM organizacoes WHERE 1=1'; const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (plano)  { sql += ' AND plano = ?';  params.push(plano); }
  sql += ' ORDER BY created_date DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }
  res.json({ data: db.prepare(sql).all(...params).map(o => comStats(o, db)) });
});

// GET /api/v1/organizacoes/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  if (req.usuario.role !== 'super_admin' && Number(req.params.id) !== req.usuario.organizacao_id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const row = db.prepare('SELECT * FROM organizacoes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Organização não encontrada' });
  res.json({ data: comStats(row, db) });
});

// POST /api/v1/organizacoes
// super_admin can always create; a user with no org may create their own (onboarding)
router.post('/', (req, res) => {
  const canCreate = req.usuario.role === 'super_admin' || req.usuario.organizacao_id == null;
  if (!canCreate) return res.status(403).json({ error: 'Acesso negado' });
  const db = getDb(); const d = req.body.organizacao ?? req.body;
  // trial_fim = hoje + 10 dias para orgs em trial
  let trial_fim = d.trial_fim ?? null;
  if ((d.status ?? 'trial') === 'trial' && !trial_fim) {
    const dt = new Date(); dt.setDate(dt.getDate() + 10);
    trial_fim = dt.toISOString().split('T')[0];
  }
  const plano  = d.plano ?? 'basico';
  const limite = d.limite_usuarios ?? PLAN_LIMITS[plano] ?? 3;
  // Non-super_admin onboarding: force trial status
  const status = req.usuario.role === 'super_admin' ? (d.status ?? 'trial') : 'trial';
  const result = db.prepare(`INSERT INTO organizacoes (nome,cnpj,responsavel,email,telefone,status,plano,valor_mensal,limite_usuarios,vencimento_plano,trial_fim,inicio_assinatura) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(d.nome,d.cnpj??null,d.responsavel??null,d.email??null,d.telefone??null,status,plano,d.valor_mensal??0,limite,d.vencimento_plano??null,trial_fim,d.inicio_assinatura??null);
  res.status(201).json({ data: comStats(db.prepare('SELECT * FROM organizacoes WHERE id = ?').get(result.lastInsertRowid), db) });
});

// PUT /api/v1/organizacoes/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  if (req.usuario.role !== 'super_admin' && Number(req.params.id) !== req.usuario.organizacao_id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  if (!db.prepare('SELECT id FROM organizacoes WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Organização não encontrada' });
  }
  const d = req.body.organizacao ?? req.body;
  const campos = ['nome','cnpj','responsavel','email','telefone','status','plano','valor_mensal','limite_usuarios','vencimento_plano','trial_fim','inicio_assinatura'];
  const sets = []; const params = [];
  campos.forEach(c => { if (d[c] !== undefined) { sets.push(`${c} = ?`); params.push(d[c]); } });
  // Atualiza limite automaticamente se plano mudou e limite_usuarios não foi passado
  if (d.plano && d.limite_usuarios === undefined) {
    sets.push('limite_usuarios = ?'); params.push(PLAN_LIMITS[d.plano] ?? 3);
  }
  if (sets.length > 0) { params.push(req.params.id); db.prepare(`UPDATE organizacoes SET ${sets.join(', ')} WHERE id = ?`).run(...params); }
  res.json({ data: comStats(db.prepare('SELECT * FROM organizacoes WHERE id = ?').get(req.params.id), db) });
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
