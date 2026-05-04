/**
 * Camada de entidades — substitui o SDK Base44.
 * Interface: Entity.list(), .filter(), .create(), .update(), .delete(), .get()
 */
import apiClient from './apiClient';

// ── Mapeamentos de enum (frontend/inglês ↔ DB/português) ──────────────────────
const MAPS = {
  lead_status:      { new:'novo', contacted:'contato_realizado', qualified:'qualificado', proposal:'proposta', negotiation:'negociacao', won:'ganho', lost:'perdido' },
  temperature:      { cold:'frio', warm:'morno', hot:'quente' },
  origin:           { paid_traffic:'trafego_pago', referral:'indicacao', inbound:'inbound', cold_call:'cold_call', website:'site', social_media:'redes_sociais', event:'evento', partner:'parceiro', other:'outros' },
  business_type:    { monitoring_comodato:'monitoramento_comodato', equipment_sale:'venda_equipamentos', monitoring_only:'monitoramento_apenas', project:'projeto' },
  property_type:    { residential:'residencial', commercial:'comercial', industrial:'industrial', condominium:'condominio', rural:'rural' },
  property_subtype: { house:'casa', store:'loja', warehouse:'galpao', apartment:'apartamento', office:'escritorio', factory:'fabrica', farm:'fazenda', other:'outro' },
  urgency:          { low:'baixa', medium:'media', high:'alta' },
  activity_type:    { call:'ligacao', whatsapp:'whatsapp', email:'email', visit:'visita', meeting:'reuniao', proposal:'proposta', technical_visit:'visita_tecnica', note:'nota', follow_up:'follow_up' },
  contrato_status:  { active:'ativo', expired:'expirado', cancelled:'cancelado', pending_renewal:'pendente_renovacao' },
  contrato_type:    { monitoring_comodato:'monitoramento_comodato', equipment_sale:'venda_equipamentos', monitoring_only:'monitoramento_apenas', project:'projeto' },
  payment_method:   { boleto:'boleto', credit_card:'cartao_credito', pix:'pix', bank_transfer:'transferencia', debit:'debito' },
  financeiro_status:{ pending:'pendente', paid:'pago', overdue:'vencido', cancelled:'cancelado' },
  financial_type:   { monthly:'mensalidade', installation:'instalacao', equipment_sale:'venda_equipamento', cancellation_fee:'multa_cancelamento', other:'outros' },
  pos_venda_status: { pending:'pendente', in_progress:'em_andamento', completed:'concluido', cancelled:'cancelado' },
  post_sale_type:   { onboarding:'onboarding', support:'suporte', satisfaction_survey:'pesquisa_satisfacao', renewal:'renovacao', upsell:'upsell', maintenance:'manutencao' },
  org_status:       { trial:'trial', active:'ativo', suspended:'suspenso', cancelled:'cancelado' },
  plan:             { basic:'basico', professional:'profissional', enterprise:'enterprise' },
  billing_status:   { pending:'pendente', paid:'pago', overdue:'vencido', cancelled:'cancelado' },
  billing_type:     { renewal:'renovacao', upgrade:'upgrade', downgrade:'downgrade', initial:'inicial', suspension:'suspensao', cancellation:'cancelamento' },
  coupon_discount:  { percentage:'percentual', fixed:'fixo' },
};

const invertir = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));
const INV = Object.fromEntries(Object.entries(MAPS).map(([k, m]) => [k, invertir(m)]));

const t = (mapa, val) => mapa[val] ?? val;

// Traduz filtros do formato frontend para DB
function prepararFiltros(filters = {}) {
  const f = { ...filters };
  if (f.organization_id != null) { f.organizacao_id = f.organization_id; delete f.organization_id; }
  if (f.temperature != null)    { f.temperatura   = t(MAPS.temperature,   f.temperature);   delete f.temperature; }
  if (f.status)                   f.status         = t(MAPS.lead_status,   f.status);
  if (f.origin != null)         { f.origem         = t(MAPS.origin,        f.origin);        delete f.origin; }
  if (f.business_type != null)  { f.tipo_negocio   = t(MAPS.business_type, f.business_type); delete f.business_type; }
  if (f.property_type != null)  { f.tipo_imovel    = t(MAPS.property_type, f.property_type); delete f.property_type; }
  if (f.urgency != null)        { f.urgencia       = t(MAPS.urgency,       f.urgency);       delete f.urgency; }
  return f;
}

