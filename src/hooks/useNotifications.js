/**
 * useNotifications — calcula alertas e ações urgentes em tempo real.
 * Categorias:
 *  - overdue_payment   : cobranças com due_date < hoje e status != "paid"
 *  - late_activity     : atividades não concluídas com scheduled_date < agora
 *  - lead_no_contact   : leads "new" criados há mais de 3 dias sem atividade
 *  - contract_expiring : contratos ativos com end_date ≤ 30 dias
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import moment from "moment";

export function useNotifications() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const { data: leads = [] } = useQuery({
    queryKey: ["leads", orgId],
    queryFn: () => base44.entities.Lead.filter({ organization_id: orgId }, "-created_date", 500),
    enabled: !!orgId,
  });
  const { data: activities = [] } = useQuery({
    queryKey: ["activities", orgId],
    queryFn: () => base44.entities.Activity.filter({ organization_id: orgId }, "-scheduled_date", 500),
    enabled: !!orgId,
  });
  const { data: financials = [] } = useQuery({
    queryKey: ["financials", orgId],
    queryFn: () => base44.entities.Financial.filter({ organization_id: orgId }, "-due_date", 500),
    enabled: !!orgId,
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", orgId],
    queryFn: () => base44.entities.Contract.filter({ organization_id: orgId }, "-created_date", 500),
    enabled: !!orgId,
  });

  const notifications = useMemo(() => {
    const items = [];
    const now = moment();

    // 1. Cobranças atrasadas
    financials
      .filter(f => f.status !== "paid" && f.status !== "cancelled" && f.due_date && moment(f.due_date).isBefore(now, "day"))
      .forEach(f => items.push({
        id: `fin-${f.id}`,
        type: "overdue_payment",
        priority: "high",
        title: `Cobrança atrasada — ${f.client_name}`,
        description: `R$ ${(f.amount || 0).toLocaleString("pt-BR")} · venceu ${moment(f.due_date).fromNow()}`,
        daysLate: now.diff(moment(f.due_date), "days"),
        link: "/Financial",
      }));

    // 2. Atividades atrasadas (não concluídas, data passou)
    activities
      .filter(a => !a.completed && a.scheduled_date && moment(a.scheduled_date).isBefore(now))
      .slice(0, 10)
      .forEach(a => items.push({
        id: `act-${a.id}`,
        type: "late_activity",
        priority: "medium",
        title: `Atividade atrasada — ${a.title}`,
        description: `Agendada para ${moment(a.scheduled_date).calendar()}`,
        daysLate: now.diff(moment(a.scheduled_date), "days"),
        link: "/Leads",
      }));

    // 3. Leads novos sem contato há 3+ dias
    const leadsWithActivity = new Set(activities.map(a => a.lead_id));
    leads
      .filter(l => l.status === "new" && l.created_date && moment(l.created_date).isBefore(now.clone().subtract(3, "days")))
      .filter(l => !leadsWithActivity.has(l.id))
      .slice(0, 8)
      .forEach(l => items.push({
        id: `lead-${l.id}`,
        type: "lead_no_contact",
        priority: "medium",
        title: `Lead sem contato — ${l.name}`,
        description: `Cadastrado ${moment(l.created_date).fromNow()} · ${l.company || l.city || "—"}`,
        daysWaiting: now.diff(moment(l.created_date), "days"),
        link: `/LeadDetail?id=${l.id}`,
      }));

    // 4. Contratos vencendo em 30 dias
    contracts
      .filter(c => c.status === "active" && c.end_date && moment(c.end_date).isBetween(now, now.clone().add(30, "days"), "day", "[]"))
      .forEach(c => {
        const daysLeft = moment(c.end_date).diff(now, "days");
        items.push({
          id: `contr-${c.id}`,
          type: "contract_expiring",
          priority: daysLeft <= 7 ? "high" : "low",
          title: `Contrato vencendo — ${c.client_name}`,
          description: `Vence em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""} · ${moment(c.end_date).format("DD/MM/YYYY")}`,
          daysLeft,
          link: "/Contracts",
        });
      });

    // Ordena: high → medium → low, depois por relevância
    const order = { high: 0, medium: 1, low: 2 };
    return items.sort((a, b) => order[a.priority] - order[b.priority]);
  }, [leads, activities, financials, contracts]);

  return {
    notifications,
    count: notifications.length,
    highPriority: notifications.filter(n => n.priority === "high").length,
  };
}
