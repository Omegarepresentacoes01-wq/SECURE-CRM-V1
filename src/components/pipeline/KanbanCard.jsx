import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Clock, Building2 } from "lucide-react";
import moment from "moment";

const TEMP = {
  cold: { border: "border-l-blue-500",  dot: "bg-blue-500",   label: "Frio",   badge: "bg-blue-600 text-white",   cardBg: "bg-blue-50/30" },
  warm: { border: "border-l-amber-500", dot: "bg-amber-400",  label: "Morno",  badge: "bg-amber-500 text-white",  cardBg: "bg-amber-50/30" },
  hot:  { border: "border-l-red-500",   dot: "bg-red-500",    label: "Quente", badge: "bg-red-600 text-white",    cardBg: "bg-red-50/30" },
};

const ORIGIN_LABEL = {
  facebook: "Facebook", instagram: "Instagram", google: "Google",
  whatsapp: "WhatsApp", referral: "Indicação", website: "Site",
  cold_call: "Ligação", other: "Outro",
};

export default function KanbanCard({ lead, isDragging }) {
  const temp = TEMP[lead.temperature] || TEMP.cold;
  const daysInStage = lead.updated_date
    ? moment().diff(moment(lead.updated_date), "days")
    : moment().diff(moment(lead.created_date), "days");

  return (
    <Card
      className={`${temp.cardBg} border-2 border-gray-200 border-l-[5px] ${temp.border} cursor-grab active:cursor-grabbing transition-shadow
        ${isDragging ? "shadow-xl rotate-1 ring-2 ring-blue-300" : "hover:shadow-lg"}`}
    >
      <div className="p-3 space-y-2">
        {/* Header: name + temp badge */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-black text-gray-900 leading-tight truncate">{lead.name}</p>
          <Badge className={`text-[9px] font-black shrink-0 ${temp.badge} border-0 shadow-sm`}>
            <span className={`w-1.5 h-1.5 rounded-full bg-white/60 mr-1 inline-block`} />
            {temp.label}
          </Badge>
        </div>

        {/* Company */}
        {lead.company && (
          <div className="flex items-center gap-1 text-xs text-gray-700">
            <Building2 className="w-3 h-3 shrink-0 text-gray-500" />
            <span className="truncate font-bold">{lead.company}</span>
          </div>
        )}

        {/* City + Origin */}
        <div className="flex items-center gap-3 text-xs text-gray-600">
          {lead.city && (
            <span className="flex items-center gap-0.5 font-bold">
              <MapPin className="w-3 h-3 text-gray-500" />{lead.city}
            </span>
          )}
          {lead.origin && (
            <span className="font-black text-indigo-600">
              {ORIGIN_LABEL[lead.origin] || lead.origin}
            </span>
          )}
        </div>

        {/* Bottom: phone + value + days */}
        <div className="flex items-center justify-between pt-1 border-t-2 border-gray-200">
          <div className="flex items-center gap-1 text-xs text-gray-600 font-bold">
            <Phone className="w-3 h-3 text-gray-500" />
            <span className="truncate max-w-[90px]">{lead.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            {daysInStage > 0 && (
              <span className={`flex items-center gap-0.5 text-[10px] font-black ${daysInStage >= 7 ? "text-red-600" : daysInStage >= 3 ? "text-amber-600" : "text-gray-500"}`}>
                <Clock className="w-3 h-3" />{daysInStage}d
              </span>
            )}
            {lead.estimated_value > 0 && (
              <span className="text-[11px] font-black text-white bg-emerald-600 px-1.5 py-0.5 rounded shadow-sm">
                R$ {(lead.estimated_value || 0).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
