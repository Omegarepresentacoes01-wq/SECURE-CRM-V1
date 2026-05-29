import React from "react";
import { Badge } from "@/components/ui/badge";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";

const COL_COLORS = {
  new:         { bar: "bg-gradient-to-r from-slate-500 to-slate-700",    zoneBg: "bg-slate-100/80",    zoneBorder: "border-slate-300",   empty: "border-slate-400" },
  contacted:   { bar: "bg-gradient-to-r from-purple-500 to-purple-700",  zoneBg: "bg-purple-50/80",   zoneBorder: "border-purple-300", empty: "border-purple-400" },
  qualified:   { bar: "bg-gradient-to-r from-amber-400 to-amber-600",    zoneBg: "bg-amber-50/80",     zoneBorder: "border-amber-300",   empty: "border-amber-400" },
  proposal:    { bar: "bg-gradient-to-r from-cyan-500 to-cyan-700",      zoneBg: "bg-cyan-50/80",       zoneBorder: "border-cyan-300",     empty: "border-cyan-400" },
  negotiation: { bar: "bg-gradient-to-r from-orange-500 to-orange-700",  zoneBg: "bg-orange-50/80",   zoneBorder: "border-orange-300", empty: "border-orange-400" },
  won:         { bar: "bg-gradient-to-r from-emerald-500 to-emerald-700",zoneBg: "bg-emerald-50/80", zoneBorder: "border-emerald-300",empty: "border-emerald-400" },
  lost:        { bar: "bg-gradient-to-r from-red-500 to-red-700",        zoneBg: "bg-red-50/80",         zoneBorder: "border-red-300",       empty: "border-red-400" },
};

export default function KanbanColumn({ id, title, leads, onCardClick }) {
  const c = COL_COLORS[id] || COL_COLORS.new;
  const totalValue = leads.reduce((s, l) => s + (l.estimated_value || 0), 0);

  return (
    /* snap-start para scroll por coluna no mobile */
    <div className="flex-shrink-0 w-[220px] sm:w-[256px] lg:w-[272px] snap-start">
      {/* Cabeçalho */}
      <div className={`rounded-t-xl ${c.bar} px-3 py-2.5 shadow-md`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] sm:text-xs font-black text-white uppercase tracking-widest drop-shadow leading-tight truncate">
            {title}
          </h3>
          <Badge className="text-[10px] font-black bg-black/25 text-white border-0 shrink-0">
            {leads.length}
          </Badge>
        </div>
        {totalValue > 0 && (
          <p className="text-[10px] sm:text-[11px] font-black text-white/90 mt-1 drop-shadow">
            R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </p>
        )}
      </div>

      {/* Zona de drop */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 min-h-[280px] sm:min-h-[380px] p-2 rounded-b-xl border-x-2 border-b-2 transition-colors
              ${snapshot.isDraggingOver
                ? "bg-blue-50 border-blue-400"
                : `${c.zoneBg} ${c.zoneBorder}`}`}
          >
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div className={`mt-4 mx-1 border-2 border-dashed ${c.empty} rounded-lg py-6 text-center`}>
                <p className="text-[11px] font-medium text-gray-400">Nenhum lead</p>
              </div>
            )}
            {leads.map((lead, index) => (
              <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    onClick={() => onCardClick(lead)}
                  >
                    <KanbanCard lead={lead} isDragging={snap.isDragging} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
