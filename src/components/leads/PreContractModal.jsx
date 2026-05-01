import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, CheckCircle, Trophy } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

const businessToContract = {
  monitoring_comodato: "monitoring_comodato",
  equipment_sale: "equipment_sale",
  monitoring_only: "monitoring_only",
  project: "project",
};

export default function PreContractModal({ lead, onClose, onSuccess }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_name: lead.company || lead.name || "",
    contract_type: businessToContract[lead.business_type] || "monitoring_comodato",
    monthly_value: lead.monthly_value || "",
    installation_fee: "",
    total_value: lead.estimated_value || "",
    payment_method: "boleto",
    start_date: moment().format("YYYY-MM-DD"),
    end_date: moment().add(12, "months").format("YYYY-MM-DD"),
    duration_months: 12,
    sla_hours: 4,
    notes: lead.notes || "",
    lead_id: lead.id,
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.client_name.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const monthlyValue    = parseFloat(form.monthly_value)    || 0;
      const installationFee = parseFloat(form.installation_fee) || 0;
      const durationMonths  = parseInt(form.duration_months)    || 12;
      const startDate       = moment(form.start_date);

      await base44.entities.Contract.create({
        ...form,
        monthly_value:    monthlyValue,
        installation_fee: installationFee,
        total_value:      parseFloat(form.total_value) || 0,
        duration_months:  durationMonths,
        sla_hours:        parseInt(form.sla_hours) || 4,
        status: "active",
      });

      // Gera cobranças automáticas no Financeiro (em lotes de 3 para não sobrecarregar)
      const payloads = [];

      // 1. Taxa de instalação (cobrança única)
      if (installationFee > 0) {
        payloads.push({
          client_name:    form.client_name,
          description:    `Taxa de instalação — ${form.client_name}`,
          amount:         installationFee,
          due_date:       form.start_date,
          status:         "pending",
          payment_method: form.payment_method,
          type:           "installation",
          notes:          `Gerado automaticamente ao fechar contrato.`,
        });
      }

      // 2. Mensalidades mensais (uma por mês, para toda a duração)
      if (monthlyValue > 0) {
        for (let m = 0; m < durationMonths; m++) {
          const vencimento = startDate.clone().add(m, "months").format("YYYY-MM-DD");
          payloads.push({
            client_name:    form.client_name,
            description:    `Mensalidade ${m + 1}/${durationMonths} — ${form.client_name}`,
            amount:         monthlyValue,
            due_date:       vencimento,
            status:         "pending",
            payment_method: form.payment_method,
            type:           "monthly",
            notes:          `Gerado automaticamente ao fechar contrato.`,
          });
        }
      }

      // Envia em lotes de 3 para não sobrecarregar a API
      const LOTE = 3;
      for (let i = 0; i < payloads.length; i += LOTE) {
        await Promise.all(
          payloads.slice(i, i + LOTE).map((p) => base44.entities.Financial.create(p))
        );
      }

      const totalCobranças = payloads.length;
      toast.success(
        `Pré-contrato criado! ${totalCobranças} cobrança${totalCobranças !== 1 ? "s" : ""} gerada${totalCobranças !== 1 ? "s" : ""} no Financeiro.`
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error("Erro ao criar contrato. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[88vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-3 pb-1">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Negócio Ganho! Criar Pré-Contrato
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Dados pré-preenchidos do lead <strong className="text-gray-700">{lead.name}</strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Banner verde */}
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-800 font-medium">
            Lead marcado como ganho. Complete os dados para gerar o pré-contrato.
          </p>
        </div>

        <div className="space-y-3 mt-1">
          {/* Cliente */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600">Cliente / Empresa *</Label>
            <Input
              value={form.client_name}
              onChange={(e) => set("client_name", e.target.value)}
              placeholder="Nome do cliente ou empresa"
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tipo de Contrato */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600">Tipo de Contrato</Label>
              <Select value={form.contract_type} onValueChange={(v) => set("contract_type", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monitoring_comodato">Monitoramento + Comodato</SelectItem>
                  <SelectItem value="equipment_sale">Venda de Equipamento</SelectItem>
                  <SelectItem value="monitoring_only">Só Monitoramento</SelectItem>
                  <SelectItem value="project">Projeto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pagamento */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600">Forma de Pagamento</Label>
              <Select value={form.payment_method} onValueChange={(v) => set("payment_method", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="bank_transfer">Transferência</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valor Mensal */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600">Valor Mensal (R$)</Label>
              <Input
                type="number"
                value={form.monthly_value}
                onChange={(e) => set("monthly_value", e.target.value)}
                placeholder="0,00"
                className="h-9"
              />
            </div>

            {/* Taxa Instalação */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600">Taxa de Instalação (R$)</Label>
              <Input
                type="number"
                value={form.installation_fee}
                onChange={(e) => set("installation_fee", e.target.value)}
                placeholder="0,00"
                className="h-9"
              />
            </div>

            {/* Valor Total */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600">Valor Total (R$)</Label>
              <Input
                type="number"
                value={form.total_value}
                onChange={(e) => set("total_value", e.target.value)}
                placeholder="0,00"
                className="h-9"
              />
            </div>

            {/* Duração */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600">Duração (meses)</Label>
              <Input
                type="number"
                value={form.duration_months}
                onChange={(e) => set("duration_months", e.target.value)}
                className="h-9"
              />
            </div>

            {/* Início */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600">Início do Contrato</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                className="h-9"
              />
            </div>

            {/* Fim */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-600">Fim do Contrato</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600">Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              className="text-sm resize-none"
              placeholder="Notas adicionais sobre o contrato..."
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Agora Não
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSave}
            disabled={saving}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            {saving ? "Criando..." : "Criar Pré-Contrato"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
