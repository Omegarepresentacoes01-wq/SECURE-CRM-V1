import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import moment from "moment";

const TEMP = {
  cold: { border: "border-l-blue-500",  badge: "bg-blue-50 text-blue-700",   dot: "bg-blue-500",  label: "Frio" },
  warm: { border: "border-l-amber-500", badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500", label: "Morno" },
  hot:  { border: "border-l-red-500",   badge: "bg-red-50 text-red-700",     dot: "bg-red-500",   label: "Quente" },
};

export default function RecentLeads({ leads }) {
  const recent = [...leads]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 6);

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-3">
        <CardTitle className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
          <Users className="w-4 h-4 text-blue-500" />
          Leads Recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhum lead cadastrado</p>
        ) : (
          <div className="space-y-1">
            {recent.map((lead) => {
              const t = TEMP[lead.temperature] || TEMP.cold;
              return (
                <div
                  key={lead.id}
                  className={`flex items-center justify-between py-2.5 px-3 border-l-4 ${t.border} bg-gray-50/50 rounded-r-lg hover:bg-gray-100/60 transition-colors`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{lead.name}</p>
                    <p className="text-xs text-gray-400 font-medium">
                      {lead.company || lead.city || "—"} · {moment(lead.created_date).fromNow()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {lead.estimated_value > 0 && (
                      <span className="text-xs font-black text-emerald-700">
                        R$ {(lead.estimated_value || 0).toLocaleString("pt-BR")}
                      </span>
                    )}
                    <Badge className={`text-[9px] font-bold border-0 ${t.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${t.dot} mr-1 inline-block`} />
                      {t.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
