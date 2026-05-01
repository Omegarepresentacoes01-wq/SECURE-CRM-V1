import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Search, FileText, Edit, Eye, XCircle, RefreshCw,
  ArrowRightLeft, DollarSign, AlertTriangle,
} from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import moment from "moment";

const STATUS_LABEL = { active: "Ativo", expired: "Expirado", cancelled: "Cancelado", pending_renewal: "Renovação Pend." };
const STATUS_COLOR = {
  active:          { badge: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-500" },
  expired:         { badge: "bg-gray-100 text-gray-700",       border: "border-l-gray-400" },
  cancelled:       { badge: "bg-red-100 text-red-700",         border: "border-l-red-500" },
  pending_renewal: { badge: "bg-amber-100 text-amber-700",     border: "border-l-amber-500" },
};
const TYPE_LABEL = {
  monitoring_comodato: "Monit. + Comodato",
  equipment_sale:      "Venda Equipamentos",
  monitoring_only:     "Só Monitoramento",
  project:             "Projeto",
};
const PAYMENT_LABEL = {
  boleto: "Boleto", credit_card: "Cartão", pix: "PIX",
  bank_transfer: "Transferência", debit: "Débito",
};

const EMPTY_FORM = {
  lead_id: "", client_name: "", contract_type: "monitoring_comodato", status: "active",
  start_date: "", end_date: "", duration_months: 12, monthly_value: "",
  installation_fee: "", total_value: "", payment_method: "boleto", sla_hours: 4, notes: "",
};

// ── Contract Detail / Edit Modal ─────────────────────────────────────────────
function ContractDetailModal({ contract, onClose, onUpdate }) {
  const [editMode, setEditMode]     = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showPlan, setShowPlan]     = useState(false);
  const [form, setForm]             = useState({ ...contract });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const sc = STATUS_COLOR[contract.status] || STATUS_COLOR.active;

  const handleSave = () => {
    onUpdate(contract.id, {
      ...form,
      monthly_value:    form.monthly_value    ? Number(form.monthly_value)    : undefined,
      installation_fee: form.installation_fee ? Number(form.installation_fee) : undefined,
      total_value:      form.total_value      ? Number(form.total_value)      : undefined,
      duration_months:  Number(form.duration_months),
      sla_hours:        Number(form.sla_hours),
    });
    setEditMode(false);
  };

  const handleRenew = () => {
    const months = contract.duration_months || 12;
    const newEnd = contract.end_date
      ? moment(contract.end_date).add(months, "months").format("YYYY-MM-DD")
      : moment().add(months, "months").format("YYYY-MM-DD");
    onUpdate(contract.id, { status: "active", end_date: newEnd });
    onClose();
  };

  const handleCancel = () => {
    onUpdate(contract.id, { status: "cancelled" });
    onClose();
  };

  const daysToExpiry = contract.end_date ? moment(contract.end_date).diff(moment(), "days") : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[88vh] overflow-y-auto border-2 border-gray-200 p-4 sm:p-6">
        <DialogHeader className="border-b-2 border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-1.5 self-stretch rounded-full ${sc.border.replace("border-l-", "bg-")}`} />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-black text-gray-900 truncate">{contract.client_name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={`text-[10px] font-black border-0 ${sc.badge}`}>
                  {STATUS_LABEL[contract.status] || contract.status}
                </Badge>
                <span className="text-xs font-bold text-gray-500">{TYPE_LABEL[contract.contract_type] || contract.contract_type}</span>
                {daysToExpiry !== null && contract.status === "active" && (
                  <span className={`text-xs font-black ${daysToExpiry <= 7 ? "text-red-600" : daysToExpiry <= 30 ? "text-amber-600" : "text-gray-500"}`}>
                    · Vence em {daysToExpiry}d
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {!editMode ? (
          <div className="py-4 space-y-4">
            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Valor Mensal",    value: contract.monthly_value    ? `R$ ${Number(contract.monthly_value).toLocaleString("pt-BR")}` : "—",    color: "text-emerald-700" },
                { label: "Taxa Instalação", value: contract.installation_fee ? `R$ ${Number(contract.installation_fee).toLocaleString("pt-BR")}` : "—", color: "text-blue-700" },
                { label: "Valor Total",     value: contract.total_value      ? `R$ ${Number(contract.total_value).toLocaleString("pt-BR")}` : "—",      color: "text-indigo-700" },
                { label: "Início",          value: contract.start_date ? moment(contract.start_date).format("DD/MM/YYYY") : "—",                         color: "text-gray-800" },
                { label: "Término",         value: contract.end_date   ? moment(contract.end_date).format("DD/MM/YYYY") : "—",                           color: daysToExpiry !== null && daysToExpiry <= 7 ? "text-red-700 font-black" : "text-gray-800" },
                { label: "SLA",             value: contract.sla_hours  ? `${contract.sla_hours}h` : "—",                                                 color: "text-gray-800" },
                { label: "Duração",         value: contract.duration_months ? `${contract.duration_months} meses` : "—",                                 color: "text-gray-800" },
                { label: "Pagamento",       value: PAYMENT_LABEL[contract.payment_method] || contract.payment_method || "—",                             color: "text-gray-800" },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3 border-2 border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{item.label}</p>
                  <p className={`text-sm font-black ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {contract.notes && (
              <div className="bg-gray-50 rounded-xl p-3 border-2 border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Observações</p>
                <p className="text-sm text-gray-700 leading-relaxed">{contract.notes}</p>
              </div>
            )}

            {daysToExpiry !== null && daysToExpiry <= 30 && contract.status === "active" && (
              <div className="flex items-center gap-2 bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs font-black text-amber-700">
                  Vence em {daysToExpiry} dia{daysToExpiry !== 1 ? "s" : ""} · {moment(contract.end_date).format("DD/MM/YYYY")} — considere renovar!
                </p>
              </div>
            )}
            {contract.status === "cancelled" && (
              <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-xl p-3">
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                <p className="text-xs font-black text-red-700">Este contrato foi cancelado.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Cliente *</Label>
                <Input value={form.client_name} onChange={e => set("client_name", e.target.value)} className="border-2 border-gray-200 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Tipo de Contrato</Label>
                <Select value={form.contract_type} onValueChange={v => set("contract_type", v)}>
                  <SelectTrigger className="border-2 border-gray-200 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger className="border-2 border-gray-200 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Pagamento</Label>
                <Select value={form.payment_method} onValueChange={v => set("payment_method", v)}>
                  <SelectTrigger className="border-2 border-gray-200 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wide text-gray-600">SLA (horas)</Label>
                <Input type="number" value={form.sla_hours} onChange={e => set("sla_hours", e.target.value)} className="border-2 border-gray-200 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Início</Label>
                <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="border-2 border-gray-200 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Término</Label>
                <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="border-2 border-gray-200 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Valor Mensal (R$)</Label>
                <Input type="number" value={form.monthly_value} onChange={e => set("monthly_value", e.target.value)} className="border-2 border-gray-200 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Taxa Instalação (R$)</Label>
                <Input type="number" value={form.installation_fee} onChange={e => set("installation_fee", e.target.value)} className="border-2 border-gray-200 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Valor Total (R$)</Label>
                <Input type="number" value={form.total_value} onChange={e => set("total_value", e.target.value)} className="border-2 border-gray-200 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Duração (meses)</Label>
                <Input type="number" value={form.duration_months} onChange={e => set("duration_months", e.target.value)} className="border-2 border-gray-200 font-bold" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Observações</Label>
                <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className="border-2 border-gray-200" />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t-2 border-gray-100 pt-4 flex-wrap gap-2">
          {!editMode ? (
            showCancel ? (
              <div className="flex items-center gap-2 w-full justify-end">
                <span className="text-xs font-black text-red-700 mr-auto">Confirmar cancelamento do contrato?</span>
                <Button size="sm" variant="outline" onClick={() => setShowCancel(false)} className="border-2 border-gray-200 font-bold">Não</Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 font-black" onClick={handleCancel}>Sim, Cancelar</Button>
              </div>
            ) : showPlan ? (
              <div className="flex items-center gap-2 w-full justify-end flex-wrap">
                <span className="text-xs font-black text-indigo-700 mr-auto">Selecione o novo plano:</span>
                <Select value={form.contract_type} onValueChange={v => set("contract_type", v)}>
                  <SelectTrigger className="w-full sm:w-52 border-2 border-gray-200 font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => setShowPlan(false)} className="border-2 border-gray-200 font-bold">Cancelar</Button>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-black" onClick={() => { onUpdate(contract.id, { contract_type: form.contract_type }); onClose(); }}>
                  Salvar
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" onClick={onClose} className="border-2 border-gray-200 font-bold">Fechar</Button>
                {contract.status !== "cancelled" && (
                  <>
                    <Button variant="outline" onClick={() => setShowPlan(true)} className="border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-black gap-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Alterar Plano
                    </Button>
                    <Button variant="outline" onClick={handleRenew} className="border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-black gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Renovar
                    </Button>
                    <Button variant="outline" onClick={() => setShowCancel(true)} className="border-2 border-red-200 text-red-700 hover:bg-red-50 font-black gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Cancelar Contrato
                    </Button>
                    <Button onClick={() => setEditMode(true)} className="bg-blue-600 hover:bg-blue-700 font-black gap-1.5">
                      <Edit className="w-3.5 h-3.5" /> Editar
                    </Button>
                  </>
                )}
              </>
            )
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)} className="border-2 border-gray-200 font-bold">Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.client_name} className="bg-blue-600 hover:bg-blue-700 font-black">Salvar Alterações</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create Contract Modal ────────────────────────────────────────────────────
function CreateContractModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[88vh] overflow-y-auto border-2 border-gray-200 p-4 sm:p-6">
        <DialogHeader className="border-b-2 border-gray-100 pb-3">
          <DialogTitle className="font-black text-gray-900">Novo Contrato</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Cliente *</Label>
            <Input value={form.client_name} onChange={e => set("client_name", e.target.value)} className="border-2 border-gray-200 font-bold" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Tipo</Label>
            <Select value={form.contract_type} onValueChange={v => set("contract_type", v)}>
              <SelectTrigger className="border-2 border-gray-200 font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Pagamento</Label>
            <Select value={form.payment_method} onValueChange={v => set("payment_method", v)}>
              <SelectTrigger className="border-2 border-gray-200 font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Início</Label>
            <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="border-2 border-gray-200 font-bold" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Término</Label>
            <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="border-2 border-gray-200 font-bold" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Valor Mensal (R$)</Label>
            <Input type="number" value={form.monthly_value} onChange={e => set("monthly_value", e.target.value)} className="border-2 border-gray-200 font-bold" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Taxa Instalação (R$)</Label>
            <Input type="number" value={form.installation_fee} onChange={e => set("installation_fee", e.target.value)} className="border-2 border-gray-200 font-bold" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Duração (meses)</Label>
            <Input type="number" value={form.duration_months} onChange={e => set("duration_months", e.target.value)} className="border-2 border-gray-200 font-bold" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wide text-gray-600">SLA (horas)</Label>
            <Input type="number" value={form.sla_hours} onChange={e => set("sla_hours", e.target.value)} className="border-2 border-gray-200 font-bold" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wide text-gray-600">Observações</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className="border-2 border-gray-200" />
          </div>
        </div>
        <DialogFooter className="border-t-2 border-gray-100 pt-4">
          <Button variant="outline" onClick={onClose} className="border-2 border-gray-200 font-bold">Cancelar</Button>
          <Button
            onClick={() => onCreate({
              ...form,
              monthly_value:    form.monthly_value    ? Number(form.monthly_value)    : undefined,
              installation_fee: form.installation_fee ? Number(form.installation_fee) : undefined,
              total_value:      form.total_value      ? Number(form.total_value)      : undefined,
              duration_months:  Number(form.duration_months),
              sla_hours:        Number(form.sla_hours),
            })}
            disabled={!form.client_name}
            className="bg-blue-600 hover:bg-blue-700 font-black"
          >
            Criar Contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Contracts() {
  const [showCreate, setShowCreate]     = useState(false);
  const [viewContract, setViewContract] = useState(null);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const queryClient = useQueryClient();
  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contract.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contracts"] }); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contract.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts"] }),
  });

  const filtered = contracts.filter((c) => {
    const matchSearch = !search || c.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeContracts   = contracts.filter(c => c.status === "active");
  const expiringContracts = contracts.filter(c =>
    c.status === "active" && c.end_date && moment(c.end_date).diff(moment(), "days") <= 30
  );
  const mrr = activeContracts.reduce((s, c) => s + (c.monthly_value || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Contratos</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">{contracts.length} contratos cadastrados</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 font-black gap-2">
          <Plus className="w-4 h-4" /> Novo Contrato
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Contratos Ativos"  value={activeContracts.length}                        icon={FileText}      color="green"  subtitle="em vigência" />
        <StatsCard title="MRR"               value={`R$ ${mrr.toLocaleString("pt-BR")}`}           icon={DollarSign}    color="indigo" subtitle="receita mensal recorrente" />
        <StatsCard title="Vencendo em 30d"   value={expiringContracts.length}                       icon={AlertTriangle} color="amber"  subtitle="precisam renovação" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="pl-9 border-2 border-gray-200 font-medium"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 border-2 border-gray-200 font-bold"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border-2 border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 border-b-2 border-gray-200">
              <TableHead className="text-xs font-black text-gray-600 uppercase tracking-wider pl-4">Cliente</TableHead>
              <TableHead className="text-xs font-black text-gray-600 uppercase tracking-wider">Tipo</TableHead>
              <TableHead className="text-xs font-black text-gray-600 uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-xs font-black text-gray-600 uppercase tracking-wider">Mensal</TableHead>
              <TableHead className="text-xs font-black text-gray-600 uppercase tracking-wider hidden md:table-cell">Início</TableHead>
              <TableHead className="text-xs font-black text-gray-600 uppercase tracking-wider hidden md:table-cell">Término</TableHead>
              <TableHead className="text-xs font-black text-gray-600 uppercase tracking-wider hidden lg:table-cell">SLA</TableHead>
              <TableHead className="text-xs font-black text-gray-600 uppercase tracking-wider w-16">Ver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-400 py-12 font-medium">
                  Nenhum contrato encontrado
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => {
              const sc = STATUS_COLOR[c.status] || STATUS_COLOR.active;
              const isExpiring = c.status === "active" && c.end_date && moment(c.end_date).diff(moment(), "days") <= 14;
              return (
                <TableRow
                  key={c.id}
                  className={`hover:bg-blue-50/30 border-b border-gray-100 cursor-pointer transition-colors border-l-4 ${sc.border}`}
                  onClick={() => setViewContract(c)}
                >
                  <TableCell className="text-sm font-black text-gray-900 pl-4">{c.client_name}</TableCell>
                  <TableCell className="text-xs font-bold text-gray-600">{TYPE_LABEL[c.contract_type] || c.contract_type}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] font-black border-0 ${sc.badge}`}>
                      {STATUS_LABEL[c.status] || c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-black text-emerald-700">
                    {c.monthly_value ? `R$ ${Number(c.monthly_value).toLocaleString("pt-BR")}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-gray-500 hidden md:table-cell">
                    {c.start_date ? moment(c.start_date).format("DD/MM/YY") : "—"}
                  </TableCell>
                  <TableCell className={`text-xs font-bold hidden md:table-cell ${isExpiring ? "text-red-600" : "text-gray-500"}`}>
                    {c.end_date ? moment(c.end_date).format("DD/MM/YY") : "—"}{isExpiring && " ⚠"}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-gray-500 hidden lg:table-cell">
                    {c.sla_hours ? `${c.sla_hours}h` : "—"}
                  </TableCell>
                  <TableCell>
                    <button className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {showCreate && (
        <CreateContractModal
          onClose={() => setShowCreate(false)}
          onCreate={(data) => createMutation.mutate(data)}
        />
      )}
      {viewContract && (
        <ContractDetailModal
          contract={viewContract}
          onClose={() => setViewContract(null)}
          onUpdate={(id, data) => updateMutation.mutate({ id, data })}
        />
      )}
    </div>
  );
}
