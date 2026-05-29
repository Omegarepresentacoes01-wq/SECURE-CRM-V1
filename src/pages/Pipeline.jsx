import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext } from "@hello-pangea/dnd";
import KanbanColumn from "../components/pipeline/KanbanColumn";
import PreContractModal from "../components/leads/PreContractModal";
import { createPageUrl } from "../utils";

const COLUMNS = [
  { id: "new",         title: "Lead Recebido" },
  { id: "contacted",   title: "Contato Realizado" },
  { id: "qualified",   title: "Qualificado" },
  { id: "proposal",    title: "Proposta Enviada" },
  { id: "negotiation", title: "Negociação" },
  { id: "won",         title: "Fechado ✓" },
  { id: "lost",        title: "Perdido ✗" },
];

export default function Pipeline() {
  const queryClient = useQueryClient();
  const [leadParaContrato, setLeadParaContrato] = useState(null);

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 500),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const lead = leads.find((l) => String(l.id) === draggableId);
    if (lead && lead.status !== newStatus) {
      updateMutation.mutate({ id: lead.id, data: { status: newStatus } });
      if (newStatus === "won") {
        setLeadParaContrato(lead);
      }
    }
  };

  const handleCardClick = (lead) => {
    window.location.href = createPageUrl(`LeadDetail?id=${lead.id}`);
  };

  const totalValue = leads
    .filter((l) => !["lost"].includes(l.status))
    .reduce((s, l) => s + (l.estimated_value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Pipeline</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {leads.length} leads · R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </p>
        </div>
        {/* Dica de scroll apenas no mobile */}
        <p className="sm:hidden text-[11px] text-gray-400 font-medium flex items-center gap-1">
          ← deslize para ver todas as etapas →
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/*
          snap-x + snap-mandatory = desliza uma coluna por vez no mobile
          scroll-smooth = animação suave
          gap menor no mobile para mostrar o início da próxima coluna (peek)
        */}
        <div
          className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 snap-x snap-mandatory scroll-smooth"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              leads={leads.filter((l) => l.status === col.id)}
              onCardClick={handleCardClick}
            />
          ))}
          {/* Espaçador final para que a última coluna não fique colada na borda */}
          <div className="shrink-0 w-3 sm:w-1" aria-hidden="true" />
        </div>
      </DragDropContext>

      {leadParaContrato && (
        <PreContractModal
          lead={leadParaContrato}
          onClose={() => setLeadParaContrato(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["leads"] })}
        />
      )}
    </div>
  );
}