// ── Normalizadores (DB/português → frontend/inglês) ───────────────────────────

function normLead(l) {
  return {
    id:               l.id,
    name:             l.nome,
    company:          l.empresa,
    phone:            l.telefone,
    email:            l.email,
    zip_code:         l.cep,
    address:          l.endereco,
    city:             l.cidade,
    state:            l.estado,
    status:           t(INV.lead_status,      l.status),
    temperature:      t(INV.temperature,      l.temperatura),
    origin:           t(INV.origin,           l.origem),
    business_type:    t(INV.business_type,    l.tipo_negocio),
    property_type:    t(INV.property_type,    l.tipo_imovel),
    property_subtype: t(INV.property_subtype, l.subtipo_imovel),
    urgency:          t(INV.urgency,          l.urgencia),
    estimated_value:  l.valor_estimado,
    latitude:         l.latitude,
    longitude:        l.longitude,
    organization_id:  l.organizacao_id,
    created_by:       l.criado_por,
    created_date:     l.created_date,
  };
}

function normAtividade(a) {
  return {
    id:              a.id,
    lead_id:         a.lead_id,
    type:            t(INV.activity_type, a.activity_type),
    title:           a.titulo,
    description:     a.descricao,
    scheduled_date:  a.data_agendada,
    completed:       Boolean(a.concluida),
    completed_date:  a.concluida_em,
    organization_id: a.organizacao_id,
    user_id:         a.usuario_id,
    created_date:    a.created_date,
  };
}

function normContr(c) {
  return {
    id:                 c.id,
    lead_id:            c.lead_id,
    client_name:        c.cliente_nome,
    contract_type:      t(INV.contrato_type,   c.contract_type),
    monthly_value:      c.valor_mensal,
    installation_value: c.valor_instalacao,
    start_date:         c.data_inicio,
    end_date:           c.data_fim,
    status:             t(INV.contrato_status, c.status),
    payment_method:     t(INV.payment_method,  c.payment_method),
    organization_id:    c.organizacao_id,
    created_date:       c.created_date,
  };
}

function normFin(f) {
  return {
    id:                 f.id,
    contract_id:        f.contrato_id,
    client_name:        f.cliente_nome,
    type:               t(INV.financial_type,    f.financial_type),
    amount:             f.valor,
    due_date:           f.vencimento,
    status:             t(INV.financeiro_status, f.status),
    payment_method:     t(INV.payment_method,    f.payment_method),
    paid_date:          f.data_pagamento,
    commission_user_id: f.comissao_usuario_id,
    commission_value:   f.comissao_valor,
    organization_id:    f.organizacao_id,
    created_date:       f.created_date,
  };
}

function normPV(p) {
  return {
    id:                 p.id,
    client_name:        p.client_name,
    type:               t(INV.post_sale_type,   p.post_sale_type),
    title:              p.titulo,
    description:        p.descricao,
    status:             t(INV.pos_venda_status, p.status),
    due_date:           p.due_date,
    satisfaction_score: p.satisfaction_score,
    notes:              p.notes,
    completed_date:     p.completed_date,
    organization_id:    p.organizacao_id,
    created_date:       p.created_date,
  };
}

