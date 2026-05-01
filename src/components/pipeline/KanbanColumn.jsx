import React from "react";
import { Badge } from "@/components/ui/badge";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";

// Map of column id → accent color classes
const COL_COLORS = {
  new:         { bar: "bg-gradient-to-r from-slate-500 to-slate-700",    zoneBg: "bg-slate-100/80 dark:bg-slate-700/40",    zoneBorder: "border-slate-300 dark:border-slate-500",   empty: "border-slate-400 dark:border-slate-500" },
  contacted:   { bar: "bg-gradient-to-r from-purple-500 to-purple-700",  zoneBg: "bg-purple-50/80 dark:bg-purple-900/50",   zoneBorder: "border-purple-300 dark:border-purple-500", empty: "border-purple-400 dark:border-purple-500" },
  qualified:   { bar: "bg-gradient-to-r from-amber-400 to-amber-600",    zoneBg: "bg-amber-50/80 dark:bg-amber-900/50",     zoneBorder: "border-amber-300 dark:border-amber-500",   empty: "border-amber-400 dark:border-amber-500" },
  proposal:    { bar: "bg-gradient-to-r from-cyan-500 to-cyan-700",      zoneBg: "bg-cyan-50/80 dark:bg-cyan-900/50",       zoneBorder: "border-cyan-300 dark:border-cyan-500",     empty: "border-cyan-400 dark:border-cyan-500" },
  negotiation: { bar: "bg-gradient-to-r from-orange-500 to-orange-700",  zoneBg: "bg-orange-50/80 dark:bg-orange-900/50",   zoneBorder: "border-orange-300 dark:border-orange-500", empty: "border-orange-400 dark:border-orange-500" },
  won:         { bar: "bg-gradient-to-r from-emerald-500 to-emerald-700",zoneBg: "bg-emerald-50/80 dark:bg-emerald-900/50", zoneBorder: "border-emerald-300 dark:border-emerald-500",empty: "border-emerald-400 dark:border-emerald-500" },
  lost:        { bar: "bg-gradient-to-r from-red-500 to-red-700",        zoneBg: "bg-red-50/80 dark:bg-red-900/50",         zoneBorder: "border-red-300 dark:border-red-500",       empty: "border-red-400 dark:border-red-500" },
};

export default function KanbanColumn({ id, title, leads, onCardClick }) {
  const c = COL_COLORS[id] || COL_COLORS.new;
  const totalValue = leads.reduce((s, l) => s + (l.estimated_value || 0), 0);

  return (
    <div className="flex-shrink-0 w-64 sm:w-72">
      {/* Column header */}
      <div className={`rounded-t-xl ${c.bar} px-3 py-3 shadow-md`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white uppercase tracking-widest drop-shadow">{title}</h3>
          <Badge className="text-[10px] font-black bg-black/25 text-white border-0">
            {leads.length}
          </Badge>
        </div>
        {totalValue > 0 && (
          <p className="text-[11px] font-black text-white/90 mt-1 drop-shadow">
            R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </p>
        )}
      </div>

      {/* Drop zone */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 min-h-[400px] p-2 rounded-b-xl border-x-2 border-b-2 transition-colors
              ${snapshot.isDraggingOver ? `bg-blue-50 dark:bg-blue-900/40 border-blue-400 dark:border-blue-500` : `${c.zoneBg} ${c.zoneBorder}`}`}
          >
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div className={`mt-4 mx-1 border-2 border-dashed ${c.empty} rounded-lg py-8 text-center`}>
                <p className="text-xs font-medium text-gray-400">Nenhum lead</p>
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
