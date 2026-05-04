import apiClient from './apiClient';

const TOKEN_KEY   = 'crm_token';
const USUARIO_KEY = 'crm_usuario';

// A API retorna organizacao_id (PT), mas o Layout.jsx e outros componentes
function normalizarUsuario(u) {
  if (!u) return u;
  return {
    ...u,
    full_name:       u.nome ?? u.full_name ?? null,
    organization_id: u.organizacao_id ?? u.organization_id ?? null,
  };
}

const auth = {
  // POST /api/v1/auth/login
  async login(email, password) {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token, usuario } = res.data;
    const normalizado = normalizarUsuario(usuario);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(normalizado));
    return normalizado;
  },

  // GET /api/v1/auth/me
  async me() {
    const res = await apiClient.get('/auth/me');
    const normalizado = normalizarUsuario(res.data.usuario);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(normalizado));
    return normalizado;
  },

  // PUT /api/v1/usuarios/:id
  async updateMe(dados) {
    const usuario = this.usuarioLocal();
    if (!usuario) throw new Error('Usuário não autenticado');
    // Traduz organization_id → organizacao_id (Rails usa PT)
    const d = { ...dados };
    if (d.organization_id != null) { d.organizacao_id = d.organization_id; delete d.organization_id; }
    const res = await apiClient.put(`/usuarios/${usuario.id}`, { usuario: d });
    const normalizado = normalizarUsuario(res.data.data);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(normalizado));
    return normalizado;
  },

  // Verifica se há token válido salvo
  isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  // Retorna o usuário salvo no localStorage (sem chamar a API)
  usuarioLocal() {
    try {
      return JSON.parse(localStorage.getItem(USUARIO_KEY));
    } catch {
      return null;
    }
  },

  // Redireciona para a tela de login
  redirectToLogin(_fromUrl) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    window.location.href = '/Login';
  },

  // Logout
  logout(redirectUrl) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    if (redirectUrl !== undefined) {
      window.location.href = '/Login';
    }
  },
};

export default auth;
