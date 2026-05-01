import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, AlertTriangle, Clock, CheckCircle2, XCircle,
  Plus, CreditCard, Landmark, QrCode, Calendar, Building2,
  RefreshCw, Settings, Zap, ExternalLink, Search, Filter,
  TrendingUp, TrendingDown, ArrowUpRight,
} from "lucide-react";
import moment from "moment";

const PLAN_LABEL = { basic: "Basic", pro: "Pro", enterprise: "Enterprise", trial: "Trial" };

const STATUS_COLOR = {
  paid:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending:  "bg-amber-100 text-amber-700 border-amber-200",
  failed:   "bg-red-100 text-red-700 border-red-200",
  refunded: "bg-gray-100 text-gray-600 border-gray-200",
  overdue:  "bg-red-100 text-red-700 border-red-200",
};
const STATUS_LABEL = {
  paid: "Pago", pending: "Pendente", failed: "Falhou", refunded: "Estornado", overdue: "Vencido",
};
const TYPE_LABEL = {
  subscription: "Assinatura", upgrade: "Upgrade", downgrade: "Downgrade",
  renewal: "Renovação", trial_conversion: "Conversão Trial", manual: "Cobrança Manual",
};
const METHOD_LABEL = { pix: "PIX", boleto: "Boleto", credit_card: "Cartão de Crédito", manual: "Manual" };
const METHOD_ICON = {
  pix: QrCode, boleto: Landmark, credit_card: CreditCard, manual: DollarSign,
};

