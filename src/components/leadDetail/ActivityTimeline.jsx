import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, MessageCircle, Mail, MapPin, Users, FileText, StickyNote, Clock, Check } from "lucide-react";
import moment from "moment";

const typeIcons = {
  call: Phone, whatsapp: MessageCircle, email: Mail, visit: MapPin,
  meeting: Users, proposal: FileText, technical_visit: MapPin, note: StickyNote, follow_up: Clock,
};
const typeLabels = {
  call: "Ligação", whatsapp: "WhatsApp", email: "E-mail", visit: "Visita",
  meeting: "Reunião", proposal: "Proposta", technical_visit: "Visita Técnica", note: "Nota", follow_up: "Follow-up",
};

export default function ActivityTimeline({ activities, leadId, onCreate, onToggle }) {
  const [showNew, setShowNew] = useState(false);
  const [newActivity, setNewActivity] = useState({ type: "call", title: "", description: "", scheduled_date: "" });

  const handleCreate = async () => {
    await onCreate({ ...newActivity, lead_id: leadId });
    setNewActivity({ type: "call", title: "", description: "", scheduled_date: "" });
    setShowNew(false);
  };

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Atividades</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setShowNew(!showNew)} className="gap-1 text-xs">
          <Plus className="w-3.5 h-3.5" /> Nova
        </Button>
      </CardHeader>
      <CardContent>
        {showNew && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={newActivity.type} onValueChange={(v) => setNewActivity({ ...newActivity, type: v })}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="datetime-local" value={newActivity.scheduled_date} onChange={(e) => setNewActivity({ ...newActivity, scheduled_date: e.target.value })} className="text-xs" />
            </div>
            <Input value={newActivity.title} onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })} placeholder="Título da atividade" className="text-sm" />
            <Textarea value={newActivity.description} onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })} placeholder="Descrição..." rows={2} className="text-sm" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={!newActivity.title} className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {activities.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Nenhuma atividade registrada</p>}
          {activities.map((act) => {
            const Icon = typeIcons[act.type] || Clock;
            const isOverdue = !act.completed && act.scheduled_date && moment(act.scheduled_date).isBefore(moment());
            return (
              <div key={act.id} className={`flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${act.completed ? "opacity-60" : ""}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? "bg-red-50" : act.completed ? "bg-emerald-50" : "bg-blue-50"}`}>
                  {act.completed ? <Check className="w-4 h-4 text-emerald-500" /> : <Icon className={`w-4 h-4 ${isOverdue ? "text-red-500" : "text-blue-500"}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${act.completed ? "line-through text-gray-400" : "text-gray-900"}`}>{act.title}</p>
                    <Badge variant="secondary" className="text-[9px] shrink-0">{typeLabels[act.type]}</Badge>
                  </div>
                  {act.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{act.description}</p>}
                  {act.scheduled_date && (
                    <p className={`text-xs mt-1 ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                      {moment(act.scheduled_date).format("DD/MM/YYYY HH:mm")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onToggle(act.id, !act.completed)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${act.completed ? "bg-emerald-500 border-emerald-500" : "border-gray-300 hover:border-blue-400"}`}
                >
                  {act.completed && <Check className="w-3 h-3 text-white" />}
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}