function normOrg(o) {
  return {
    id:                     o.id,
    organization_id:        o.id,
    name:                   o.nome,
    cnpj:                   o.cnpj,
    owner_name:             o.responsavel,
    owner_email:            o.email,
    phone:                  o.telefone,
    status:                 t(INV.org_status, o.status) || 'trial',
    plan:                   t(INV.plan, o.plano) || 'basic',
    monthly_price:          o.valor_mensal,
    max_users:              o.limite_usuarios,
    subscription_ends_at:   o.vencimento_plano,
    subscription_starts_at: o.inicio_assinatura,
    trial_ends_at:          o.trial_fim,
    trial_days:             o.trial_dias ?? null,
    active_sellers:         o.vendedores_ativos ?? null,
    max_sellers:            o.limite_vendedores ?? null,
    created_date:           o.created_date,
  };
}

function normUser(u) {
  return {
    id:              u.id,
    full_name:       u.nome,
    nome:            u.nome,
    email:           u.email,
    role:            u.role,
    organization_id: u.organizacao_id,
    organizacao_id:  u.organizacao_id,
    avatar:          u.avatar,
    created_date:    u.created_date,
  };
}

function normBilling(b) {
  return {
    id:                b.id,
    organization_id:   b.organizacao_id,
    organization_name: b.org_nome,
    type:              t(INV.billing_type,   b.tipo),
    amount:            b.valor,
    discount:          b.desconto,
    final_amount:      b.total,
    billing_date:      b.created_date,
    due_date:          b.vencimento,
    status:            t(INV.billing_status, b.status),
    payment_method:    t(INV.payment_method, b.payment_method),
    paid_at:           b.pago_em,
    plan:              t(INV.plan,           b.plano),
    coupon_code:       b.coupon_code,
    period_start:      b.periodo_inicio,
    period_end:        b.periodo_fim,
    created_date:      b.created_date,
  };
}

function normCoupon(c) {
  const isExpired   = c.validade && new Date(c.validade) < new Date();
  const isExhausted = c.limite_uso != null && c.usos >= c.limite_uso;
  const status      = c.status_manual || (isExpired || isExhausted ? 'inactive' : 'active');
  return {
    id:             c.id,
    code:           c.codigo,
    description:    c.descricao,
    discount_value: c.desconto,
    discount_type:  t(INV.coupon_discount, c.tipo_desconto),
    valid_until:    c.validade,
    valid_from:     c.valido_de,
    max_uses:       c.limite_uso,
    used_count:     c.usos,
    status,
    created_date:   c.created_date,
  };
}

// ── Preparadores (frontend/inglês → DB/português) ─────────────────────────────

function prepararLead(d) {
  const r = {};
  if (d.name            !== undefined) r.nome            = d.name;
  if (d.company         !== undefined) r.empresa         = d.company;
  if (d.phone           !== undefined) r.telefone        = d.phone;
  if (d.email           !== undefined) r.email           = d.email;
  if (d.zip_code        !== undefined) r.cep             = d.zip_code;
  if (d.address         !== undefined) r.endereco        = d.address;
  if (d.city            !== undefined) r.cidade          = d.city;
  if (d.state           !== undefined) r.estado          = d.state;
  if (d.estimated_value !== undefined) r.valor_estimado  = d.estimated_value;
  if (d.created_by      !== undefined) r.criado_por      = d.created_by;
  if (d.latitude        !== undefined) r.latitude        = d.latitude;
  if (d.longitude       !== undefined) r.longitude       = d.longitude;
  if (d.organization_id !== undefined) r.organizacao_id  = d.organization_id;
  if (d.status)           r.status         = t(MAPS.lead_status,      d.status);
  if (d.temperature)      r.temperatura    = t(MAPS.temperature,      d.temperature);
  if (d.origin)           r.origem         = t(MAPS.origin,           d.origin);
  if (d.business_type)    r.tipo_negocio   = t(MAPS.business_type,    d.business_type);
  if (d.property_type)    r.tipo_imovel    = t(MAPS.property_type,    d.property_type);
  if (d.property_subtype) r.subtipo_imovel = t(MAPS.property_subtype, d.property_subtype);
  if (d.urgency)          r.urgencia       = t(MAPS.urgency,          d.urgency);
  return r;
}

