import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye, Phone, Building2 } from "lucide-react";
import moment from "moment";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";

const tempColors = {
  cold: "bg-blue-100 text-blue-700",
  warm: "bg-amber-100 text-amber-700",
  hot:  "bg-red-100 text-red-700",
};
const tempLabels = { cold: "Frio", warm: "Morno", hot: "Quente" };

const statusLabels = {
  new: "Novo", contacted: "Contato", qualified: "Qualificado",
  proposal: "Proposta", negotiation: "Negociação", won: "Ganho", lost: "Perdido",
};
const statusColors = {
  new:         "bg-gray-100 text-gray-700",
  contacted:   "bg-purple-100 text-purple-700",
  qualified:   "bg-amber-100 text-amber-700",
  proposal:    "bg-cyan-100 text-cyan-700",
  negotiation: "bg-orange-100 text-orange-700",
  won:         "bg-emerald-100 text-emerald-700",
  lost:        "bg-red-100 text-red-700",
};

// ── Card individual para mobile ─────────────────────────────────────────────
function LeadCard({ lead, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden active:scale-[0.99] transition-transform">
      {/* Cabeçalho do card */}
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-900 text-sm truncate">{lead.name}</p>
          {(lead.company || lead.email) && (
            <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
              {lead.company && <Building2 className="w-3 h-3 shrink-0" />}
              {lead.company || lead.email}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="secondary" className={`text-[10px] ${statusColors[lead.status] || statusColors.new}`}>
            {statusLabels[lead.status] || "Novo"}
          </Badge>
          <Badge variant="secondary" className={`text-[10px] ${tempColors[lead.temperature] || tempColors.cold}`}>
            {tempLabels[lead.temperature] || "Frio"}
          </Badge>
        </div>
      </div>

      {/* Detalhes */}
      <div className="flex items-center justify-between px-3 pb-2.5 border-t border-gray-100 pt-2">
        <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate max-w-[130px]">{lead.phone || "—"}</span>
        </div>

        {lead.estimated_value > 0 && (
          <span className="text-[11px] font-black text-white bg-emerald-600 px-2 py-0.5 rounded-full shadow-sm">
            R$ {lead.estimated_value.toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between border-t border-gray-100 px-2 py-1.5 bg-gray-50/60">
        <span className="text-[10px] text-gray-400 font-medium pl-1">
          {moment(lead.created_date).format("DD/MM/YY")}
        </span>
        <div className="flex items-center gap-0.5">
          <Link to={createPageUrl(`LeadDetail?id=${lead.id}`)}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <Eye className="w-3.5 h-3.5 text-blue-500" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onEdit(lead)}>
            <Pencil className="w-3.5 h-3.5 text-gray-500" />
          </Button>
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onDelete(lead.id)}>
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────
export default function LeadTable({ leads, onEdit, onDelete }) {
  return (
    <>
      {/* ── Mobile: lista de cards (< md) ─── */}
      <div className="md:hidden space-y-2">
        {leads.length === 0 && (
          <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-gray-100">
            <p className="font-semibold">Nenhum lead encontrado</p>
            <p className="text-xs mt-1">Ajuste os filtros ou cadastre um novo lead</p>
          </div>
        )}
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      {/* ── Tablet/Desktop: tabela (md+) ─── */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-100 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="text-xs font-semibold text-gray-500">Nome</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500">Telefone</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 hidden lg:table-cell">Tipo Negócio</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500">Status</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500">Temp.</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 hidden xl:table-cell">Valor</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 hidden xl:table-cell">Criado</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-400 py-10">
                  Nenhum lead encontrado
                </TableCell>
              </TableRow>
            )}
            {leads.map((lead) => (
              <TableRow key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                    <p className="text-xs text-gray-400">{lead.company || lead.email || "—"}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600">{lead.phone}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-xs text-gray-500">
                    {lead.business_type?.replace(/_/g, " ") || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`text-[10px] ${statusColors[lead.status] || statusColors.new}`}>
                    {statusLabels[lead.status] || "Novo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`text-[10px] ${tempColors[lead.temperature] || tempColors.cold}`}>
                    {tempLabels[lead.temperature] || "Frio"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden xl:table-cell text-sm font-medium text-gray-700">
                  {lead.estimated_value ? `R$ ${lead.estimated_value.toLocaleString("pt-BR")}` : "—"}
                </TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-gray-400">
                  {moment(lead.created_date).format("DD/MM/YY")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    <Link to={createPageUrl(`LeadDetail?id=${lead.id}`)}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(lead)}>
                      <Pencil className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                    {onDelete && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(lead.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
