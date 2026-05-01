import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MapPin, Building2, AlertTriangle, Shield } from "lucide-react";

const statusLabels = {
  new: "Novo", contacted: "Contato", qualified: "Qualificado",
  proposal: "Proposta", negotiation: "Negociação", won: "Ganho", lost: "Perdido",
};
const tempLabels = { cold: "🔵 Frio", warm: "🟡 Morno", hot: "🔴 Quente" };
const urgencyLabels = { low: "Baixa", medium: "Média", high: "Alta" };
const propertyLabels = { residential: "Residencial", commercial: "Comercial", industrial: "Industrial", condominium: "Condomínio", rural: "Rural" };
const businessLabels = { monitoring_comodato: "Monitoramento + Comodato", equipment_sale: "Venda Equipamento", monitoring_only: "Só Monitoramento", project: "Projeto" };

export default function LeadInfo({ lead, onStatusChange, onTempChange }) {
  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Informações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400">Status</p>
            <Select value={lead.status || "new"} onValueChange={onStatusChange}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400">Temperatura</p>
            <Select value={lead.temperature || "cold"} onValueChange={onTempChange}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(tempLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{lead.email}</span>
            </div>
          )}
          {lead.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{lead.address}{lead.neighborhood ? `, ${lead.neighborhood}` : ""}</span>
            </div>
          )}
          {lead.company && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{lead.company}</span>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Tipo Negócio</span>
            <span className="font-medium text-gray-700">{businessLabels[lead.business_type] || "—"}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Tipo Imóvel</span>
            <span className="font-medium text-gray-700">{propertyLabels[lead.property_type] || "—"}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Urgência</span>
            <span className="font-medium text-gray-700">{urgencyLabels[lead.urgency] || "—"}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Valor Estimado</span>
            <span className="font-semibold text-gray-900">{lead.estimated_value ? `R$ ${lead.estimated_value.toLocaleString("pt-BR")}` : "—"}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Valor Mensal</span>
            <span className="font-semibold text-gray-900">{lead.monthly_value ? `R$ ${lead.monthly_value.toLocaleString("pt-BR")}` : "—"}</span>
          </div>
        </div>

        {(lead.has_current_system || lead.had_invasion_attempt) && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            {lead.has_current_system && (
              <div className="flex items-center gap-2 text-xs">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-gray-600">Sistema atual: {lead.current_competitor || "Sim"}</span>
              </div>
            )}
            {lead.had_invasion_attempt && (
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-gray-600">Sofreu tentativa de invasão</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}