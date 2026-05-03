import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import apiClient from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Users, Crown, TrendingUp, DollarSign, Eye, EyeOff } from "lucide-react";
import moment from "moment";

const PLAN_LABELS = { basico: "Básico", profissional: "Profissional", enterprise: "Enterprise" };
const PLAN_COLORS = {
  basico:       "bg-gray-100 text-gray-700 border-gray-300",
  profissional: "bg-blue-100 text-blue-700 border-blue-300",
  enterprise:   "bg-purple-100 text-purple-700 border-purple-300",
};

export default function Team() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showSenha, setShowSenha] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const [erro, setErro] = useState("");

  // Dados da organização
  const { data: org } = useQuery({
    queryKey: ["minha-org"],
    queryFn: async () => (await apiClient.get("/organizacoes/minha")).data.data,
    enabled: !!user?.organizacao_id,
  });

  // Lista de vendedores (role=user) da org
  const { data: todosUsuarios = [] } = useQuery({
    queryKey: ["usuarios-org"],
    queryFn: async () => (await apiClient.get("/usuarios")).data.data,
    enabled: !!user,
  });

  // Contagens por vendedor
  const { data: allLeads = [] } = useQuery({
    queryKey: ["all-leads-team"],
    queryFn: async () => (await apiClient.get("/leads?limit=5000")).data.data,
    enabled: user?.role === "admin",
  });

  const { data: allFinanceiros = [] } = useQuery({
    queryKey: ["all-financeiros-team"],
    queryFn: async () => (await apiClient.get("/financeiros?limit=5000")).data.data,
    enabled: user?.role === "admin",
  });

  const vendedores = todosUsuarios.filter(u => u.role === "user");
  const admins     = todosUsuarios.filter(u => u.role === "admin");

  const limite    = org?.limite_vendedores ?? 3;
  const usados    = vendedores.length;
  const restantes = Math.max(0, limite - usados);

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.post("/usuarios", { usuario: { ...data, role: "user" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios-org"] });
      queryClient.invalidateQueries({ queryKey: ["minha-org"] });
      setShowForm(false);
      setForm({ nome: "", email: "", senha: "" });
      setErro("");
    },
    onError: (e) => setErro(e.response?.data?.error ?? "Erro ao criar vendedor"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/usuarios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios-org"] });
      queryClient.invalidateQueries({ queryKey: ["minha-org"] });
      setDeleteTarget(null);
    },
  });

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Acesso restrito ao administrador da organização.</p>
      </div>
    );
  }

  function statsVendedor(uid) {
    const leads = allLeads.filter(l => l.criado_por === uid).length;
    const comissoes = allFinanceiros.filter(f => f.comissao_usuario_id === uid);
    const comissaoPaga    = comissoes.filter(c => c.status === "pago").reduce((s, c)  => s + (c.comissao_valor || 0), 0);
    const comissaoPendente = comissoes.filter(c => c.status !== "pago").reduce((s, c) => s + (c.comissao_valor || 0), 0);
    return { leads, comissaoPaga, comissaoPendente };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Equipe</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os vendedores da sua organização</p>
        </div>
        <Button
          onClick={() => { setErro(""); setShowForm(true); }}
          disabled={restantes === 0}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Vendedor
        </Button>
      </div>

      {/* Cards de plano e slots */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4 space-y-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Plano Atual</p>
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <Badge variant="outline" className={`text-sm font-semibold ${PLAN_COLORS[org?.plano] ?? ""}`}>
              {PLAN_LABELS[org?.plano] ?? "—"}
            </Badge>
          </div>
          {org?.vencimento_plano && (
            <p className="text-xs text-gray-400">Vence em {moment(org.vencimento_plano).format("DD/MM/YYYY")}</p>
          )}
        </div>

        <div className="bg-white border rounded-xl p-4 space-y-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Vendedores</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-gray-900">{usados}</span>
            <span className="text-gray-400 mb-0.5">/ {limite}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${usados >= limite ? "bg-red-500" : "bg-blue-500"}`}
              style={{ width: `${Math.min(100, (usados / limite) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">
            {restantes > 0 ? `${restantes} slot${restantes > 1 ? "s" : ""} disponível${restantes > 1 ? "s" : ""}` : "Limite atingido — faça upgrade"}
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4 space-y-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Administradores</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-gray-900">{admins.length}</span>
          </div>
          <p className="text-xs text-gray-400">Acesso completo ao painel</p>
        </div>
      </div>

      {/* Tabela de vendedores */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50/50">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4" /> Vendedores Cadastrados
          </h2>
        </div>

        {vendedores.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum vendedor cadastrado ainda.</p>
            <p className="text-xs mt-1">Clique em "Novo Vendedor" para adicionar.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="text-xs font-semibold text-gray-500">Vendedor</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 hidden sm:table-cell">Email</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 text-center">Leads</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 text-right hidden md:table-cell">Comissão Paga</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 text-right hidden md:table-cell">Comissão Pend.</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 hidden lg:table-cell">Cadastrado em</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedores.map(v => {
                const s = statsVendedor(v.id);
                return (
                  <TableRow key={v.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {v.nome?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{v.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 hidden sm:table-cell">{v.email}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-semibold text-gray-700">{s.leads}</span>
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      <span className="text-sm text-emerald-600 font-medium">
                        R$ {s.comissaoPaga.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      <span className="text-sm text-amber-600 font-medium">
                        R$ {s.comissaoPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-400 hidden lg:table-cell">
                      {moment(v.created_date).format("DD/MM/YYYY")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                        onClick={() => setDeleteTarget(v)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Info de planos */}
      <div className="bg-gray-50 border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Limites por Plano</h3>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          {[
            { plano: "basico", label: "Básico", limite: 3, preco: "A partir de R$ 149/mês" },
            { plano: "profissional", label: "Profissional", limite: 10, preco: "A partir de R$ 299/mês" },
            { plano: "enterprise", label: "Enterprise", limite: 50, preco: "A partir de R$ 599/mês" },
          ].map(p => (
            <div key={p.plano} className={`rounded-lg border p-3 ${org?.plano === p.plano ? "ring-2 ring-blue-400 bg-white" : "bg-white"}`}>
              <Badge variant="outline" className={`mb-1 ${PLAN_COLORS[p.plano]}`}>{p.label}</Badge>
              <p className="text-lg font-bold text-gray-900 mt-1">{p.limite}</p>
              <p className="text-gray-500">vendedores</p>
              <p className="text-gray-400 text-[10px] mt-1">{p.preco}</p>
              {org?.plano === p.plano && <p className="text-blue-600 font-semibold text-[10px] mt-1">✓ Plano atual</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Modal novo vendedor */}
      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); setErro(""); }}>
        <DialogContent className="w-[95vw] max-w-sm p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Novo Vendedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {erro}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Nome completo *</Label>
              <Input
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: João da Silva"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="vendedor@empresa.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Senha *</Label>
              <div className="relative">
                <Input
                  type={showSenha ? "text" : "password"}
                  value={form.senha}
                  onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400">O vendedor usará esse e-mail e senha para acessar o sistema.</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              <strong>Slots disponíveis:</strong> {restantes} de {limite} (plano {PLAN_LABELS[org?.plano] ?? "—"})
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.nome || !form.email || !form.senha || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? "Criando..." : "Criar Vendedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vendedor?</AlertDialogTitle>
            <AlertDialogDescription>
              O vendedor <strong>{deleteTarget?.nome}</strong> será removido da organização.
              Os leads e contratos cadastrados por ele serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteMutation.mutate(deleteTarget?.id)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