function prepararAtividade(d) {
  const r = {};
  if (d.lead_id         !== undefined) r.lead_id        = d.lead_id;
  if (d.title           !== undefined) r.titulo         = d.title;
  if (d.description     !== undefined) r.descricao      = d.description;
  if (d.scheduled_date  !== undefined) r.data_agendada  = d.scheduled_date;
  if (d.completed       !== undefined) r.concluida      = d.completed ? 1 : 0;
  if (d.completed_date  !== undefined) r.concluida_em   = d.completed_date;
  if (d.user_id         !== undefined) r.usuario_id     = d.user_id;
  if (d.organization_id !== undefined) r.organizacao_id = d.organization_id;
  if (d.type) r.activity_type = t(MAPS.activity_type, d.type);
  return r;
}

function prepararContrato(d) {
  const r = {};
  if (d.lead_id            !== undefined) r.lead_id          = d.lead_id;
  if (d.client_name        !== undefined) r.cliente_nome     = d.client_name;
  if (d.monthly_value      !== undefined) r.valor_mensal     = d.monthly_value;
  if (d.installation_value !== undefined) r.valor_instalacao = d.installation_value;
  if (d.installation_fee   !== undefined) r.valor_instalacao = d.installation_fee;
  if (d.start_date         !== undefined) r.data_inicio      = d.start_date;
  if (d.end_date           !== undefined) r.data_fim         = d.end_date;
  if (d.organization_id    !== undefined) r.organizacao_id   = d.organization_id;
  if (d.contract_type)  r.contract_type  = t(MAPS.contrato_type,  d.contract_type);
  if (d.status)         r.status         = t(MAPS.contrato_status, d.status);
  if (d.payment_method) r.payment_method = t(MAPS.payment_method,  d.payment_method);
  return r;
}

function prepararFinanceiro(d) {
  const r = {};
  if (d.contract_id        !== undefined) r.contrato_id         = d.contract_id;
  if (d.client_name        !== undefined) r.cliente_nome        = d.client_name;
  if (d.amount             !== undefined) r.valor               = d.amount;
  if (d.due_date           !== undefined) r.vencimento          = d.due_date;
  if (d.paid_date          !== undefined) r.data_pagamento      = d.paid_date;
  if (d.commission_user_id !== undefined) r.comissao_usuario_id = d.commission_user_id;
  if (d.commission_value   !== undefined) r.comissao_valor      = d.commission_value;
  if (d.organization_id    !== undefined) r.organizacao_id      = d.organization_id;
  if (d.type)           r.financial_type = t(MAPS.financial_type,   d.type);
  if (d.status)         r.status         = t(MAPS.financeiro_status, d.status);
  if (d.payment_method) r.payment_method = t(MAPS.payment_method,   d.payment_method);
  return r;
}

function prepararPosVenda(d) {
  const r = {};
  if (d.client_name        !== undefined) r.client_name        = d.client_name;
  if (d.title              !== undefined) r.titulo             = d.title;
  if (d.description        !== undefined) r.descricao          = d.description;
  if (d.due_date           !== undefined) r.due_date           = d.due_date;
  if (d.notes              !== undefined) r.notes              = d.notes;
  if (d.satisfaction_score !== undefined) r.satisfaction_score = d.satisfaction_score;
  if (d.completed_date     !== undefined) r.completed_date     = d.completed_date;
  if (d.organization_id    !== undefined) r.organizacao_id     = d.organization_id;
  if (d.type)   r.post_sale_type = t(MAPS.post_sale_type,   d.type);
  if (d.status) r.status         = t(MAPS.pos_venda_status, d.status);
  return r;
}

