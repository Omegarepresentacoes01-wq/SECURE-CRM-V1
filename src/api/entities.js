/**
 * Camada de entidades — substitui o SDK Base44.
 * Replica a interface: Entity.list(), .filter(), .create(), .update(), .delete()
 */
import apiClient from './apiClient';

// ── Mapeamentos de enum (Base44/inglês → Rails/português) ────────────────────
const MAPS = {
  lead_status:      { new:'novo', contacted:'contato_realizado', qualified:'qualificado', proposal:'proposta', negotiation:'negociacao', won:'ganho', lost:'perdido' },
  temperature:      { cold:'frio', warm:'morno', hot:'quente' },
  origin:           { paid_traffic:'trafego_pago', referral:'indicacao', inbound:'inbound', cold_call:'cold_call', website:'site', social_media:'redes_sociais', event:'evento', partner:'parceiro', other:'outros' },
  business_type:    { monitoring_comodato:'monitoramento_comodato', equipment_sale:'venda_equipamentos', monitoring_only:'monitoramento_apenas', project:'projeto' },
  property_type:    { residential:'residencial', commercial:'comercial', industrial:'industrial', condominium:'condominio', rural:'rural' },
  property_subtype: { house:'casa', store:'loja', warehouse:'galpao', apartment:'apartamento', office:'escritorio', factory:'fabrica', farm:'fazenda', other:'outro' },
  urgency:          { low:'baixa', medium:'media', high:'alta' },
  contrato_status:  { active:'ativo', expired:'expirado', cancelled:'cancelado', pending_renewal:'pendente_renovacao' },
  contrato_type:    { monitoring_comodato:'monitoramento_comodato', equipment_sale:'venda_equipamentos', monitoring_only:'monitoramento_apenas', project:'projeto' },
  payment_method:   { boleto:'boleto', credit_card:'cartao_credito', pix:'pix', bank_transfer:'transferencia', debit:'debito' },
  financeiro_status:{ pending:'pendente', paid:'pago', overdue:'vencido', cancelled:'cancelado' },
  financial_type:   { monthly:'mensalidade', installation:'instalacao', equipment_sale:'venda_equipamento', cancellation_fee:'multa_cancelamento', other:'outros' },
  activity_type:    { call:'ligacao', whatsapp:'whatsapp', email:'email', visit:'visita', meeting:'reuniao', proposal:'proposta', technical_visit:'visita_tecnica', note:'nota', follow_up:'follow_up' },
  pos_venda_status: { pending:'pendente', in_progress:'em_andamento', completed:'concluido', cancelled:'cancelado' },
  post_sale_type:   { onboarding:'onboarding', support:'suporte', satisfaction_survey:'pesquisa_satisfacao', renewal:'renovacao', upsell:'upsell', maintenance:'manutencao' },
  org_status:       { trial:'trial', active:'ativo', suspended:'suspenso', cancelled:'cancelado' },
  plan:             { basic:'basico', professional:'profissional', enterprise:'enterprise' },
};

const invertir = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));
const INV = {
  lead_status:      invertir(MAPS.lead_status),
  temperature:      invertir(MAPS.temperature),
  origin:           invertir(MAPS.origin),
  business_type:    invertir(MAPS.business_type),
  property_type:    invertir(MAPS.property_type),
  property_subtype: invertir(MAPS.property_subtype),
  urgency:          invertir(MAPS.urgency),
  activity_type:    invertir(MAPS.activity_type),
  contrato_status:  invertir(MAPS.contrato_status),
  contrato_type:    invertir(MAPS.contrato_type),
  payment_method:   invertir(MAPS.payment_method),
  financeiro_status:invertir(MAPS.financeiro_status),
  financial_type:   invertir(MAPS.financial_type),
  pos_venda_status: invertir(MAPS.pos_venda_status),
  post_sale_type:   invertir(MAPS.post_sale_type),
  org_status:       invertir(MAPS.org_status),
  plan:             invertir(MAPS.plan),
};

