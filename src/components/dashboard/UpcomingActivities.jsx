import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, Mail, MapPin, Users, FileText, StickyNote, Clock } from "lucide-react";
import moment from "moment";

const TYPE_ICON = {
  call: Phone, whatsapp: MessageCircle, email: Mail, visit: MapPin,
  meeting: Users, proposal: FileText, technical_visit: MapPin,
  note: StickyNote, follow_up: Clock,
};
const TYPE_LABEL = {
  call: "Ligação", whatsapp: "WhatsApp", email: "E-mail", visit: "Visita",
  meeting: "Reunião", proposal: "Proposta", technical_visit: "Visita Técnica",
  note: "Nota", follow_up: "Follow-up",
};

export default function UpcomingActivities({ activities }) {
  const upcoming = activities
    .filter((a) => !a.completed && a.scheduled_date)
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
    .slice(0, 6);

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-3">
        <CardTitle className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
          <Clock className="w-4 h-4 text-orange-500" />
          Próximas Atividades
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhuma atividade agendada</p>
        ) : (
          <div className="space-y-1">
            {upcoming.map((act) => {
              const Icon = TYPE_ICON[act.type] || Clock;
              const isOverdue = moment(act.scheduled_date).isBefore(moment());
              const daysLate = isOverdue ? moment().diff(moment(act.scheduled_date), "days") : 0;
              const borderColor = isOverdue
                ? daysLate >= 3 ? "border-l-red-500" : "border-l-orange-400"
                : "border-l-blue-400";
              const bgColor = isOverdue
                ? daysLate >= 3 ? "bg-red-50/50" : "bg-orange-50/40"
                : "bg-blue-50/30";

              return (
                <div
                  key={act.id}
                  className={`flex items-center gap-3 py-2.5 px-3 border-l-4 ${borderColor} ${bgColor} rounded-r-lg`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-100" : "bg-blue-100"}`}>
                    <Icon className={`w-3.5 h-3.5 ${isOverdue ? "text-red-600" : "text-blue-600"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-gray-900 truncate">{act.title}</p>
                    <p className={`text-xs font-bold ${isOverdue ? "text-red-600" : "text-gray-400"}`}>
                      {isOverdue
                        ? `Atrasada ${daysLate > 0 ? `${daysLate}d` : "hoje"}`
                        : moment(act.scheduled_date).calendar()}
                    </p>
                  </div>
                  <Badge
                    className={`text-[9px] font-bold border-0 shrink-0 ${isOverdue ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700"}`}
                  >
                    {TYPE_LABEL[act.type] || act.type}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
