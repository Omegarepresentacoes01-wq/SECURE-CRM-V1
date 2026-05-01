import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import LeadTable from "../components/leads/LeadTable";
import LeadForm from "../components/leads/LeadForm";

export default function Leads() {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tempFilter, setTempFilter] = useState("all");

  const queryClient = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ["leads", orgId],
    queryFn: () => base44.entities.Lead.filter({ organization_id: orgId }, "-created_date", 500),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const filtered = leads.filter((l) => {
    const matchSearch = !search || l.name?.toLowerCase().includes(search.toLowerCase()) || l.company?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchTemp = tempFilter === "all" || l.temperature === tempFilter;
    return matchSearch && matchStatus && matchTemp;
  });

  const handleSave = async (data) => {
    const payload = { ...data, organization_id: orgId };
    if (editingLead) {
      await updateMutation.mutateAsync({ id: editingLead.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isAdmin ? "Leads" : "Meus Leads"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{leads.length} leads cadastrados</p>
        </div>
        <Button onClick={() => { setEditingLead(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" /> Novo Lead
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, empresa ou telefone..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="new">Novo</SelectItem>
            <SelectItem value="contacted">Contato</SelectItem>
            <SelectItem value="qualified">Qualificado</SelectItem>
            <SelectItem value="proposal">Proposta</SelectItem>
            <SelectItem value="negotiation">Negociação</SelectItem>
            <SelectItem value="won">Ganho</SelectItem>
            <SelectItem value="lost">Perdido</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tempFilter} onValueChange={setTempFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Temperatura" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="cold">Frio</SelectItem>
            <SelectItem value="warm">Morno</SelectItem>
            <SelectItem value="hot">Quente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <LeadTable
        leads={filtered}
        onEdit={(lead) => { setEditingLead(lead); setShowForm(true); }}
        onDelete={isAdmin ? (id) => deleteMutation.mutate(id) : null}
      />

      <LeadForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingLead(null); }}
        onSave={handleSave}
        initialData={editingLead}
        isAdmin={isAdmin}
        currentUserId={user?.id}
      />
    </div>
  );
}