const t = (mapa, val) => mapa[val] ?? val;

// Traduz filtros do formato Base44 para Rails
function prepararFiltros(filters = {}) {
  const f = { ...filters };
  if (f.organization_id  != null) { f.organizacao_id = f.organization_id; delete f.organization_id; }
  if (f.status)           f.status           = t(MAPS.lead_status,      f.status);
  if (f.temperature)      f.temperature      = t(MAPS.temperature,      f.temperature);
  if (f.origin)           f.origin           = t(MAPS.origin,           f.origin);
  if (f.business_type)    f.business_type    = t(MAPS.business_type,    f.business_type);
  if (f.property_type)    f.property_type    = t(MAPS.property_type,    f.property_type);
  if (f.urgency)          f.urgency          = t(MAPS.urgency,          f.urgency);
  return f;
}

// Normalizadores (Rails → frontend)
const normLead  = (l) => ({
  ...l,
  status:           t(INV.lead_status,      l.status),
  temperature:      t(INV.temperature,      l.temperature),
  origin:           t(INV.origin,           l.origin),
  business_type:    t(INV.business_type,    l.business_type),
  property_type:    t(INV.property_type,    l.property_type),
  property_subtype: t(INV.property_subtype, l.property_subtype),
  urgency:          t(INV.urgency,          l.urgency),
  organization_id:  l.organizacao_id,
});
const normAtividade = (a) => ({
  ...a,
  type: t(INV.activity_type, a.activity_type),
  organization_id: a.organizacao_id,
});
const normContr = (c) => ({
  ...c,
  status:         t(INV.contrato_status, c.status),
  contract_type:  t(INV.contrato_type,  c.contract_type),
  payment_method: t(INV.payment_method, c.payment_method),
  organization_id: c.organizacao_id,
});
const normFin = (f) => ({
  ...f,
  status:         t(INV.financeiro_status, f.status),
  type:           t(INV.financial_type,    f.financial_type),
  payment_method: t(INV.payment_method,    f.payment_method),
  organization_id: f.organizacao_id,
});
const normPV = (p) => ({
  ...p,
  status: t(INV.pos_venda_status, p.status),
  type:   t(INV.post_sale_type,   p.post_sale_type),
  organization_id: p.organizacao_id,
});
const normOrg   = (o) => ({ ...o, status: t(INV.org_status, o.status) || 'trial', plan: t(INV.plan, o.plan) || 'basic', organization_id: o.id });
const normUser  = (u) => ({ ...u, organization_id: u.organizacao_id ?? null });
const normId    = (x) => x;

// Prepara dados de Organização (inglês → português)
function prepararOrg(dados) {
  const d = { ...dados };
  if (d.plan)   d.plan   = t(MAPS.plan, d.plan);
  if (d.status) d.status = t(MAPS.org_status, d.status);
  if (d.organization_id != null) { d.organizacao_id = d.organization_id; delete d.organization_id; }
  return d;
}

// Prepara dados de Lead (inglês → português)
function prepararLead(dados) {
  const d = { ...dados };
  if (d.status)           d.status           = t(MAPS.lead_status,      d.status);
  if (d.temperature)      d.temperature      = t(MAPS.temperature,      d.temperature);
  if (d.origin)           d.origin           = t(MAPS.origin,           d.origin);
  if (d.business_type)    d.business_type    = t(MAPS.business_type,    d.business_type);
  if (d.property_type)    d.property_type    = t(MAPS.property_type,    d.property_type);
  if (d.property_subtype) d.property_subtype = t(MAPS.property_subtype, d.property_subtype);
  if (d.urgency)          d.urgency          = t(MAPS.urgency,          d.urgency);
  if (d.organization_id != null) { d.organizacao_id = d.organization_id; delete d.organization_id; }
  return d;
}

// Prepara dados de Atividade (inglês → português)
function prepararAtividade(dados) {
  const d = { ...dados };
  if (d.type) { d.activity_type = t(MAPS.activity_type, d.type); delete d.type; }
  if (d.organization_id != null) { d.organizacao_id = d.organization_id; delete d.organization_id; }
  return d;
}

