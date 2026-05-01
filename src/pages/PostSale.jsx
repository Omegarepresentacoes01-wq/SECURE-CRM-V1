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
import { Plus, Search, CheckCircle2 } from "lucide-react";
import moment from "moment";

const typeLabels = { onboarding: "Onboarding", support: "Suporte", satisfaction_survey: "Pesquisa", renewal: "Renovação", upsell: "Upsell", maintenance: "Manutenção" };
const statusLabels = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluído", cancelled: "Cancelado" };
const statusColors = { pending: "bg-amber-100 text-amber-700", in_progress: "bg-blue-100 text-blue-700", completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-gray-100 text-gray-700" };

export default function PostSale() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    client_name: "", type: "onboarding", title: "", description: "",
    status: "pending", due_date: "", notes: "",
  });

  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["postsale"],
    queryFn: () => base44.entities.PostSale.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PostSale.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["postsale"] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PostSale.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["postsale"] }),
  });

  const filtered = items.filter((i) =>
    !search || i.client_name?.toLowerCase().includes(search.toLowerCase()) || i.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pós-Venda</h1>
          <p className="text-sm text-gray-500 mt-1">Acompanhamento e retenção de clientes</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" /> Nova Ação
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="text-xs font-semibold text-gray-500">Cliente</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500">Tipo</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500">Título</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500">Status</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 hidden md:table-cell">Prazo</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 hidden md:table-cell">Satisfação</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 w-20">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-10">Nenhuma ação</TableCell></TableRow>
            )}
            {filtered.map((item) => (
              <TableRow key={item.id} className="hover:bg-gray-50/50">
                <TableCell className="text-sm font-medium text-gray-900">{item.client_name}</TableCell>
                <TableCell className="text-xs text-gray-500">{typeLabels[item.type] || item.type}</TableCell>
                <TableCell className="text-sm text-gray-700">{item.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`text-[10px] ${statusColors[item.status]}`}>{statusLabels[item.status]}</Badge>
                </TableCell>
                <TableCell className="text-xs text-gray-400 hidden md:table-cell">{item.due_date ? moment(item.due_date).format("DD/MM/YY") : "—"}</TableCell>
                <TableCell className="text-xs text-gray-400 hidden md:table-cell">{item.satisfaction_score ? `${item.satisfaction_score}/10` : "—"}</TableCell>
                <TableCell>
                  {item.status !== "completed" && (
                    <Button variant="ghost" size="sm" className="text-xs text-emerald-600" onClick={() => updateMutation.mutate({ id: item.id, data: { status: "completed", completed_date: new Date().toISOString().split("T")[0] } })}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
          <DialogHeader><DialogTitle>Nova Ação Pós-Venda</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Cliente *</Label>
              <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prazo</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.client_name || !form.title} className="bg-blue-600 hover:bg-blue-700">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}