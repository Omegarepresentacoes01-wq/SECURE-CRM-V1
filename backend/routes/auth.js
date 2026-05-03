const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getDb = require('../db');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_secure_crm_dev';

function publicar(u) {
  return { id: u.id, nome: u.nome, email: u.email, role: u.role, organizacao_id: u.organizacao_id, avatar: u.avatar ?? null };
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  const db = getDb();
  const usuario = db.prepare('SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (!usuario || !bcrypt.compareSync(password, usuario.senha_hash)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, role: usuario.role, organizacao_id: usuario.organizacao_id },
    JWT_SECRET, { expiresIn: '7d' }
  );
  res.json({ token, usuario: publicar(usuario) });
});

router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ usuario: publicar(usuario) });
});

module.exports = router;
