const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const getDb = require('../db');
const auth = require('../middleware/auth');
router.use(auth);

const PLAN_LIMITS = { basico: 3, profissional: 10, enterprise: 50 };

function publicar(u) {
  return { id: u.id, nome: u.nome, email: u.email, role: u.role, organizacao_id: u.organizacao_id, avatar: u.avatar, created_date: u.created_date };
}

router.get('/', (req, res) => {
  const db = getDb();
  let sql; const params = [];
  if (req.usuario.role === 'super_admin') {
    sql = 'SELECT * FROM usuarios ORDER BY created_date DESC';
  } else {
    sql = 'SELECT * FROM usuarios WHERE organizacao_id = ? ORDER BY created_date DESC';
    params.push(req.usuario.organizacao_id);
  }
  if (req.query.limit) { sql += ' LIMIT ?'; params.push(Number(req.query.limit)); }
  res.json({ data: db.prepare(sql).all(...params).map(publicar) });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (req.usuario.role !== 'super_admin' && u.organizacao_id !== req.usuario.organizacao_id && u.id !== req.usuario.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  res.json({ data: publicar(u) });
});

router.post('/', (req, res) => {
  const db = getDb();
  const d = req.body.usuario ?? req.body;
  if (!d.email || !d.senha) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  if (db.prepare('SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?)').get(d.email.trim())) {
    return res.status(422).json({ error: 'Email já cadastrado' });
  }

  const orgId = req.usuario.role === 'super_admin' ? (d.organizacao_id ?? null) : req.usuario.organizacao_id;
  const role  = d.role ?? 'user';

  // Valida limite de vendedores para a org
  if (role === 'user' && orgId) {
    const org = db.prepare('SELECT plano, limite_usuarios FROM organizacoes WHERE id = ?').get(orgId);
    if (org) {
      const limite = org.limite_usuarios ?? PLAN_LIMITS[org.plano] ?? 3;
      const atual = db.prepare("SELECT COUNT(*) as c FROM usuarios WHERE organizacao_id = ? AND role = 'user'").get(orgId).c;
      if (atual >= limite) {
        return res.status(422).json({
          error: `Limite de vendedores atingido (${atual}/${limite}). Faça upgrade do plano para adicionar mais.`,
          limite, atual
        });
      }
    }
  }

  const hash = bcrypt.hashSync(d.senha, 10);
  const result = db.prepare('INSERT INTO usuarios (nome, email, senha_hash, role, organizacao_id, avatar) VALUES (?, ?, ?, ?, ?, ?)')
    .run(d.nome, d.email.toLowerCase().trim(), hash, role, orgId, d.avatar ?? null);

  res.status(201).json({ data: publicar(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(result.lastInsertRowid)) });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const alvo = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });
  const podeEditar = req.usuario.role === 'super_admin' || alvo.id === req.usuario.id ||
    (req.usuario.role === 'admin' && alvo.organizacao_id === req.usuario.organizacao_id);
  if (!podeEditar) return res.status(403).json({ error: 'Acesso negado' });

  const d = req.body.usuario ?? req.body;
  const sets = []; const params = [];
  if (d.nome  !== undefined) { sets.push('nome = ?');  params.push(d.nome); }
  if (d.email !== undefined) { sets.push('email = ?'); params.push(d.email.toLowerCase().trim()); }
  if (d.avatar !== undefined) { sets.push('avatar = ?'); params.push(d.avatar); }
  // Allow onboarding: a user with no org may set their own org and become admin
  const isOwnOnboarding = alvo.id === req.usuario.id && alvo.organizacao_id === null;
  if (d.role !== undefined && (req.usuario.role === 'super_admin' || isOwnOnboarding)) { sets.push('role = ?'); params.push(d.role); }
  if (d.organizacao_id !== undefined && (req.usuario.role === 'super_admin' || isOwnOnboarding)) { sets.push('organizacao_id = ?'); params.push(d.organizacao_id); }
  if (d.senha) { sets.push('senha_hash = ?'); params.push(bcrypt.hashSync(d.senha, 10)); }

  if (sets.length > 0) { params.push(req.params.id); db.prepare(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`).run(...params); }
  res.json({ data: publicar(db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id)) });
});

router.delete('/:id', (req, res) => {
  if (req.usuario.role !== 'super_admin' && req.usuario.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const db = getDb();
  // Admin só deleta usuários da própria org
  if (req.usuario.role === 'admin') {
    const u = db.prepare('SELECT organizacao_id FROM usuarios WHERE id = ?').get(req.params.id);
    if (!u || u.organizacao_id !== req.usuario.organizacao_id) return res.status(403).json({ error: 'Acesso negado' });
  }
  const result = db.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ data: { id: Number(req.params.id) } });
});

module.exports = router;
