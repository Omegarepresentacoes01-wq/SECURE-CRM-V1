import React, { useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import StatsCard from "@/components/dashboard/StatsCard";
import {
  DollarSign, Target, Activity, CreditCard, Clock,
  AlertTriangle, CheckCircle, XCircle, AlertCircle,
  TrendingUp, Zap, BarChart2, ArrowRight, ShoppingCart, Filter, Download,
} from "lucide-react";
import moment from "moment";
import { jsPDF } from "jspdf";

// ── Constants ────────────────────────────────────────────────────────
const STAGE_LABELS = {
  new: "Lead Recebido", contacted: "Contato Realizado",
  qualified: "Qualificado", proposal: "Proposta Enviada",
  negotiation: "Negociação", won: "Fechado", lost: "Perdido",
};
const ORIGIN_LABELS = {
  facebook: "Facebook", instagram: "Instagram", google: "Google",
  whatsapp: "WhatsApp", referral: "Indicação", website: "Site",
  cold_call: "Ligação Fria", other: "Outro",
};
const STAGE_ORDER = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];
const STAGE_COLORS = {
  new: "#64748b", contacted: "#8b5cf6", qualified: "#f59e0b",
  proposal: "#06b6d4", negotiation: "#f97316", won: "#10b981", lost: "#ef4444",
};

const fmtBRL = (v) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;

// ── Custom recharts tooltip ───────────────────────────────────────────
const BRLTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[hsl(222_45%_16%)] border-2 border-gray-200 dark:border-gray-600 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-black text-gray-900 dark:text-gray-100 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === "number" && p.value > 100
            ? fmtBRL(p.value)
            : `${p.value}${p.name?.includes("Taxa") ? "%" : ""}`}
        </p>
      ))}
    </div>
  );
};

// ── Bottleneck Card ───────────────────────────────────────────────────
const SEV = {
  critical: { bg: "bg-red-50 dark:bg-red-900/30",    border: "border-red-400 dark:border-red-500",    icon: XCircle,       iconColor: "text-red-500",    badge: "bg-red-500 text-white",    label: "Crítico" },
  warning:  { bg: "bg-amber-50 dark:bg-amber-900/30", border: "border-amber-400 dark:border-amber-500", icon: AlertTriangle,  iconColor: "text-amber-500",  badge: "bg-amber-500 text-white",  label: "Atenção" },
  info:     { bg: "bg-blue-50 dark:bg-blue-900/30",   border: "border-blue-400 dark:border-blue-500",   icon: AlertCircle,   iconColor: "text-blue-500",   badge: "bg-blue-500 text-white",   label: "Info" },
  success:  { bg: "bg-emerald-50 dark:bg-emerald-900/30", border: "border-emerald-400 dark:border-emerald-500", icon: CheckCircle, iconColor: "text-emerald-500", badge: "bg-emerald-500 text-white", label: "Saudável" },
};

