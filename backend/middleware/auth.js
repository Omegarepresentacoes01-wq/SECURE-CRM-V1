const jwt    = require('jsonwebtoken');
const getDb  = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'secret_secure_crm_dev';

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token não fornecido' });
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Always fetch fresh user data from DB so role/org changes take effect immediately
    const db      = getDb();
    const usuario = db.prepare('SELECT id, nome, email, role, organizacao_id, avatar FROM usuarios WHERE id = ?').get(decoded.id);
    if (!usuario) return res.status(401).json({ error: 'Usuário não encontrado' });
    req.usuario = usuario;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};