// Prepara dados de Contrato (inglês → português)
function prepararContrato(dados) {
  const d = { ...dados };
  if (d.contract_type)  d.contract_type  = t(MAPS.contrato_type,   d.contract_type);
  if (d.status)         d.status         = t(MAPS.contrato_status,  d.status);
  if (d.payment_method) d.payment_method = t(MAPS.payment_method,   d.payment_method);
  if (d.organization_id != null) { d.organizacao_id = d.organization_id; delete d.organization_id; }
  return d;
}

// Prepara dados de Financeiro (inglês → português)
function prepararFinanceiro(dados) {
  const d = { ...dados };
  if (d.type) { d.financial_type = t(MAPS.financial_type, d.type); delete d.type; }
  if (d.status)         d.status         = t(MAPS.financeiro_status, d.status);
  if (d.payment_method) d.payment_method = t(MAPS.payment_method,    d.payment_method);
  if (d.organization_id != null) { d.organizacao_id = d.organization_id; delete d.organization_id; }
  return d;
}

// Prepara dados de Pós-Venda (inglês → português)
function prepararPosVenda(dados) {
  const d = { ...dados };
  if (d.type) { d.post_sale_type = t(MAPS.post_sale_type, d.type); delete d.type; }
  if (d.status) d.status = t(MAPS.pos_venda_status, d.status);
  if (d.organization_id != null) { d.organizacao_id = d.organization_id; delete d.organization_id; }
  return d;
}

// ── Factory de entidade ──────────────────────────────────────────────────────
function criarEntidade(rota, normalizar = normId, modelKey = null, prepararDados = (x) => x) {
  // Rails strong parameters exigem { model_key: { ...campos } }
  const wrap = (dados) => modelKey ? { [modelKey]: prepararDados(dados) } : prepararDados(dados);

  const extrair = (res) => {
    const d = res.data.data ?? res.data;
    return Array.isArray(d) ? d.map(normalizar) : normalizar(d);
  };

  return {
    async list(_sortField, limit) {
      const params = limit ? { limit } : {};
      return extrair(await apiClient.get(`/${rota}`, { params }));
    },
    async filter(filters = {}, _sortField, limit) {
      const params = { ...prepararFiltros(filters) };
      if (limit) params.limit = limit;
      return extrair(await apiClient.get(`/${rota}`, { params }));
    },
    async get(id) {
      const res = await apiClient.get(`/${rota}/${id}`);
      return normalizar(res.data.data ?? res.data);
    },
    async create(dados) {
      const res = await apiClient.post(`/${rota}`, wrap(dados));
      return normalizar(res.data.data ?? res.data);
    },
    async update(id, dados) {
      const res = await apiClient.put(`/${rota}/${id}`, wrap(dados));
      return normalizar(res.data.data ?? res.data);
    },
    async delete(id) {
      await apiClient.delete(`/${rota}/${id}`);
      return { id };
    },
  };
}

// ── Entidades exportadas ──────────────────────────────────────────────────────
export const Lead         = criarEntidade('leads',        normLead,  'lead',        prepararLead);
export const Activity     = criarEntidade('atividades',   normAtividade, 'atividade', prepararAtividade);
export const Contract     = criarEntidade('contratos',    normContr, 'contrato',    prepararContrato);
export const Financial    = criarEntidade('financeiros',  normFin,   'financeiro',  prepararFinanceiro);
export const PostSale     = criarEntidade('pos_vendas',   normPV,    'pos_venda',   prepararPosVenda);
export const Organization = criarEntidade('organizacoes', normOrg,   'organizacao', prepararOrg);
export const User         = criarEntidade('usuarios',     normUser,  'usuario');
export const Billing      = criarEntidade('faturamentos', normId,    'faturamento');
export const Coupon       = criarEntidade('cupons',       normId,    'cupom');