function BottleneckCard({ type, title, description, metric, action }) {
  const s = SEV[type] || SEV.info;
  const Icon = s.icon;
  return (
    <div className={`rounded-xl border-2 ${s.border} ${s.bg} p-4 flex gap-3`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${s.iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-gray-900 dark:text-gray-100">{title}</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
          {metric && (
            <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-white/10 px-1.5 py-0.5 rounded">
              {metric}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 font-bold">{description}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
          <ArrowRight className="w-3 h-3 shrink-0" />{action}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function Reports() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const { data: leads = [] } = useQuery({
    queryKey: ["leads", orgId],
    queryFn: () => base44.entities.Lead.filter({ organization_id: orgId }, "-created_date", 1000),
    enabled: !!orgId,
  });
  const { data: activities = [] } = useQuery({
    queryKey: ["activities", orgId],
    queryFn: () => base44.entities.Activity.filter({ organization_id: orgId }, "-scheduled_date", 1000),
    enabled: !!orgId,
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", orgId],
    queryFn: () => base44.entities.Contract.filter({ organization_id: orgId }, "-start_date", 500),
    enabled: !!orgId,
  });
  const { data: financials = [] } = useQuery({
    queryKey: ["financials", orgId],
    queryFn: () => base44.entities.Financial.filter({ organization_id: orgId }, "-due_date", 1000),
    enabled: !!orgId,
  });

  // ── Core Metrics ───────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const activeContracts = contracts.filter((c) => c.status === "active");
    const mrr = activeContracts.reduce((s, c) => s + (c.monthly_value || 0), 0);

    const wonLeads = leads.filter((l) => l.status === "won");
    const lostLeads = leads.filter((l) => l.status === "lost");
    const activeLeads = leads.filter((l) => !["won", "lost"].includes(l.status));
    const conversionRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;

    const today = moment();
    const overdueFinancials = financials.filter(
      (f) => f.status !== "paid" && f.status !== "cancelled" && moment(f.due_date).isBefore(today, "day")
    );
    const overdueAmount = overdueFinancials.reduce((s, f) => s + (f.amount || 0), 0);

    const thisMonth = today.format("YYYY-MM");
    const thisMonthFin = financials.filter((f) => moment(f.due_date).format("YYYY-MM") === thisMonth);
    const receivedThisMonth = thisMonthFin.filter((f) => f.status === "paid").reduce((s, f) => s + (f.amount || 0), 0);
    const billedThisMonth = thisMonthFin.reduce((s, f) => s + (f.amount || 0), 0);
    const collectionRate = billedThisMonth > 0 ? (receivedThisMonth / billedThisMonth) * 100 : 0;

    const avgTicket = wonLeads.length > 0
      ? wonLeads.reduce((s, l) => s + (l.estimated_value || 0), 0) / wonLeads.length
      : 0;

    const pipelineValue = activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);

    const overdueActivities = activities.filter(
      (a) => a.status !== "done" && a.status !== "completed" && moment(a.scheduled_date).isBefore(today, "day")
    );

    return {
      mrr, activeContracts: activeContracts.length, conversionRate,
      overdueAmount, overdueFinancials: overdueFinancials.length,
      collectionRate, receivedThisMonth, billedThisMonth,
      pipelineValue, avgTicket, wonLeads: wonLeads.length,
      lostLeads: lostLeads.length, activeLeads: activeLeads.length,
      overdueActivities: overdueActivities.length,
      totalLeads: leads.length,
    };
  }, [leads, activities, contracts, financials]);

  // ── Health Score ───────────────────────────────────────────────────
  const healthScore = useMemo(() => {
    let score = 100;
    if (metrics.conversionRate < 10) score -= 25;
    else if (metrics.conversionRate < 20) score -= 12;
    const overdueRate = metrics.billedThisMonth > 0
      ? (metrics.overdueAmount / metrics.billedThisMonth) * 100 : 0;
    if (overdueRate > 20) score -= 25;
    else if (overdueRate > 10) score -= 12;
    if (metrics.overdueActivities > 10) score -= 15;
    else if (metrics.overdueActivities > 5) score -= 8;
    if (metrics.collectionRate < 70) score -= 15;
    else if (metrics.collectionRate < 85) score -= 8;
    return Math.max(0, Math.min(100, score));
  }, [metrics]);

  const scoreLabel = healthScore >= 80 ? "Saudável" : healthScore >= 60 ? "Atenção" : "Crítico";
  const scoreBg = healthScore >= 80 ? "from-emerald-500 to-emerald-600" : healthScore >= 60 ? "from-amber-400 to-amber-600" : "from-red-500 to-red-600";

  // ── Bottleneck Analysis ────────────────────────────────────────────
  const bottlenecks = useMemo(() => {
    const results = [];
    const today = moment();

    // Leads stuck > 7 days
    const stuckLeads = leads.filter((l) => {
      if (["won", "lost"].includes(l.status)) return false;
      return today.diff(moment(l.updated_date || l.created_date), "days") > 7;
    });
    if (stuckLeads.length >= 3)
      results.push({
        type: stuckLeads.length >= 8 ? "critical" : "warning",
        title: "Leads Parados no Funil",
        description: `${stuckLeads.length} leads sem progressão há mais de 7 dias`,
        metric: `${stuckLeads.length} leads`,
        action: "Faça follow-up imediato e revise o processo de avanço de etapas",
      });

    // Conversion rate
    if (metrics.totalLeads >= 5) {
      if (metrics.conversionRate < 10)
        results.push({ type: "critical", title: "Taxa de Conversão Crítica", description: `Apenas ${fmtPct(metrics.conversionRate)} dos leads estão a ser convertidos — muito abaixo do mercado`, metric: fmtPct(metrics.conversionRate), action: "Revise o processo de qualificação e o discurso de vendas" });
      else if (metrics.conversionRate < 20)
        results.push({ type: "warning", title: "Conversão Abaixo do Ideal", description: `Conversão de ${fmtPct(metrics.conversionRate)} está abaixo dos 20% recomendados`, metric: fmtPct(metrics.conversionRate), action: "Identifique em qual etapa os leads estão a ser perdidos" });
    }

    // Overdue payments
    const overdueRate = metrics.billedThisMonth > 0
      ? (metrics.overdueAmount / metrics.billedThisMonth) * 100 : 0;
    if (overdueRate > 20)
      results.push({ type: "critical", title: "Alta Inadimplência", description: `${fmtPct(overdueRate)} do valor faturado está vencido e sem pagamento`, metric: fmtBRL(metrics.overdueAmount), action: "Active o departamento de cobrança e reveja as condições de pagamento" });
    else if (overdueRate > 10)
      results.push({ type: "warning", title: "Inadimplência Moderada", description: `${fmtPct(overdueRate)} dos recebíveis estão em atraso este mês`, metric: fmtBRL(metrics.overdueAmount), action: "Envie lembretes e ofereça opções de renegociação" });

    // Collection rate
    if (metrics.collectionRate < 70 && metrics.billedThisMonth > 0)
      results.push({ type: "critical", title: "Taxa de Recebimento Baixa", description: `Apenas ${fmtPct(metrics.collectionRate)} do faturado deste mês foi efectivamente recebido`, metric: fmtPct(metrics.collectionRate), action: "Priorize a cobrança activa dos clientes pendentes" });

    // Overdue activities
    if (metrics.overdueActivities >= 5)
      results.push({ type: metrics.overdueActivities >= 10 ? "critical" : "warning", title: "Atividades Comerciais em Atraso", description: `${metrics.overdueActivities} actividades programadas não foram realizadas`, metric: `${metrics.overdueActivities} atividades`, action: "Revise a agenda da equipa comercial" });

    // Leads with no activity at all
    const leadIdsWithActivity = new Set(activities.map((a) => a.lead_id));
    const leadsNoContact = leads.filter(
      (l) => !["won", "lost"].includes(l.status) && !leadIdsWithActivity.has(l.id)
    );
    if (leadsNoContact.length >= 2)
      results.push({ type: "warning", title: "Leads Sem Nenhum Contato", description: `${leadsNoContact.length} leads activos nunca receberam uma actividade`, metric: `${leadsNoContact.length} leads`, action: "Agende actividades de primeiro contato para estes leads" });

    // Channel with high volume but low conversion
    const originStats = {};
    leads.forEach((l) => {
      const o = l.origin || "other";
      if (!originStats[o]) originStats[o] = { total: 0, won: 0 };
      originStats[o].total++;
      if (l.status === "won") originStats[o].won++;
    });
    Object.entries(originStats).forEach(([origin, stats]) => {
      if (stats.total >= 5 && stats.won / stats.total < 0.08)
        results.push({ type: "info", title: `Canal Ineficiente: ${ORIGIN_LABELS[origin] || origin}`, description: `${stats.total} leads captados com apenas ${Math.round((stats.won / stats.total) * 100)}% de conversão`, metric: `${Math.round((stats.won / stats.total) * 100)}% conv.`, action: "Revise a estratégia e o público-alvo deste canal" });
    });

    if (results.length === 0)
      results.push({ type: "success", title: "Empresa em Boa Saúde!", description: "Nenhum gargalo crítico identificado. Continue a monitorar os indicadores.", metric: "100%", action: "Mantenha o ritmo e explore oportunidades de crescimento" });

    // Sort by severity
    const order = { critical: 0, warning: 1, info: 2, success: 3 };
    return results.sort((a, b) => (order[a.type] ?? 4) - (order[b.type] ?? 4));
  }, [leads, activities, metrics]);

  // ── Funnel Data ────────────────────────────────────────────────────
  const funnelData = useMemo(() =>
    STAGE_ORDER.map((stage) => ({
      stage: STAGE_LABELS[stage],
      id: stage,
      count: leads.filter((l) => l.status === stage).length,
      value: leads.filter((l) => l.status === stage).reduce((s, l) => s + (l.estimated_value || 0), 0),
      color: STAGE_COLORS[stage],
    })), [leads]);

  // ── 6-Month Revenue Chart ─────────────────────────────────────────
  const revenueData = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const date = moment().subtract(5 - i, "months");
      const key = date.format("YYYY-MM");
      const label = date.format("MMM/YY");
      const month = financials.filter((f) => moment(f.due_date).format("YYYY-MM") === key);
      return {
        month: label,
        Previsto: month.reduce((s, f) => s + (f.amount || 0), 0),
        Recebido: month.filter((f) => f.status === "paid").reduce((s, f) => s + (f.amount || 0), 0),
        Vencido: month.filter((f) => f.status !== "paid" && f.status !== "cancelled" && moment(f.due_date).isBefore(moment())).reduce((s, f) => s + (f.amount || 0), 0),
      };
    }), [financials]);

  // ── Origin Performance ────────────────────────────────────────────
  const originData = useMemo(() => {
    const stats = {};
    leads.forEach((l) => {
      const o = l.origin || "other";
      if (!stats[o]) stats[o] = { total: 0, won: 0, value: 0 };
      stats[o].total++;
      if (l.status === "won") { stats[o].won++; stats[o].value += l.estimated_value || 0; }
    });
    return Object.entries(stats)
      .filter(([, s]) => s.total > 0)
      .map(([o, s]) => ({
        name: ORIGIN_LABELS[o] || o,
        Leads: s.total,
        Convertidos: s.won,
        "Taxa (%)": s.total > 0 ? Math.round((s.won / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.Leads - a.Leads)
      .slice(0, 7);
  }, [leads]);

  // ── Funnel drop-off arrows ─────────────────────────────────────────
  const funnelWithDropOff = useMemo(() =>
    funnelData.map((item, i) => ({
      ...item,
      dropOff: i > 0 && funnelData[i - 1].count > 0
        ? Math.round((1 - item.count / funnelData[i - 1].count) * 100)
        : null,
    })), [funnelData]);

  // ── PDF Export ─────────────────────────────────────────────────────
  const exportPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const margin = 14;
    const colW = (W - margin * 2) / 2;
    let y = 0;

    // helpers
    const addPage = () => { doc.addPage(); y = 0; };
    const checkY = (need = 20) => { if (y + need > 275) addPage(); };

    const rect = (x, ry, w, h, r, g, b) => {
      doc.setFillColor(r, g, b);
      doc.rect(x, ry, w, h, "F");
    };
    const txt = (text, x, ty, size, bold, color) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...color);
      doc.text(String(text), x, ty);
    };
    const line = (x1, ly, x2) => {
      doc.setDrawColor(220, 220, 230);
      doc.setLineWidth(0.3);
      doc.line(x1, ly, x2, ly);
    };

    // ── HEADER ──────────────────────────────────────────────────────
    rect(0, 0, W, 32, 8, 145, 178);
    txt("Relatório Inteligente CRM", margin, 12, 18, true, [255, 255, 255]);
    txt(`Gerado em: ${moment().format("DD/MM/YYYY [às] HH:mm")}`, margin, 20, 9, false, [200, 240, 255]);

    // Health score badge
    const scoreC = healthScore >= 80 ? [16, 185, 129] : healthScore >= 60 ? [245, 158, 11] : [239, 68, 68];
    rect(W - 50, 4, 36, 24, ...scoreC);
    txt("SAÚDE GERAL", W - 49, 11, 7, true, [255, 255, 255]);
    txt(`${healthScore}/100`, W - 49, 18, 14, true, [255, 255, 255]);
    txt(scoreLabel.toUpperCase(), W - 49, 23, 7, true, [255, 255, 255]);

    y = 38;

    // ── KPIs ────────────────────────────────────────────────────────
    txt("INDICADORES-CHAVE", margin, y, 9, true, [8, 145, 178]);
    y += 2;
    line(margin, y, W - margin);
    y += 5;

    const kpis = [
      ["MRR (Receita Recorrente)", fmtBRL(metrics.mrr), `${metrics.activeContracts} contratos activos`],
      ["Pipeline Total", fmtBRL(metrics.pipelineValue), `${metrics.activeLeads} leads activos`],
      ["Taxa de Conversão", fmtPct(metrics.conversionRate), `${metrics.wonLeads} fechados de ${metrics.totalLeads}`],
      ["Ticket Médio", fmtBRL(metrics.avgTicket), "Valor médio dos fechamentos"],
      ["Recebido (Mês Actual)", fmtBRL(metrics.receivedThisMonth), `Taxa ${fmtPct(metrics.collectionRate)} de coleta`],
      ["Em Atraso", fmtBRL(metrics.overdueAmount), `${metrics.overdueFinancials} cobranças vencidas`],
      ["Atividades Atrasadas", String(metrics.overdueActivities), "Actividades não realizadas"],
      ["Leads Perdidos", String(metrics.lostLeads), `${metrics.totalLeads > 0 ? Math.round(metrics.lostLeads / metrics.totalLeads * 100) : 0}% do total`],
    ];

    kpis.forEach(([label, value, sub], i) => {
      const col = i % 2;
      const bx = margin + col * (colW + 2);
      const by = y + Math.floor(i / 2) * 18;
      rect(bx, by, colW, 16, 248, 250, 252);
      doc.setDrawColor(220, 226, 235);
      doc.setLineWidth(0.4);
      doc.rect(bx, by, colW, 16);
      txt(label, bx + 3, by + 5.5, 7.5, false, [100, 116, 139]);
      txt(value, bx + 3, by + 10.5, 10, true, [15, 23, 42]);
      txt(sub, bx + 3, by + 14.5, 6.5, false, [148, 163, 184]);
    });

    y += Math.ceil(kpis.length / 2) * 18 + 6;

    // ── BOTTLENECKS ──────────────────────────────────────────────────
    checkY(30);
    txt("GARGALOS IDENTIFICADOS", margin, y, 9, true, [8, 145, 178]);
    y += 2;
    line(margin, y, W - margin);
    y += 5;

    const sevColors = { critical: [239, 68, 68], warning: [245, 158, 11], info: [59, 130, 246], success: [16, 185, 129] };
    const sevLabel = { critical: "CRÍTICO", warning: "ATENÇÃO", info: "INFO", success: "SAUDÁVEL" };

    bottlenecks.forEach((b) => {
      checkY(18);
      const sc = sevColors[b.type] || [100, 116, 139];
      rect(margin, y, 3, 14, ...sc);
      rect(margin + 3, y, W - margin * 2 - 3, 14, 250, 250, 252);

      const badgeLabel = sevLabel[b.type] || b.type.toUpperCase();
      txt(badgeLabel, margin + 6, y + 5, 7, true, sc);
      txt(b.title, margin + 28, y + 5, 8, true, [15, 23, 42]);
      if (b.metric) {
        rect(W - margin - 28, y + 1, 26, 8, ...sc);
        txt(b.metric, W - margin - 27, y + 6.5, 7, true, [255, 255, 255]);
      }
      txt(b.description, margin + 6, y + 10, 7, false, [71, 85, 105]);
      y += 16;
    });

    y += 4;

    // ── SALES FUNNEL ─────────────────────────────────────────────────
    checkY(50);
    txt("FUNIL DE VENDAS", margin, y, 9, true, [8, 145, 178]);
    y += 2;
    line(margin, y, W - margin);
    y += 5;

    // Table header
    const fCols = [margin, margin + 55, margin + 90, margin + 125, margin + 155];
    rect(margin, y, W - margin * 2, 8, 241, 245, 249);
    txt("Etapa", fCols[0] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
    txt("Leads", fCols[1] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
    txt("Valor", fCols[2] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
    txt("Drop-off", fCols[3] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
    y += 9;

    funnelWithDropOff.forEach((item, idx) => {
      checkY(9);
      if (idx % 2 === 0) rect(margin, y, W - margin * 2, 8, 248, 250, 252);
      txt(item.stage, fCols[0] + 2, y + 5.5, 7.5, false, [30, 41, 59]);
      txt(String(item.count), fCols[1] + 2, y + 5.5, 7.5, true, [30, 41, 59]);
      txt(fmtBRL(item.value), fCols[2] + 2, y + 5.5, 7.5, false, [30, 41, 59]);
      if (item.dropOff !== null) {
        const dColor = item.dropOff >= 50 ? [239, 68, 68] : item.dropOff >= 30 ? [245, 158, 11] : [100, 116, 139];
        txt(`▼ ${item.dropOff}%`, fCols[3] + 2, y + 5.5, 7.5, true, dColor);
      }
      y += 9;
    });

    y += 6;

    // ── REVENUE TABLE ────────────────────────────────────────────────
    checkY(50);
    txt("RECEITA — ÚLTIMOS 6 MESES", margin, y, 9, true, [8, 145, 178]);
    y += 2;
    line(margin, y, W - margin);
    y += 5;

    const rCols = [margin, margin + 30, margin + 80, margin + 130];
    rect(margin, y, W - margin * 2, 8, 241, 245, 249);
    txt("Mês", rCols[0] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
    txt("Previsto", rCols[1] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
    txt("Recebido", rCols[2] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
    txt("Vencido", rCols[3] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
    y += 9;

    revenueData.forEach((row, idx) => {
      checkY(9);
      if (idx % 2 === 0) rect(margin, y, W - margin * 2, 8, 248, 250, 252);
      txt(row.month, rCols[0] + 2, y + 5.5, 7.5, false, [30, 41, 59]);
      txt(fmtBRL(row.Previsto), rCols[1] + 2, y + 5.5, 7.5, false, [30, 41, 59]);
      txt(fmtBRL(row.Recebido), rCols[2] + 2, y + 5.5, 7.5, true, [16, 185, 129]);
      if (row.Vencido > 0)
        txt(fmtBRL(row.Vencido), rCols[3] + 2, y + 5.5, 7.5, true, [239, 68, 68]);
      y += 9;
    });

    y += 6;

    // ── ORIGIN PERFORMANCE ────────────────────────────────────────────
    if (originData.length > 0) {
      checkY(50);
      txt("PERFORMANCE POR CANAL DE ORIGEM", margin, y, 9, true, [8, 145, 178]);
      y += 2;
      line(margin, y, W - margin);
      y += 5;

      const oCols = [margin, margin + 40, margin + 80, margin + 115];
      rect(margin, y, W - margin * 2, 8, 241, 245, 249);
      txt("Canal", oCols[0] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
      txt("Leads", oCols[1] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
      txt("Convertidos", oCols[2] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
      txt("Taxa Conv.", oCols[3] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
      y += 9;

      originData.forEach((row, idx) => {
        checkY(9);
        if (idx % 2 === 0) rect(margin, y, W - margin * 2, 8, 248, 250, 252);
        txt(row.name, oCols[0] + 2, y + 5.5, 7.5, false, [30, 41, 59]);
        txt(String(row.Leads), oCols[1] + 2, y + 5.5, 7.5, false, [30, 41, 59]);
        txt(String(row.Convertidos), oCols[2] + 2, y + 5.5, 7.5, false, [30, 41, 59]);
        const rColor = row["Taxa (%)"] >= 20 ? [16, 185, 129] : row["Taxa (%)"] >= 10 ? [245, 158, 11] : [239, 68, 68];
        txt(`${row["Taxa (%)"]}%`, oCols[3] + 2, y + 5.5, 7.5, true, rColor);
        y += 9;
      });

      y += 6;
    }

    // ── STUCK LEADS ───────────────────────────────────────────────────
    const stuckLeads = leads
      .filter((l) => !["won", "lost"].includes(l.status))
      .map((l) => ({ ...l, days: moment().diff(moment(l.updated_date || l.created_date), "days") }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 8);

    if (stuckLeads.length > 0) {
      checkY(40);
      txt("LEADS MAIS PARADOS", margin, y, 9, true, [8, 145, 178]);
      y += 2;
      line(margin, y, W - margin);
      y += 5;

      const sCols = [margin, margin + 70, margin + 130];
      rect(margin, y, W - margin * 2, 8, 241, 245, 249);
      txt("Lead", sCols[0] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
      txt("Etapa", sCols[1] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
      txt("Dias Parado", sCols[2] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
      y += 9;

      stuckLeads.forEach((l, idx) => {
        checkY(9);
        if (idx % 2 === 0) rect(margin, y, W - margin * 2, 8, 248, 250, 252);
        txt(l.name, sCols[0] + 2, y + 5.5, 7.5, false, [30, 41, 59]);
        txt(STAGE_LABELS[l.status] || l.status, sCols[1] + 2, y + 5.5, 7.5, false, [30, 41, 59]);
        const dColor = l.days >= 14 ? [239, 68, 68] : l.days >= 7 ? [245, 158, 11] : [100, 116, 139];
        txt(`${l.days} dias`, sCols[2] + 2, y + 5.5, 7.5, true, dColor);
        y += 9;
      });

      y += 6;
    }

    // ── OVERDUE FINANCIALS ─────────────────────────────────────────────
    const overdueList = financials
      .filter((f) => f.status !== "paid" && f.status !== "cancelled" && moment(f.due_date).isBefore(moment(), "day"))
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 8);

    if (overdueList.length > 0) {
      checkY(40);
      txt("MAIORES COBRANÇAS VENCIDAS", margin, y, 9, true, [8, 145, 178]);
      y += 2;
      line(margin, y, W - margin);
      y += 5;

      const dCols = [margin, margin + 70, margin + 120];
      rect(margin, y, W - margin * 2, 8, 241, 245, 249);
      txt("Cliente", dCols[0] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
      txt("Vencimento", dCols[1] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
      txt("Valor", dCols[2] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
      y += 9;

      overdueList.forEach((f, idx) => {
        checkY(9);
        if (idx % 2 === 0) rect(margin, y, W - margin * 2, 8, 255, 245, 245);
        txt(f.client_name || "—", dCols[0] + 2, y + 5.5, 7.5, false, [30, 41, 59]);
        txt(moment(f.due_date).format("DD/MM/YYYY"), dCols[1] + 2, y + 5.5, 7.5, false, [100, 116, 139]);
        txt(fmtBRL(f.amount), dCols[2] + 2, y + 5.5, 7.5, true, [239, 68, 68]);
        y += 9;
      });
    }

    // ── FOOTER on each page ───────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      rect(0, 285, W, 12, 8, 145, 178);
      txt(`Relatório CRM · ${moment().format("DD/MM/YYYY")}`, margin, 292, 7, false, [200, 240, 255]);
      txt(`Página ${p} de ${totalPages}`, W - margin - 20, 292, 7, false, [200, 240, 255]);
    }

    doc.save(`relatorio-crm-${moment().format("YYYY-MM-DD")}.pdf`);
  }, [metrics, healthScore, scoreLabel, bottlenecks, funnelWithDropOff, revenueData, originData, leads, financials]);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-cyan-600" />
            Relatório Inteligente
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-bold">
            Análise automática de desempenho · Gerado em {moment().format("DD/MM/YYYY [às] HH:mm")}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* PDF Export Button */}
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-black text-sm shadow-md transition-colors border-2 border-cyan-700"
          >
            <Download className="w-4 h-4" />
            Baixar PDF
          </button>

          {/* Health Score Badge */}
          <div className={`bg-gradient-to-r ${scoreBg} text-white rounded-2xl px-5 py-3 shadow-lg text-center min-w-[120px]`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Saúde Geral</p>
            <p className="text-3xl font-black leading-none mt-0.5">{healthScore}</p>
            <p className="text-xs font-black opacity-90">{scoreLabel}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard title="MRR" value={fmtBRL(metrics.mrr)} subtitle={`${metrics.activeContracts} contratos activos`} icon={DollarSign} color="green" />
        <StatsCard title="Pipeline" value={fmtBRL(metrics.pipelineValue)} subtitle={`${metrics.activeLeads} leads activos`} icon={ShoppingCart} color="blue" />
        <StatsCard title="Conversão" value={fmtPct(metrics.conversionRate)} subtitle={`${metrics.wonLeads} fechados de ${metrics.totalLeads}`} icon={Target} color={metrics.conversionRate >= 20 ? "green" : metrics.conversionRate >= 10 ? "amber" : "red"} />
        <StatsCard title="Ticket Médio" value={fmtBRL(metrics.avgTicket)} subtitle="Valor médio dos fechamentos" icon={CreditCard} color="purple" />
        <StatsCard title="Recebido (Mês)" value={fmtBRL(metrics.receivedThisMonth)} subtitle={`Taxa ${fmtPct(metrics.collectionRate)} de coleta`} icon={TrendingUp} color={metrics.collectionRate >= 85 ? "green" : metrics.collectionRate >= 70 ? "amber" : "red"} />
        <StatsCard title="Em Atraso" value={fmtBRL(metrics.overdueAmount)} subtitle={`${metrics.overdueFinancials} cobranças vencidas`} icon={AlertTriangle} color={metrics.overdueAmount > 0 ? "red" : "green"} />
        <StatsCard title="Ativ. Atrasadas" value={metrics.overdueActivities} subtitle="Actividades não realizadas" icon={Clock} color={metrics.overdueActivities >= 10 ? "red" : metrics.overdueActivities >= 5 ? "amber" : "green"} />
        <StatsCard title="Leads Perdidos" value={metrics.lostLeads} subtitle={`${metrics.totalLeads > 0 ? Math.round(metrics.lostLeads / metrics.totalLeads * 100) : 0}% do total`} icon={XCircle} color={metrics.lostLeads > 10 ? "red" : "orange"} />
      </div>

      {/* Bottleneck Panel */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-black">
            <Zap className="w-5 h-5 text-amber-500" />
            Gargalos Identificados
            <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
              {bottlenecks.filter((b) => b.type === "critical").length} crítico(s) ·{" "}
              {bottlenecks.filter((b) => b.type === "warning").length} atenção
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bottlenecks.map((b, i) => (
            <BottleneckCard key={i} {...b} />
          ))}
        </CardContent>
      </Card>

      {/* Charts Row 1: Funnel + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Funnel */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-600" />
              Funil de Vendas
            </CardTitle>
            <p className="text-xs text-gray-500 font-bold -mt-1">Taxa de conversão entre etapas</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnelWithDropOff.map((item, i) => {
                const maxCount = Math.max(...funnelData.map((f) => f.count), 1);
                const pct = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={item.id}>
                    {item.dropOff !== null && (
                      <div className="flex items-center gap-1 py-0.5 px-2">
                        <div className="w-2 border-l-2 border-dashed border-gray-300 h-3 ml-3" />
                        <span className={`text-[10px] font-black ${item.dropOff >= 50 ? "text-red-500" : item.dropOff >= 30 ? "text-amber-500" : "text-gray-400"}`}>
                          ▼ {item.dropOff}% saiu nesta etapa
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-20 sm:w-32 shrink-0 truncate">{item.stage}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-7 overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center px-2 transition-all duration-500"
                          style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: item.color }}
                        >
                          {pct > 15 && <span className="text-[10px] font-black text-white">{item.count}</span>}
                        </div>
                      </div>
                      {pct <= 15 && <span className="text-xs font-black text-gray-700 dark:text-gray-300 w-5 text-right">{item.count}</span>}
                      <span className="text-[10px] font-bold text-gray-400 w-14 text-right shrink-0">{fmtBRL(item.value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Receita — Últimos 6 Meses
            </CardTitle>
            <p className="text-xs text-gray-500 font-bold -mt-1">Prevista × Recebida × Vencida</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPrevisto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRecebido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gVencido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<BRLTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Area type="monotone" dataKey="Previsto" stroke="#06b6d4" strokeWidth={2} fill="url(#gPrevisto)" />
                <Area type="monotone" dataKey="Recebido" stroke="#10b981" strokeWidth={2} fill="url(#gRecebido)" />
                <Area type="monotone" dataKey="Vencido" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" fill="url(#gVencido)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Origin Performance */}
      <Card className="border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" />
            Performance por Canal de Origem
          </CardTitle>
          <p className="text-xs text-gray-500 font-bold -mt-1">Volume de leads e taxa de conversão por canal</p>
        </CardHeader>
        <CardContent>
          {originData.length === 0 ? (
            <p className="text-center text-gray-400 py-8 font-bold text-sm">Sem dados de origem disponíveis</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={originData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip content={<BRLTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar yAxisId="left" dataKey="Leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="Convertidos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="Taxa (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Operational Detail Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top stuck leads */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              Leads Mais Parados
            </CardTitle>
            <p className="text-xs text-gray-500 font-bold -mt-1">Leads activos sem progressão recente</p>
          </CardHeader>
          <CardContent>
            {(() => {
              const stuck = leads
                .filter((l) => !["won", "lost"].includes(l.status))
                .map((l) => ({ ...l, days: moment().diff(moment(l.updated_date || l.created_date), "days") }))
                .sort((a, b) => b.days - a.days)
                .slice(0, 6);
              if (stuck.length === 0)
                return <p className="text-center text-gray-400 py-4 font-bold text-sm">Nenhum lead parado</p>;
              return (
                <div className="space-y-2">
                  {stuck.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-gray-900 dark:text-gray-100 truncate">{l.name}</p>
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{STAGE_LABELS[l.status] || l.status}</p>
                      </div>
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${l.days >= 14 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : l.days >= 7 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300"}`}>
                        {l.days}d parado
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Top overdue financials */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-red-500" />
              Maiores Cobranças Vencidas
            </CardTitle>
            <p className="text-xs text-gray-500 font-bold -mt-1">Valores em aberto com maior impacto financeiro</p>
          </CardHeader>
          <CardContent>
            {(() => {
              const overdue = financials
                .filter((f) => f.status !== "paid" && f.status !== "cancelled" && moment(f.due_date).isBefore(moment(), "day"))
                .sort((a, b) => (b.amount || 0) - (a.amount || 0))
                .slice(0, 6);
              if (overdue.length === 0)
                return <p className="text-center text-gray-400 py-4 font-bold text-sm">Nenhuma cobrança vencida</p>;
              return (
                <div className="space-y-2">
                  {overdue.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-red-50/60 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-gray-900 dark:text-gray-100 truncate">{f.client_name || "—"}</p>
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Venceu {moment(f.due_date).fromNow()}</p>
                      </div>
                      <span className="text-[11px] font-black text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-lg shrink-0">
                        {fmtBRL(f.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
