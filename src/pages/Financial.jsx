import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, AlertTriangle, Clock, CheckCircle2, FileDown, CheckCheck, Percent, TrendingUp, Calendar, Award, ChevronDown, ChevronRight, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "../components/dashboard/StatsCard";
import moment from "moment";

const STATUS_LABEL = { pending: "Pendente", paid: "Pago", overdue: "Atrasado", cancelled: "Cancelado" };
const STATUS_COLOR = {
  pending:   { badge: "bg-amber-100 text-amber-700",   border: "border-l-amber-400" },
  paid:      { badge: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-500" },
  overdue:   { badge: "bg-red-100 text-red-700",         border: "border-l-red-500" },
  cancelled: { badge: "bg-gray-100 text-gray-600",       border: "border-l-gray-300" },
};
const TYPE_LABEL = {
  monthly:          "Mensalidade",
  installation:     "Instalação",
  equipment_sale:   "Venda Equip.",
  cancellation_fee: "Multa",
  other:            "Outro",
};
const PAYMENT_LABEL = {
  boleto: "Boleto", credit_card: "Cartão", pix: "PIX", bank_transfer: "Transferência",
};

// ── PDF Report ───────────────────────────────────────────────────────────────
function generateFinancialPDF(financials, filters) {
  const now = moment().format("DD/MM/YYYY HH:mm");
  const total     = financials.reduce((s, f) => s + (f.amount || 0), 0);
  const totalPaid = financials.filter(f => f.status === "paid").reduce((s, f) => s + (f.amount || 0), 0);
  const totalPending = financials.filter(f => f.status === "pending").reduce((s, f) => s + (f.amount || 0), 0);
  const totalOverdue = financials.filter(f => {
    return (f.status !== "paid" && f.status !== "cancelled" && f.due_date && moment(f.due_date).isBefore(moment(), "day"));
  }).reduce((s, f) => s + (f.amount || 0), 0);

  const rows = financials.map(f => {
    const isOverdue = f.status !== "paid" && f.status !== "cancelled" && f.due_date && moment(f.due_date).isBefore(moment(), "day");
    const statusEff = isOverdue ? "overdue" : f.status;
    const statusColors = { paid: "#059669", pending: "#d97706", overdue: "#dc2626", cancelled: "#6b7280" };
    return `
      <tr>
        <td>${f.client_name || "—"}</td>
        <td>${f.description || "—"}</td>
        <td>${TYPE_LABEL[f.type] || f.type || "—"}</td>
        <td class="money">R$ ${(f.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
        <td>${f.due_date ? moment(f.due_date).format("DD/MM/YYYY") : "—"}</td>
        <td>${f.payment_date ? moment(f.payment_date).format("DD/MM/YYYY") : "—"}</td>
        <td style="color:${statusColors[statusEff] || "#374151"};font-weight:800">${STATUS_LABEL[statusEff] || f.status}</td>
        <td>${PAYMENT_LABEL[f.payment_method] || f.payment_method || "—"}</td>
      </tr>`;
  }).join("");

  const filterInfo = filters.search || filters.status !== "all"
    ? `<p style="font-size:11px;color:#6b7280;margin:0 0 8px">Filtros: ${filters.status !== "all" ? `Status: ${STATUS_LABEL[filters.status] || filters.status}` : ""} ${filters.search ? `| Busca: "${filters.search}"` : ""}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Financeiro — SecureCRM</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
    .header { background: #0f172a; color: #fff; padding: 24px 32px 20px; }
    .header h1 { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .header p  { font-size: 11px; color: #94a3b8; margin-top: 4px; }
    .kpi-row { display: flex; gap: 0; border-bottom: 3px solid #e2e8f0; }
    .kpi { flex: 1; padding: 14px 20px; border-right: 2px solid #e2e8f0; }
    .kpi:last-child { border-right: none; }
    .kpi-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
    .kpi-value { font-size: 20px; font-weight: 900; margin-top: 2px; }
    .kpi-value.green  { color: #059669; }
    .kpi-value.amber  { color: #d97706; }
    .kpi-value.red    { color: #dc2626; }
    .kpi-value.blue   { color: #2563eb; }
    .content { padding: 20px 32px; }
    .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead tr { background: #f1f5f9; }
    th { padding: 8px 10px; text-align: left; font-weight: 900; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; border-bottom: 2px solid #cbd5e1; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:hover td { background: #eff6ff; }
    td.money { font-weight: 800; color: #1e293b; }
    .footer { padding: 16px 32px; border-top: 2px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    .total-row td { font-weight: 900; font-size: 12px; background: #f1f5f9 !important; border-top: 2px solid #cbd5e1; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header { -webkit-print-color-adjust: exact; }
      @page { margin: 10mm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡 SecureCRM — Relatório Financeiro</h1>
    <p>Gerado em: ${now} &nbsp;·&nbsp; Total de registros: ${financials.length}</p>
  </div>

  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Total Geral</div><div class="kpi-value blue">R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div>
    <div class="kpi"><div class="kpi-label">Recebido</div><div class="kpi-value green">R$ ${totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div>
    <div class="kpi"><div class="kpi-label">A Receber</div><div class="kpi-value amber">R$ ${totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div>
    <div class="kpi"><div class="kpi-label">Inadimplente</div><div class="kpi-value red">R$ ${totalOverdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div>
    <div class="kpi"><div class="kpi-label">Taxa Recebimento</div><div class="kpi-value ${total > 0 ? (totalPaid / total >= 0.8 ? "green" : totalPaid / total >= 0.5 ? "amber" : "red") : "blue"}">${total > 0 ? ((totalPaid / total) * 100).toFixed(1) : 0}%</div></div>
  </div>

  <div class="content">
    <div class="section-title">Lançamentos Financeiros</div>
    ${filterInfo}
    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Descrição</th>
          <th>Tipo</th>
          <th>Valor</th>
          <th>Vencimento</th>
          <th>Pgto. em</th>
          <th>Status</th>
          <th>Método</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3">TOTAL (${financials.length} registros)</td>
          <td class="money">R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
          <td colspan="4"></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>SecureCRM · Relatório Financeiro Completo</span>
    <span>Gerado em ${now}</span>
  </div>

  <script>setTimeout(function(){ window.print(); }, 600);</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Permita pop-ups para baixar o relatório."); return; }
  win.document.write(html);
  win.document.close();
}

// ── Comissão por contrato ─────────────────────────────────────────────────────
function calcularComissao(contract) {
  const inicio = moment(contract.start_date);
  if (!contract.start_date || !inicio.isValid()) return null;

  const mesAtual = moment().diff(inicio, "months");
  const valorMensal = contract.monthly_value || 0;

  // Taxa do mês atual
  let taxaAtual = 0;
  if (mesAtual >= 0 && mesAtual < 12)       taxaAtual = 0.24;
  else if (mesAtual >= 12 && mesAtual < 36) taxaAtual = 0.12;

  // Total acumulado até hoje (meses já decorridos)
  let totalAcumulado = 0;
  for (let m = 0; m < Math.min(mesAtual, 36); m++) {
    totalAcumulado += valorMensal * (m < 12 ? 0.24 : 0.12);
  }

  // Total projetado para os 36 meses
  let totalProjetado = 0;
  for (let m = 0; m < 36; m++) {
    totalProjetado += valorMensal * (m < 12 ? 0.24 : 0.12);
  }

  // Meses restantes com comissão
  const mesesRestantes = Math.max(0, 36 - mesAtual);

  return {
    taxaAtual,
    comissaoMesAtual: valorMensal * taxaAtual,
    totalAcumulado,
    totalProjetado,
    mesAtual,
    mesesRestantes,
    ativo: mesAtual < 36 && contract.status === "active",
  };
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Financial() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [showForm, setShowForm]           = useState(false);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [expandedClients, setExpandedClients] = useState(new Set());
  const [form, setForm] = useState({
    client_name: "", description: "", amount: "", due_date: "",
    status: "pending", payment_method: "boleto", type: "monthly", notes: "",
  });

  const queryClient = useQueryClient();

  const { data: financials = [] } = useQuery({
    queryKey: ["financials"],
    queryFn: () => base44.entities.Financial.list("-due_date", 500),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-start_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Financial.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financials"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Financial.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financials"] }),
  });

  const markAsPaid = (id) => {
    updateMutation.mutate({ id, data: { status: "paid", payment_date: new Date().toISOString().split("T")[0] } });
  };

  const filtered = financials.filter((f) => {
    const matchSearch = !search || f.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Group by client
  const clientGroups = filtered.reduce((acc, f) => {
    const name = f.client_name || "—";
    if (!acc[name]) acc[name] = [];
    acc[name].push(f);
    return acc;
  }, {});

  const toggleClient = (name) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const totalPending = financials.filter(f => f.status === "pending").reduce((s, f) => s + (f.amount || 0), 0);
  const totalOverdue  = financials.filter(f => {
    return f.status !== "paid" && f.status !== "cancelled" && f.due_date && moment(f.due_date).isBefore(moment(), "day");
  }).reduce((s, f) => s + (f.amount || 0), 0);
  const totalPaid = financials.filter(f => f.status === "paid").reduce((s, f) => s + (f.amount || 0), 0);

  // ── Cálculos de comissão ──────────────────────────────────────────────────
  const comissoesContratos = contracts
    .map((c) => ({ contract: c, comissao: calcularComissao(c) }))
    .filter((x) => x.comissao !== null);

  const comissaoMesAtualTotal = comissoesContratos
    .filter((x) => x.comissao.ativo)
    .reduce((s, x) => s + x.comissao.comissaoMesAtual, 0);

  const comissaoAcumuladaTotal = comissoesContratos
    .reduce((s, x) => s + x.comissao.totalAcumulado, 0);

  const comissaoProjetadaTotal = comissoesContratos
    .reduce((s, x) => s + x.comissao.totalProjetado, 0);

  const contratosAtivosComissao = comissoesContratos.filter((x) => x.comissao.ativo).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Controle de contas a receber e comissões</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => generateFinancialPDF(filtered, { search, status: statusFilter })}
            className="border-2 border-gray-300 font-black gap-2 text-gray-700 hover:bg-gray-50"
          >
            <FileDown className="w-4 h-4" /> Baixar PDF
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 font-black gap-2">
              <Plus className="w-4 h-4" /> Nova Cobrança
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue={isAdmin ? "cobrancas" : "comissoes"} className="w-full">
        <TabsList className="border-b-2 border-gray-200 bg-transparent h-auto p-0 gap-0 rounded-none w-full justify-start overflow-x-auto">
          {isAdmin && (
            <TabsTrigger
              value="cobrancas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent font-bold text-gray-500 px-5 py-2.5"
            >
              Cobranças
            </TabsTrigger>
          )}
          <TabsTrigger
            value="comissoes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent font-bold text-gray-500 px-5 py-2.5"
          >
            {isAdmin ? "Comissões" : "Minhas Comissões"}
            {contratosAtivosComissao > 0 && (
              <span className="ml-2 text-[10px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                {contratosAtivosComissao}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── ABA COBRANÇAS ─────────────────────────────────────────────────── */}
        <TabsContent value="cobrancas" className="mt-6 space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="A Receber"    value={`R$ ${totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={Clock}         color="orange" />
        <StatsCard title="Inadimplente" value={`R$ ${totalOverdue.toLocaleString("pt-BR",  { minimumFractionDigits: 2 })}`} icon={AlertTriangle}  color="red" />
        <StatsCard title="Recebido"     value={`R$ ${totalPaid.toLocaleString("pt-BR",     { minimumFractionDigits: 2 })}`} icon={CheckCircle2}  color="green" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="pl-9 border-2 border-gray-200 font-medium"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 border-2 border-gray-200 font-bold"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="overdue">Atrasado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400 self-center font-medium hidden sm:block">
          {Object.keys(clientGroups).length} clientes · {filtered.length} cobranças
        </span>
      </div>

      {/* Grouped by client */}
      <div className="space-y-2">
        {Object.keys(clientGroups).length === 0 && (
          <div className="text-center text-gray-400 py-12 font-medium bg-white rounded-xl border-2 border-gray-200">
            Nenhum lançamento encontrado
          </div>
        )}
        {Object.entries(clientGroups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([clientName, items]) => {
            const isExpanded = expandedClients.has(clientName);
            const total = items.reduce((s, f) => s + (f.amount || 0), 0);
            const paid = items.filter(f => f.status === "paid");
            const overdue = items.filter(f => f.status !== "paid" && f.status !== "cancelled" && f.due_date && moment(f.due_date).isBefore(moment(), "day"));
            const pending = items.filter(f => f.status === "pending" && !moment(f.due_date).isBefore(moment(), "day"));
            const totalPaidAmt = paid.reduce((s, f) => s + (f.amount || 0), 0);
            const totalOverdueAmt = overdue.reduce((s, f) => s + (f.amount || 0), 0);
            const totalPendingAmt = pending.reduce((s, f) => s + (f.amount || 0), 0);

            return (
              <div key={clientName} className="rounded-xl border-2 border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Client row (clickable) */}
                <button
                  onClick={() => toggleClient(clientName)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-cyan-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900">{clientName}</p>
                    <p className="text-xs text-gray-400 font-medium">{items.length} cobrança{items.length !== 1 ? "s" : ""}</p>
                  </div>

                  {/* Summary badges */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {overdue.length > 0 && (
                      <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        {overdue.length} vencida{overdue.length !== 1 ? "s" : ""} · R$ {totalOverdueAmt.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </span>
                    )}
                    {pending.length > 0 && (
                      <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {pending.length} pendente{pending.length !== 1 ? "s" : ""} · R$ {totalPendingAmt.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </span>
                    )}
                    {paid.length > 0 && (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        {paid.length} paga{paid.length !== 1 ? "s" : ""} · R$ {totalPaidAmt.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </span>
                    )}
                    <span className="text-xs font-black text-gray-700 ml-1">
                      R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                    : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                  }
                </button>

                {/* Expanded installments table */}
                {isExpanded && (
                  <div className="border-t-2 border-gray-200 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 border-b border-gray-200">
                          <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-wider pl-14">Descrição</TableHead>
                          <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-wider hidden sm:table-cell">Tipo</TableHead>
                          <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Valor</TableHead>
                          <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Vencimento</TableHead>
                          <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-wider hidden md:table-cell">Pgto. em</TableHead>
                          <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Status</TableHead>
                          <TableHead className="text-[10px] font-black text-gray-500 uppercase tracking-wider w-20">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items
                          .sort((a, b) => moment(b.due_date).diff(moment(a.due_date)))
                          .map((f) => {
                            const isOverdue = f.status !== "paid" && f.status !== "cancelled" && f.due_date && moment(f.due_date).isBefore(moment(), "day");
                            const statusEff = isOverdue ? "overdue" : f.status;
                            const sc = STATUS_COLOR[statusEff] || STATUS_COLOR.pending;
                            return (
                              <TableRow key={f.id} className={`hover:bg-gray-50 border-b border-gray-100 border-l-4 ${sc.border}`}>
                                <TableCell className="text-xs font-bold text-gray-600 pl-14">{f.description || "—"}</TableCell>
                                <TableCell className="text-xs font-bold text-gray-500 hidden sm:table-cell">{TYPE_LABEL[f.type] || f.type || "—"}</TableCell>
                                <TableCell className="text-sm font-black text-gray-900">
                                  R$ {(f.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className={`text-xs font-bold ${isOverdue ? "text-red-600" : "text-gray-600"}`}>
                                  {f.due_date ? moment(f.due_date).format("DD/MM/YYYY") : "—"}
                                </TableCell>
                                <TableCell className="text-xs font-bold text-gray-500 hidden md:table-cell">
                                  {f.payment_date ? moment(f.payment_date).format("DD/MM/YYYY") : "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-[10px] font-black border-0 ${sc.badge}`}>
                                    {STATUS_LABEL[statusEff] || f.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {f.status !== "paid" && f.status !== "cancelled" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-black text-xs gap-1 px-2"
                                      onClick={() => markAsPaid(f.id)}
                                    >
                                      <CheckCheck className="w-3.5 h-3.5" /> Pago
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
      </div>

        </TabsContent>

        {/* ── ABA COMISSÕES ─────────────────────────────────────────────────── */}
        <TabsContent value="comissoes" className="mt-6 space-y-6">

          {/* KPIs comissão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="border-2 border-blue-100 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-wider">Comissão Este Mês</p>
                    <p className="text-2xl font-black text-blue-900 mt-1">
                      R$ {comissaoMesAtualTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-blue-500 mt-0.5 font-medium">{contratosAtivosComissao} contrato(s) ativo(s)</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Award className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-emerald-100 bg-emerald-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">Acumulado</p>
                    <p className="text-2xl font-black text-emerald-900 mt-1">
                      R$ {comissaoAcumuladaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-emerald-500 mt-0.5 font-medium">Total já ganho</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-100 bg-purple-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-purple-600 uppercase tracking-wider">Projetado (36 meses)</p>
                    <p className="text-2xl font-black text-purple-900 mt-1">
                      R$ {comissaoProjetadaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-purple-500 mt-0.5 font-medium">Se todos permanecerem ativos</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-100 bg-amber-50/50">
              <CardContent className="p-4">
                <div>
                  <p className="text-xs font-black text-amber-600 uppercase tracking-wider mb-2">Tabela de Taxas</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Ano 1 (meses 1–12)
                      </span>
                      <span className="text-sm font-black text-amber-900">24%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Ano 2 (meses 13–24)
                      </span>
                      <span className="text-sm font-black text-amber-900">12%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Ano 3 (meses 25–36)
                      </span>
                      <span className="text-sm font-black text-amber-900">12%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela por contrato */}
          <Card className="border-2 border-gray-200 shadow-sm">
            <CardHeader className="border-b-2 border-gray-100 pb-3">
              <CardTitle className="text-sm font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Percent className="w-4 h-4 text-blue-600" />
                Comissões por Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {comissoesContratos.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Percent className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-bold text-sm">Nenhum contrato com dados de comissão</p>
                  <p className="text-xs mt-1">Contratos precisam ter valor mensal e data de início</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        <th className="text-left text-xs font-black text-gray-600 uppercase tracking-wider px-4 py-3">Cliente</th>
                        <th className="text-right text-xs font-black text-gray-600 uppercase tracking-wider px-4 py-3">Mensalidade</th>
                        <th className="text-center text-xs font-black text-gray-600 uppercase tracking-wider px-4 py-3">Mês Atual</th>
                        <th className="text-center text-xs font-black text-gray-600 uppercase tracking-wider px-4 py-3">Taxa</th>
                        <th className="text-right text-xs font-black text-gray-600 uppercase tracking-wider px-4 py-3">Comissão/Mês</th>
                        <th className="text-right text-xs font-black text-gray-600 uppercase tracking-wider px-4 py-3">Acumulado</th>
                        <th className="text-right text-xs font-black text-gray-600 uppercase tracking-wider px-4 py-3">Projetado Total</th>
                        <th className="text-center text-xs font-black text-gray-600 uppercase tracking-wider px-4 py-3">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comissoesContratos.map(({ contract, comissao }) => {
                        const anoAtual = comissao.mesAtual < 12 ? 1 : comissao.mesAtual < 24 ? 2 : comissao.mesAtual < 36 ? 3 : null;
                        return (
                          <tr key={contract.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-black text-gray-900 text-sm">{contract.client_name}</p>
                              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Início: {contract.start_date ? moment(contract.start_date).format("MM/YYYY") : "—"}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-black text-gray-900">
                                R$ {(contract.monthly_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-bold text-gray-700">
                                {comissao.mesAtual >= 36 ? "36+" : comissao.mesAtual + 1}
                              </span>
                              {anoAtual && (
                                <span className="ml-1 text-[10px] font-black text-gray-400">({anoAtual}º ano)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {comissao.ativo ? (
                                <span className={`text-sm font-black ${comissao.taxaAtual === 0.24 ? "text-green-600" : "text-blue-600"}`}>
                                  {(comissao.taxaAtual * 100).toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {comissao.ativo ? (
                                <span className="font-black text-gray-900">
                                  R$ {comissao.comissaoMesAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Encerrado</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-emerald-700">
                                R$ {comissao.totalAcumulado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-purple-700">
                                R$ {comissao.totalProjetado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {comissao.ativo ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                  {comissao.mesesRestantes} mes(es)
                                </span>
                              ) : (
                                <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                                  Encerrado
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td colSpan={4} className="px-4 py-3 text-xs font-black text-gray-600 uppercase">Total</td>
                        <td className="px-4 py-3 text-right font-black text-gray-900">
                          R$ {comissaoMesAtualTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-emerald-700">
                          R$ {comissaoAcumuladaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-purple-700">
                          R$ {comissaoProjetadaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>

      {/* New charge dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[95vw] max-w-md border-2 border-gray-200 p-4 sm:p-6">
          <DialogHeader className="border-b-2 border-gray-100 pb-3">
            <DialogTitle className="font-black text-gray-900">Nova Cobrança</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Cliente *</Label>
              <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} className="border-2 border-gray-200 font-bold" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Descrição</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="border-2 border-gray-200 font-medium" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Valor (R$) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="border-2 border-gray-200 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Vencimento *</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="border-2 border-gray-200 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger className="border-2 border-gray-200 font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Pagamento</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger className="border-2 border-gray-200 font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t-2 border-gray-100 pt-4">
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-2 border-gray-200 font-bold">Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({ ...form, amount: Number(form.amount) })}
              disabled={!form.client_name || !form.amount || !form.due_date}
              className="bg-blue-600 hover:bg-blue-700 font-black"
            >
              Criar Cobrança
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