function prepararOrg(d) {
  const r = {};
  if (d.name                   !== undefined) r.nome              = d.name;
  if (d.cnpj                   !== undefined) r.cnpj              = d.cnpj;
  if (d.owner_name             !== undefined) r.responsavel       = d.owner_name;
  if (d.owner_email            !== undefined) r.email             = d.owner_email;
  if (d.phone                  !== undefined) r.telefone          = d.phone;
  if (d.monthly_price          !== undefined) r.valor_mensal      = d.monthly_price;
  if (d.max_users              !== undefined) r.limite_usuarios   = d.max_users;
  if (d.subscription_ends_at   !== undefined) r.vencimento_plano  = d.subscription_ends_at;
  if (d.subscription_starts_at !== undefined) r.inicio_assinatura = d.subscription_starts_at;
  if (d.trial_ends_at          !== undefined) r.trial_fim         = d.trial_ends_at;
  if (d.organization_id        !== undefined) r.organizacao_id    = d.organization_id;
  if (d.plan)   r.plano  = t(MAPS.plan,       d.plan);
  if (d.status) r.status = t(MAPS.org_status, d.status);
  return r;
}

function prepararBilling(d) {
  const r = {};
  if (d.organization_id   !== undefined) r.organizacao_id = d.organization_id;
  if (d.organization_name !== undefined) r.org_nome       = d.organization_name;
  if (d.amount            !== undefined) r.valor          = d.amount;
  if (d.discount          !== undefined) r.desconto       = d.discount;
  if (d.final_amount      !== undefined) r.total          = d.final_amount;
  if (d.due_date          !== undefined) r.vencimento     = d.due_date;
  if (d.paid_at           !== undefined) r.pago_em        = d.paid_at;
  if (d.coupon_code       !== undefined) r.coupon_code    = d.coupon_code;
  if (d.period_start      !== undefined) r.periodo_inicio = d.period_start;
  if (d.period_end        !== undefined) r.periodo_fim    = d.period_end;
  if (d.type)           r.tipo           = t(MAPS.billing_type,   d.type);
  if (d.status)         r.status         = t(MAPS.billing_status, d.status);
  if (d.payment_method) r.payment_method = t(MAPS.payment_method, d.payment_method);
  if (d.plan)           r.plano          = t(MAPS.plan,           d.plan);
  // billing_date is a read-only derived field; DB sets created_date automatically
  return r;
}

function prepararCoupon(d) {
  const r = {};
  if (d.code           !== undefined) r.codigo        = typeof d.code === 'string' ? d.code.toUpperCase().trim() : d.code;
  if (d.description    !== undefined) r.descricao     = d.description;
  if (d.discount_value !== undefined) r.desconto      = d.discount_value;
  if (d.max_uses       !== undefined) r.limite_uso    = d.max_uses;
  if (d.used_count     !== undefined) r.usos          = d.used_count;
  if (d.valid_until    !== undefined) r.validade      = d.valid_until;
  if (d.valid_from     !== undefined) r.valido_de     = d.valid_from;
  if (d.status         !== undefined) r.status_manual = d.status;
  if (d.discount_type) r.tipo_desconto = t(MAPS.coupon_discount, d.discount_type);
  return r;
}

// ── Factory de entidade ───────────────────────────────────────────────────────
function criarEntidade(rota, normalizar, modelKey = null, prepararDados = (x) => x) {
  const wrap    = (dados) => modelKey ? { [modelKey]: prepararDados(dados) } : prepararDados(dados);
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
export const Lead         = criarEntidade('leads',        normLead,      'lead',        prepararLead);
export const Activity     = criarEntidade('atividades',   normAtividade, 'atividade',   prepararAtividade);
export const Contract     = criarEntidade('contratos',    normContr,     'contrato',    prepararContrato);
export const Financial    = criarEntidade('financeiros',  normFin,       'financeiro',  prepararFinanceiro);
export const PostSale     = criarEntidade('pos_vendas',   normPV,        'pos_venda',   prepararPosVenda);
export const Organization = criarEntidade('organizacoes', normOrg,       'organizacao', prepararOrg);
export const User         = criarEntidade('usuarios',     normUser,      'usuario');
export const Billing      = criarEntidade('faturamentos', normBilling,   'faturamento', prepararBilling);
export const Coupon       = criarEntidade('cupons',       normCoupon,    'cupom',       prepararCoupon);
