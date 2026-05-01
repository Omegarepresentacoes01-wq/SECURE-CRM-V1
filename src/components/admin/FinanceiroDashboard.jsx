import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Plus, Search, Filter, CheckCircle2,
  AlertTriangle, Ban, PlayCircle, Zap, Settings,
  ExternalLink, RefreshCw, QrCode, Landmark, CreditCard, ArrowUpRight,
} from "lucide-react";
import moment from "moment";

// ─── Constantes ───────────────────────────────────────────────────────────────
const PLAN_LABEL = { basic: "Básico", professional: "Profissional", enterprise: "Enterprise", trial: "Trial" };
const STATUS_BILL = { paid: "Pago", pending: "Pendente", failed: "Falhou", refunded: "Estornado" };
const METHOD_LABEL = { pix: "PIX", boleto: "Boleto", credit_card: "Cartão", manual: "Manual" };
const TYPE_LABEL = {
  renewal: "Renovação", subscription: "Assinatura", upgrade: "Upgrade",
  downgrade: "Downgrade", trial_conversion: "Conv. Trial", manual: "Manual",
};

const fmtBRL  = v => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
const fmtBRL2 = v => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-gray-500 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-bold text-gray-900">
          {p.name}: {typeof p.value === "number" ? fmtBRL(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, delta, deltaLabel, borderColor = "border-gray-300" }) {
  return (
    <div className={`bg-white rounded-xl border-t-4 border border-gray-100 ${borderColor} px-5 py-4 shadow-sm`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1.5 tracking-tight text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {delta !== undefined && delta !== null && (
        <p className={`text-xs font-semibold mt-1 ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% {deltaLabel || "vs mês anterior"}
        </p>
      )}
    </div>
  );
}

// ─── Modal Nova Cobrança ──────────────────────────────────────────────────────
function NovaCobrancaModal({ open, onClose, organizations, onSubmit }) {
  const empty = { organization_id: "", type: "renewal", amount: "", discount: "0", payment_method: "pix", due_date: "", description: "" };
  const [form, setForm] = useState(empty);
  const org   = organizations.find(o => o.id === form.organization_id);
  const final = Math.max(0, (parseFloat(form.amount) || 0) - (parseFloat(form.discount) || 0));

  const submit = () => {
    if (!form.organization_id || !form.amount) return;
    onSubmit({
      organization_id: form.organization_id, organization_name: org?.name || "",
      type: form.type, plan: org?.plan || "",
      amount: parseFloat(form.amount), discount: parseFloat(form.discount) || 0, final_amount: final,
      payment_method: form.payment_method,
      billing_date: new Date().toISOString().split("T")[0],
      due_date: form.due_date || null, description: form.description,
      status: "pending", asaas_id: null,
    });
    onClose(); setForm(empty);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-gray-900">Nova Cobrança</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Organização *</Label>
            <Select value={form.organization_id} onValueChange={v => {
              const o = organizations.find(x => x.id === v);
              setForm({ ...form, organization_id: v, amount: String(o?.monthly_price || "") });
            }}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                {organizations.map(o => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name} — {fmtBRL(o.monthly_price)}/mês
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Tipo</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Meio de Pagamento</Label>
            <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto Bancário</SelectItem>
                <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                <SelectItem value="manual">Manual / Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Valor (R$) *</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Desconto (R$)</Label>
            <Input type="number" step="0.01" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Vencimento</Label>
            <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Total</Label>
            <div className="h-9 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200">
              <span className="text-base font-bold text-gray-900">{fmtBRL2(final)}</span>
            </div>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Descrição</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: Mensalidade Maio/2026..." />
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={!form.organization_id || !form.amount}
            className="bg-gray-900 hover:bg-gray-800 text-white font-semibold">
            Criar Cobrança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FinanceiroDashboard({ billings, organizations, onCreateBilling, onUpdateBilling }) {
  const [showNova, setShowNova]           = useState(false);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const today = useMemo(() => moment(), []);

  // ── Métricas ────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const active    = organizations.filter(o => o.status === "active");
    const trial     = organizations.filter(o => o.status === "trial");
    const cancelled = organizations.filter(o => o.status === "cancelled");
    const mrr = active.reduce((s, o) => s + (o.monthly_price || 0), 0);

    const paid    = billings.filter(b => b.status === "paid");
    const pending = billings.filter(b => b.status === "pending");
    const failed  = billings.filter(b => b.status === "failed");

    const thisMonth = today.format("YYYY-MM");
    const lastMonth = moment().subtract(1, "month").format("YYYY-MM");
    const mrrThis = paid.filter(b => moment(b.billing_date).format("YYYY-MM") === thisMonth).reduce((s, b) => s + (b.final_amount || 0), 0);
    const mrrLast = paid.filter(b => moment(b.billing_date).format("YYYY-MM") === lastMonth).reduce((s, b) => s + (b.final_amount || 0), 0);
    const mrrDelta = mrrLast > 0 ? Math.round(((mrrThis - mrrLast) / mrrLast) * 100) : null;

    const expiring = active.filter(o => {
      const d = o.subscription_ends_at ? moment(o.subscription_ends_at).diff(today, "days") : null;
      return d !== null && d >= 0 && d <= 7;
    });
    const overdue = active.filter(o => {
      const d = o.subscription_ends_at ? moment(o.subscription_ends_at).diff(today, "days") : null;
      return d !== null && d < 0;
    });
    const expiredTrials = trial.filter(o => {
      const d = o.trial_ends_at ? moment(o.trial_ends_at).diff(today, "days") : null;
      return d !== null && d < 0;
    });

    return {
      mrr, arr: mrr * 12,
      totalPaid:    paid.reduce((s, b) => s + (b.final_amount || 0), 0),
      totalPending: pending.reduce((s, b) => s + (b.final_amount || 0), 0),
      totalFailed:  failed.reduce((s, b) => s + (b.final_amount || 0), 0),
      activeCount: active.length, trialCount: trial.length, cancelledCount: cancelled.length,
      pendingCount: pending.length, failedCount: failed.length,
      churnRate: organizations.length > 0 ? ((cancelled.length / organizations.length) * 100).toFixed(1) : "0.0",
      mrrDelta, expiring, overdue, expiredTrials,
    };
  }, [billings, organizations, today]);

  // ── Gráfico receita 12 meses ─────────────────────────────────────────────
  const revenueData = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const m   = moment().subtract(11 - i, "months");
    const key = m.format("YYYY-MM");
    return {
      mes: m.format("MMM/YY"),
      Recebido: billings.filter(b => b.status === "paid"    && moment(b.billing_date).format("YYYY-MM") === key).reduce((s, b) => s + (b.final_amount || 0), 0),
      Pendente: billings.filter(b => b.status === "pending" && moment(b.billing_date).format("YYYY-MM") === key).reduce((s, b) => s + (b.final_amount || 0), 0),
    };
  }), [billings]);

  // ── Gráfico planos ───────────────────────────────────────────────────────
  const planData = useMemo(() => {
    const m = {};
    organizations.filter(o => o.status === "active").forEach(o => {
      const k = PLAN_LABEL[o.plan] || o.plan || "Outros";
      m[k] = (m[k] || 0) + (o.monthly_price || 0);
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [organizations]);

  // ── Assinaturas filtradas ────────────────────────────────────────────────
  const subscriptions = useMemo(() => organizations
    .map(o => {
      const daysLeft  = o.subscription_ends_at ? moment(o.subscription_ends_at).diff(today, "days") : null;
      const lastPaid  = billings.filter(b => b.organization_id === o.id && b.status === "paid").sort((a, b) => new Date(b.billing_date) - new Date(a.billing_date))[0];
      const pendentes = billings.filter(b => b.organization_id === o.id && b.status === "pending").length;
      return { ...o, daysLeft, lastPaid, pendentes };
    })
    .filter(o => !search || o.name?.toLowerCase().includes(search.toLowerCase()) || o.owner_email?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999)),
  [organizations, billings, search, today]);

  // ── Histórico filtrado ───────────────────────────────────────────────────
  const history = useMemo(() => billings
    .filter(b => {
      const ms = !search || b.organization_name?.toLowerCase().includes(search.toLowerCase());
      const mf = statusFilter === "all" || b.status === statusFilter;
      return ms && mf;
    })
    .sort((a, b) => new Date(b.billing_date) - new Date(a.billing_date)),
  [billings, search, statusFilter]);

  const alertCount = metrics.overdue.length + metrics.expiring.length + metrics.failedCount + metrics.expiredTrials.length;

  // ── Dot de status ────────────────────────────────────────────────────────
  const statusDot = { active: "bg-emerald-500", trial: "bg-amber-400", suspended: "bg-gray-400", cancelled: "bg-red-400" };

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Financeiro</h2>
          <p className="text-sm text-gray-400 mt-0.5">Controle de assinaturas e receita</p>
        </div>
        <Button onClick={() => setShowNova(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white font-semibold h-9 px-4 text-sm gap-2">
          <Plus className="w-4 h-4" /> Nova Cobrança
        </Button>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="MRR"       value={fmtBRL(metrics.mrr)}          sub="Receita recorrente"             delta={metrics.mrrDelta} borderColor="border-t-cyan-500" />
        <KpiCard label="ARR"       value={fmtBRL(metrics.arr)}          sub="Projeção anual"                 borderColor="border-t-blue-500" />
        <KpiCard label="Recebido"  value={fmtBRL(metrics.totalPaid)}    sub="Total histórico"                borderColor="border-t-emerald-500" />
        <KpiCard label="Pendente"  value={fmtBRL(metrics.totalPending)} sub={`${metrics.pendingCount} cobranças`} borderColor="border-t-amber-400" />
        <KpiCard label="Inadimpl." value={fmtBRL(metrics.totalFailed)}  sub={`${metrics.failedCount} falhas`}    borderColor="border-t-red-500" />
        <KpiCard label="Churn"     value={`${metrics.churnRate}%`}      sub={`${metrics.cancelledCount} cancelados`} borderColor="border-t-gray-400" />
      </div>

      {/* ── Gráficos ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Receita 12 meses */}
        <Card className="lg:col-span-2 border border-gray-200 rounded-xl shadow-none">
          <CardHeader className="pb-1 pt-5 px-6">
            <CardTitle className="text-sm font-semibold text-gray-800">Receita — Últimos 12 Meses</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Recebido vs Pendente por mês</p>
          </CardHeader>
          <CardContent className="pb-4 pr-4 pl-2">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0891b2" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={44} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Recebido" stroke="#0891b2" strokeWidth={2} fill="url(#gR)" dot={false} />
                <Area type="monotone" dataKey="Pendente" stroke="#94a3b8" strokeWidth={1.5} fill="url(#gP)" dot={false} strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MRR por plano */}
        <Card className="border border-gray-200 rounded-xl shadow-none">
          <CardHeader className="pb-1 pt-5 px-6">
            <CardTitle className="text-sm font-semibold text-gray-800">MRR por Plano</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">{metrics.activeCount} assinantes ativos</p>
          </CardHeader>
          <CardContent className="pb-4 px-6">
            {planData.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-xs">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={planData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="MRR" fill="#0891b2" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="border-t border-gray-100 pt-3 mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Ativos</span>
                <span className="font-semibold text-gray-700">{metrics.activeCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Trial</span>
                <span className="font-semibold text-gray-700">{metrics.trialCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Cancelados</span>
                <span className="font-semibold text-gray-700">{metrics.cancelledCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Alertas ────────────────────────────────────────────────────── */}
      {alertCount > 0 && (
        <Card className="border border-gray-200 rounded-xl shadow-none">
          <CardHeader className="pb-3 pt-4 px-6">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              {alertCount} item{alertCount !== 1 ? "s" : ""} que exig{alertCount !== 1 ? "em" : "e"} atenção
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="divide-y divide-gray-100">
              {metrics.overdue.map(o => (
                <div key={o.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{o.name}</span>
                      <span className="text-xs text-gray-400 ml-2">assinatura vencida há {Math.abs(moment(o.subscription_ends_at).diff(today, "days"))}d</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-red-600">Vencida</span>
                </div>
              ))}
              {metrics.expiring.map(o => (
                <div key={o.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{o.name}</span>
                      <span className="text-xs text-gray-400 ml-2">vence em {moment(o.subscription_ends_at).diff(today, "days")}d</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-600">Vencendo</span>
                </div>
              ))}
              {metrics.expiredTrials.map(o => (
                <div key={o.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{o.name}</span>
                      <span className="text-xs text-gray-400 ml-2">trial expirado</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-500">Converter</span>
                </div>
              ))}
              {metrics.failedCount > 0 && (
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span className="text-sm font-semibold text-gray-800">{metrics.failedCount} cobrança{metrics.failedCount !== 1 ? "s" : ""} com falha</span>
                  </div>
                  <span className="text-xs font-semibold text-red-600">{fmtBRL2(metrics.totalFailed)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs defaultValue="assinaturas" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-gray-100 h-9 p-1 gap-0.5 rounded-lg">
            {[
              { value: "assinaturas", label: "Assinaturas" },
              { value: "historico",   label: "Histórico"   },
              { value: "asaas",       label: "Asaas"       },
            ].map(({ value, label }) => (
              <TabsTrigger key={value} value={value}
                className="text-xs font-semibold px-3 h-7 rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..." className="pl-8 h-8 text-xs w-48 border-gray-200" />
          </div>
        </div>

        {/* ── Assinaturas ─────────────────────────────────────────────── */}
        <TabsContent value="assinaturas">
          <Card className="border border-gray-200 rounded-xl shadow-none overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-400 px-5 py-3">Organização</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 hidden md:table-cell">Plano</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 hidden lg:table-cell">Valor/mês</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 hidden lg:table-cell">Vencimento</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 hidden xl:table-cell">Último pagamento</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">Nenhuma assinatura encontrada</td></tr>
                )}
                {subscriptions.map(org => {
                  const isOverdue  = org.daysLeft !== null && org.daysLeft < 0;
                  const isExpiring = org.daysLeft !== null && org.daysLeft >= 0 && org.daysLeft <= 7;
                  return (
                    <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[org.status] || "bg-gray-300"}`} />
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{org.name}</p>
                            <p className="text-xs text-gray-400">{org.owner_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {PLAN_LABEL[org.plan] || org.plan || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="font-semibold text-gray-800">{fmtBRL2(org.monthly_price)}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {org.subscription_ends_at ? (
                          <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : isExpiring ? "text-amber-600" : "text-gray-500"}`}>
                            {moment(org.subscription_ends_at).format("DD/MM/YYYY")}
                            {isOverdue && " — vencida"}
                            {isExpiring && ` — ${org.daysLeft}d`}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 hidden xl:table-cell text-xs text-gray-400">
                        {org.lastPaid ? moment(org.lastPaid.billing_date).format("DD/MM/YYYY") : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {org.pendentes > 0 && (
                            <span className="text-xs font-semibold text-amber-600 mr-1">{org.pendentes} pend.</span>
                          )}
                          <Button size="sm" variant="outline"
                            className="h-7 px-2.5 text-xs font-semibold border-gray-200 text-gray-600 hover:bg-gray-50 gap-1"
                            onClick={() => setShowNova(true)}>
                            <ArrowUpRight className="w-3 h-3" /> Cobrar
                          </Button>
                          {org.status === "active" && (
                            <Button size="sm" variant="ghost"
                              className="h-7 px-2.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                              onClick={() => onUpdateBilling && onUpdateBilling("suspend", org)}>
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {org.status === "suspended" && (
                            <Button size="sm" variant="ghost"
                              className="h-7 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => onUpdateBilling && onUpdateBilling("reactivate", org)}>
                              <PlayCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* ── Histórico ───────────────────────────────────────────────── */}
        <TabsContent value="historico">
          <Card className="border border-gray-200 rounded-xl shadow-none overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-gray-50 flex-wrap">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{history.length} registros</span>
              <div className="ml-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-7 w-36 text-xs border-gray-200 gap-1">
                    <Filter className="w-3 h-3 text-gray-400" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(STATUS_BILL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 px-5 py-3">Organização</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 hidden md:table-cell">Tipo</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 hidden md:table-cell">Data</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3 hidden lg:table-cell">Pagamento</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-5 py-3">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">Nenhum registro</td></tr>
                )}
                {history.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">{b.organization_name || "—"}</p>
                      {b.coupon_code && <p className="text-xs text-gray-400">Cupom: {b.coupon_code}</p>}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell text-xs text-gray-500 font-medium">
                      {TYPE_LABEL[b.type] || b.type}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell text-xs text-gray-400">
                      {moment(b.billing_date).format("DD/MM/YYYY")}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-gray-400">
                      {METHOD_LABEL[b.payment_method] || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border
                          ${b.status === "paid"    ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            b.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            b.status === "failed"  ? "bg-red-50 text-red-600 border-red-200" :
                                                     "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {STATUS_BILL[b.status] || b.status}
                        </span>
                        {b.status === "pending" && (
                          <Button size="sm" variant="ghost"
                            className="h-6 px-2 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                            onClick={() => onUpdateBilling && onUpdateBilling("markPaid", b)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Pago
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {b.discount > 0 && <p className="text-xs text-gray-300 line-through">{fmtBRL2(b.amount)}</p>}
                      <p className="font-bold text-gray-900">{fmtBRL2(b.final_amount)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* ── Asaas ───────────────────────────────────────────────────── */}
        <TabsContent value="asaas">
          <Card className="border border-gray-200 rounded-xl shadow-none">
            <CardHeader className="pb-3 pt-5 px-6 border-b border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-gray-400" /> Integração Asaas
                  </CardTitle>
                  <p className="text-xs text-gray-400 mt-0.5">Gateway de pagamentos para cobranças automáticas</p>
                </div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  Aguardando configuração
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "API Key (Produção)",     placeholder: "$aas_xxxxxxxxxxxxxxxxxxxxxxxx" },
                  { label: "API Key (Sandbox)",       placeholder: "$aas_sandbox_xxxxxxxxxxxxxxxxx" },
                ].map(({ label, placeholder }) => (
                  <div key={label} className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">{label}</Label>
                    <div className="relative">
                      <Input disabled placeholder={placeholder} className="pr-9 bg-gray-50 text-xs font-mono border-gray-200" />
                      <Settings className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input disabled value="https://api.securecrm.com.br/webhooks/asaas" className="bg-gray-50 text-xs font-mono border-gray-200 flex-1" readOnly />
                    <Button variant="outline" size="icon" className="shrink-0 border-gray-200 h-9 w-9" disabled>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Ambiente</Label>
                  <Select disabled>
                    <SelectTrigger className="bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Sandbox (Testes)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                      <SelectItem value="production">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Meios de pagamento disponíveis</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: QrCode,     label: "PIX"              },
                    { icon: Landmark,   label: "Boleto Bancário"   },
                    { icon: CreditCard, label: "Cartão de Crédito" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Automações após integração</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    "Cobrança automática 7 dias antes do vencimento",
                    "Notificação por e-mail ao cliente",
                    "Suspensão automática após 15 dias inadimplente",
                    "Sincronização de status via webhook em tempo real",
                    "Link de pagamento por WhatsApp",
                    "Relatório de inadimplência automático",
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2 text-xs text-gray-400 py-1">
                      <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button disabled size="sm" className="bg-gray-200 text-gray-400 font-semibold gap-1.5 cursor-not-allowed">
                  <RefreshCw className="w-3.5 h-3.5" /> Conectar Asaas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NovaCobrancaModal open={showNova} onClose={() => setShowNova(false)} organizations={organizations} onSubmit={onCreateBilling} />
    </div>
  );
}