function KpiCard({ title, value, sub, icon: Icon, color, trend }) {
  const colors = {
    green:  { bg: "bg-emerald-50", border: "border-emerald-200", icon: "bg-emerald-500", text: "text-emerald-700" },
    amber:  { bg: "bg-amber-50",   border: "border-amber-200",   icon: "bg-amber-500",   text: "text-amber-700" },
    red:    { bg: "bg-red-50",     border: "border-red-200",     icon: "bg-red-500",     text: "text-red-700" },
    blue:   { bg: "bg-blue-50",    border: "border-blue-200",    icon: "bg-blue-500",    text: "text-blue-700" },
    purple: { bg: "bg-purple-50",  border: "border-purple-200",  icon: "bg-purple-500",  text: "text-purple-700" },
  };
  const c = colors[color] || colors.blue;
  return (
    <Card className={`${c.bg} border ${c.border} shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          {trend !== undefined && (
            <span className={`text-xs font-bold flex items-center gap-0.5 ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className={`text-2xl font-black mt-2 ${c.text}`}>{value}</p>
        <p className="text-xs font-bold text-gray-500 mt-0.5">{title}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function NovaCobrancaModal({ open, onClose, organizations, onSubmit }) {
  const [form, setForm] = useState({
    organization_id: "", type: "manual", amount: "", discount: "0",
    payment_method: "pix", due_date: "", description: "",
  });

  const org = organizations.find(o => o.id === form.organization_id);

  const finalAmount = Math.max(0, (parseFloat(form.amount) || 0) - (parseFloat(form.discount) || 0));

  const handleSubmit = () => {
    if (!form.organization_id || !form.amount) return;
    onSubmit({
      organization_id: form.organization_id,
      organization_name: org?.name || "",
      type: form.type,
      plan: org?.plan || "",
      amount: parseFloat(form.amount),
      discount: parseFloat(form.discount) || 0,
      final_amount: finalAmount,
      payment_method: form.payment_method,
      billing_date: new Date().toISOString().split("T")[0],
      due_date: form.due_date || null,
      description: form.description,
      status: "pending",
      asaas_id: null,
    });
    onClose();
    setForm({ organization_id: "", type: "manual", amount: "", discount: "0", payment_method: "pix", due_date: "", description: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Nova Cobrança
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-bold">Organização *</Label>
            <Select value={form.organization_id} onValueChange={v => setForm({ ...form, organization_id: v, amount: String(organizations.find(o => o.id === v)?.monthly_price || "") })}>
              <SelectTrigger><SelectValue placeholder="Selecionar organização..." /></SelectTrigger>
              <SelectContent>
                {organizations.map(o => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name} — R$ {(o.monthly_price || 0).toLocaleString("pt-BR")}/mês
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Tipo</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Meio de Pagamento</Label>
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
            <Label className="text-xs font-bold">Valor (R$) *</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Desconto (R$)</Label>
            <Input type="number" step="0.01" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} placeholder="0,00" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Vencimento</Label>
            <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Total a Cobrar</Label>
            <div className="h-9 flex items-center px-3 rounded-md bg-emerald-50 border border-emerald-200">
              <span className="text-base font-black text-emerald-700">
                R$ {finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-bold">Descrição</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: Mensalidade Março/2026..." />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.organization_id || !form.amount}
            className="bg-gradient-to-r from-[#0891b2] to-[#0e7490] text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Criar Cobrança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AsaasIntegrationCard() {
  return (
    <Card className="border-2 border-dashed border-blue-200 bg-blue-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-black text-blue-800">
          <Zap className="w-4 h-4 text-blue-600" />
          Integração Asaas — Gateway de Pagamentos
          <Badge className="ml-auto bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-black">
            Aguardando Configuração
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-blue-700 font-medium">
          Configure a integração com o Asaas para cobranças automáticas via PIX, Boleto e Cartão de Crédito.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-600">API Key (Produção)</Label>
            <div className="relative">
              <Input disabled placeholder="$aas_xxxxxxxxxxxxxxxxxxxxxxxx" className="pr-10 bg-white/70 text-xs font-mono" />
              <Settings className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-600">API Key (Sandbox / Testes)</Label>
            <div className="relative">
              <Input disabled placeholder="$aas_sandbox_xxxxxxxxxxxxxxxxxxxx" className="pr-10 bg-white/70 text-xs font-mono" />
              <Settings className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-600">Webhook URL (Notificações)</Label>
            <div className="flex gap-2">
              <Input disabled value="https://api.securecrm.com.br/webhooks/asaas" className="bg-white/70 text-xs font-mono flex-1" readOnly />
              <Button variant="outline" size="icon" className="shrink-0 border-blue-200 hover:bg-blue-100" disabled>
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-600">Ambiente</Label>
            <Select disabled>
              <SelectTrigger className="bg-white/70">
                <SelectValue placeholder="Sandbox (Testes)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-blue-200 pt-3">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-2">Meios de Pagamento</p>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: QrCode,    label: "PIX",             ready: true  },
              { icon: Landmark,  label: "Boleto Bancário", ready: true  },
              { icon: CreditCard,label: "Cartão de Crédito",ready: true },
            ].map(({ icon: Icon, label, ready }) => (
              <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold
                ${ready ? "bg-white border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
                {ready && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" title="Aguardando integração" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-blue-600 font-semibold">
            Documentação: <span className="font-mono">docs.asaas.com</span>
          </p>
          <Button disabled size="sm" className="bg-blue-600 text-white text-xs font-bold gap-1.5 opacity-60">
            <RefreshCw className="w-3.5 h-3.5" /> Conectar Asaas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingPanel({ billings, organizations, onCreateBilling }) {
  const [showNovaCobranca, setShowNovaCobranca] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const today = moment();

  // KPI calculations
  const totalPaid    = billings.filter(b => b.status === "paid").reduce((s, b) => s + (b.final_amount || 0), 0);
  const totalPending = billings.filter(b => b.status === "pending").reduce((s, b) => s + (b.final_amount || 0), 0);
  const totalFailed  = billings.filter(b => b.status === "failed").reduce((s, b) => s + (b.final_amount || 0), 0);
  const mrr          = organizations.filter(o => o.status === "active").reduce((s, o) => s + (o.monthly_price || 0), 0);

  // Pending billing: orgs active/trial expiring or overdue
  const pendingOrgs = useMemo(() => organizations
    .filter(o => ["active", "trial"].includes(o.status))
    .map(o => {
      const daysLeft = o.subscription_ends_at ? moment(o.subscription_ends_at).diff(today, "days") : null;
      const lastBilling = billings
        .filter(b => b.organization_id === o.id && b.status === "paid")
        .sort((a, b) => new Date(b.billing_date) - new Date(a.billing_date))[0];
      const urgency = daysLeft === null ? "no_date" : daysLeft < 0 ? "overdue" : daysLeft <= 7 ? "expiring" : "ok";
      return { ...o, daysLeft, lastBilling, urgency };
    })
    .filter(o => o.urgency === "overdue" || o.urgency === "expiring")
    .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99)),
  [organizations, billings, today]);

  // Filtered billing history
  const filtered = useMemo(() => billings
    .filter(b => {
      const matchSearch = !search ||
        b.organization_name?.toLowerCase().includes(search.toLowerCase()) ||
        b.type?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => new Date(b.billing_date) - new Date(a.billing_date)),
  [billings, search, statusFilter]);

  return (
    <div className="space-y-5">
      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Receita Recebida" value={`R$ ${totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} sub="Total pago registrado" icon={CheckCircle2} color="green" />
        <KpiCard title="MRR Atual" value={`R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} sub="Receita mensal recorrente" icon={TrendingUp} color="blue" />
        <KpiCard title="Pendente" value={`R$ ${totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} sub={`${billings.filter(b => b.status === "pending").length} cobranças abertas`} icon={Clock} color="amber" />
        <KpiCard title="Inadimplente" value={`R$ ${totalFailed.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} sub={`${billings.filter(b => b.status === "failed").length} cobranças com falha`} icon={XCircle} color="red" />
      </div>

      <Tabs defaultValue="cobrancas" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-transparent h-auto p-0 gap-2">
            {[
              { value: "cobrancas",  label: "Cobranças Pendentes", icon: AlertTriangle },
              { value: "historico",  label: "Histórico",           icon: DollarSign },
              { value: "asaas",      label: "Integração Asaas",    icon: Zap },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger key={value} value={value}
                className="text-sm font-bold px-4 py-2 rounded-xl border-2 border-gray-200 bg-white shadow-sm
                  data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0891b2] data-[state=active]:to-[#0e7490]
                  data-[state=active]:text-white data-[state=active]:border-[#0891b2] data-[state=active]:shadow-md
                  text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-all">
                <Icon className="w-4 h-4 mr-2" />{label}
              </TabsTrigger>
            ))}
          </TabsList>

          <Button onClick={() => setShowNovaCobranca(true)}
            className="bg-gradient-to-r from-[#0891b2] to-[#0e7490] hover:from-[#0e7490] hover:to-[#164e63] text-white font-bold shadow-md h-10 px-4 text-sm">
            <Plus className="w-4 h-4 mr-2" /> Nova Cobrança
          </Button>
        </div>

        {/* ── Cobranças Pendentes ────────────────────────────── */}
        <TabsContent value="cobrancas">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-3">
              <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Organizações com Cobrança Pendente ou Vencendo
                {pendingOrgs.length > 0 && (
                  <Badge className="bg-red-100 text-red-700 border border-red-200 font-black text-[10px]">
                    {pendingOrgs.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {pendingOrgs.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-20 text-emerald-500" />
                  <p className="font-bold text-sm text-emerald-600">Todas as cobranças em dia</p>
                  <p className="text-xs mt-1">Nenhuma organização com vencimento próximo</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingOrgs.map(org => {
                    const isOverdue = org.urgency === "overdue";
                    return (
                      <div key={org.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 ${isOverdue ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-100" : "bg-amber-100"}`}>
                          <Building2 className={`w-5 h-5 ${isOverdue ? "text-red-500" : "text-amber-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-gray-900">{org.name}</p>
                            <Badge className={`text-[10px] font-black border ${isOverdue ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                              {isOverdue ? `Vencida há ${Math.abs(org.daysLeft)} dias` : `Vence em ${org.daysLeft} dia${org.daysLeft !== 1 ? "s" : ""}`}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-bold text-gray-500">
                              {PLAN_LABEL[org.plan] || org.plan}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Vence: {org.subscription_ends_at ? moment(org.subscription_ends_at).format("DD/MM/YYYY") : "—"}
                            </span>
                            {org.lastBilling && (
                              <span>Último pgto: {moment(org.lastBilling.billing_date).format("DD/MM/YYYY")}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-black text-gray-900">
                            R$ {(org.monthly_price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">mensalidade</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setShowNovaCobranca(true)}
                          className="shrink-0 bg-gradient-to-r from-[#0891b2] to-[#0e7490] text-white text-xs font-bold gap-1.5 h-8 px-3"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" /> Cobrar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Histórico ─────────────────────────────────────── */}
        <TabsContent value="historico">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Histórico de Faturamento
                </CardTitle>
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar organização..." className="pl-8 h-8 text-xs w-48" />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <Filter className="w-3 h-3 mr-1.5 text-gray-400" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="font-semibold text-sm">Nenhum registro encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(b => {
                    const MethodIcon = METHOD_ICON[b.payment_method] || DollarSign;
                    return (
                      <div key={b.id} className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className={`w-1.5 self-stretch rounded-full shrink-0 ${b.status === "paid" ? "bg-emerald-500" : b.status === "pending" ? "bg-amber-400" : b.status === "failed" ? "bg-red-500" : "bg-gray-300"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-[10px] font-black border ${STATUS_COLOR[b.status]}`}>
                              {STATUS_LABEL[b.status] || b.status}
                            </Badge>
                            <span className="text-sm font-black text-gray-800">{b.organization_name || "—"}</span>
                            <span className="text-xs text-gray-500">{TYPE_LABEL[b.type] || b.type}</span>
                            {b.plan && <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">{PLAN_LABEL[b.plan] || b.plan}</span>}
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-gray-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {moment(b.billing_date).format("DD/MM/YYYY")}
                            </span>
                            {b.payment_method && (
                              <span className="flex items-center gap-1">
                                <MethodIcon className="w-3 h-3" />
                                {METHOD_LABEL[b.payment_method] || b.payment_method}
                              </span>
                            )}
                            {b.coupon_code && (
                              <Badge variant="outline" className="text-[10px] font-bold border-purple-300 text-purple-600">
                                Cupom: {b.coupon_code}
                              </Badge>
                            )}
                            {b.asaas_id && (
                              <span className="flex items-center gap-1 text-blue-500 font-mono text-[10px]">
                                <Zap className="w-3 h-3" /> {b.asaas_id}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {b.discount > 0 && (
                            <p className="text-xs text-gray-400 line-through">
                              R$ {(b.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          )}
                          <p className="text-xl font-black text-gray-900">
                            R$ {(b.final_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          {b.discount > 0 && (
                            <p className="text-[10px] font-bold text-emerald-600">
                              -{b.discount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} desconto
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Asaas ─────────────────────────────────────────── */}
        <TabsContent value="asaas">
          <AsaasIntegrationCard />
        </TabsContent>
      </Tabs>

      <NovaCobrancaModal
        open={showNovaCobranca}
        onClose={() => setShowNovaCobranca(false)}
        organizations={organizations}
        onSubmit={onCreateBilling}
      />
    </div>
  );
}
