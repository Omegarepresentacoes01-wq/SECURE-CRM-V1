import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, Users, DollarSign, TrendingUp, Plus, Edit, LogOut, Trash2,
  FileBarChart2, Tag, CreditCard, AlertCircle, Clock, Sun, Moon, Calendar,
  Download, Zap, CheckCircle, XCircle, AlertTriangle, ArrowRight, BarChart2,
} from "lucide-react";
import { useTheme } from "next-themes";
import FinanceiroDashboard from "@/components/admin/FinanceiroDashboard";
import CouponManager from "@/components/admin/CouponManager";
import PlanManager from "@/components/admin/PlanManager";
import moment from "moment";
import { jsPDF } from "jspdf";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── constantes de estilo ──────────────────────────────────────────────────────
const STATUS_COLOR = {
  trial: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_LABEL = { trial: "Trial", active: "Ativo", suspended: "Suspenso", cancelled: "Cancelado" };
const PLAN_LABEL   = { basic: "Básico", professional: "Profissional", enterprise: "Enterprise" };
const PLAN_COLORS  = { basic: "#6366f1", professional: "#0ea5e9", enterprise: "#8b5cf6" };
const PIE_COLORS   = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// ─── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon: Icon, borderColor, valueColor }) {
  return (
    <Card className={`bg-white shadow-md border-2 border-gray-100 border-l-4 ${borderColor} rounded-2xl`}>
      <CardContent className="px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
            <p className={`text-2xl font-black mt-1 leading-none ${valueColor}`}>{value}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-1 font-medium">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${borderColor.replace("border-l-", "bg-").replace("-500", "-100")}`}>
            <Icon className={`w-5 h-5 ${valueColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Wrapper de card de gráfico ────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, height = 260 }) {
  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-black text-gray-800">{title}</CardTitle>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </CardHeader>
      <CardContent className="pb-4">
        <div style={{ height }}>{children}</div>
      </CardContent>
    </Card>
  );
}

// ─── Tooltip customizado ───────────────────────────────────────────────────────
function BRTooltip({ active, payload, label, prefix = "R$ " }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      {label && <p className="font-black text-gray-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === "number" && prefix ? `${prefix}${p.value.toLocaleString("pt-BR")}` : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Relatório Inteligente Admin ───────────────────────────────────────────────
const SEV_CFG = {
  critical: { bg: "bg-red-50",    border: "border-red-400",    icon: XCircle,       iconColor: "text-red-500",    badge: "bg-red-500 text-white",    label: "Crítico" },
  warning:  { bg: "bg-amber-50",  border: "border-amber-400",  icon: AlertTriangle, iconColor: "text-amber-500",  badge: "bg-amber-500 text-white",  label: "Atenção" },
  info:     { bg: "bg-blue-50",   border: "border-blue-400",   icon: AlertCircle,   iconColor: "text-blue-500",   badge: "bg-blue-500 text-white",   label: "Info" },
  success:  { bg: "bg-emerald-50",border: "border-emerald-400",icon: CheckCircle,   iconColor: "text-emerald-500",badge: "bg-emerald-500 text-white", label: "Saudável" },
};

function BotCard({ type, title, description, metric, action }) {
  const s = SEV_CFG[type] || SEV_CFG.info;
  const Icon = s.icon;
  return (
    <div className={`rounded-xl border-2 ${s.border} ${s.bg} p-4 flex gap-3`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${s.iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-gray-900">{title}</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
          {metric && <span className="text-[11px] font-black text-gray-700 bg-white/70 px-1.5 py-0.5 rounded">{metric}</span>}
        </div>
        <p className="text-xs text-gray-600 mt-0.5 font-bold">{description}</p>
        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
          <ArrowRight className="w-3 h-3 shrink-0" />{action}
        </p>
      </div>
    </div>
  );
}

function RelatorioInteligenteAdmin({ organizations, allUsers, leads, contracts, billings }) {
  const fmtBRL = v => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

  const metrics = useMemo(() => {
    const active   = organizations.filter(o => o.status === "active");
    const trial    = organizations.filter(o => o.status === "trial");
    const suspended= organizations.filter(o => o.status === "suspended");
    const cancelled= organizations.filter(o => o.status === "cancelled");
    const mrr      = active.reduce((s, o) => s + (o.monthly_price || 0), 0);
    const arr      = mrr * 12;
    const avgTicket= active.length ? Math.round(mrr / active.length) : 0;
    const totalFat = billings.reduce((s, b) => s + (b.final_amount || 0), 0);
    const trialConvRate = (trial.length + active.length) > 0
      ? (active.length / (trial.length + active.length)) * 100 : 0;
    const churnRate = organizations.length > 0
      ? (cancelled.length / organizations.length) * 100 : 0;
    const expiringSoon = active.filter(o =>
      o.subscription_ends_at && moment(o.subscription_ends_at).diff(moment(), "days") <= 7
    );
    return {
      total: organizations.length, active: active.length, trial: trial.length,
      suspended: suspended.length, cancelled: cancelled.length,
      mrr, arr, avgTicket, totalFat, trialConvRate, churnRate,
      expiringSoon: expiringSoon.length,
      totalUsers: allUsers.filter(u => u.role !== "super_admin").length,
      totalLeads: leads.length,
      totalContracts: contracts.filter(c => c.status === "active").length,
    };
  }, [organizations, allUsers, leads, contracts, billings]);

  const healthScore = useMemo(() => {
    let score = 100;
    if (metrics.churnRate > 20) score -= 25;
    else if (metrics.churnRate > 10) score -= 12;
    if (metrics.trialConvRate < 30) score -= 20;
    else if (metrics.trialConvRate < 50) score -= 10;
    if (metrics.expiringSoon > 0) score -= Math.min(metrics.expiringSoon * 5, 20);
    if (metrics.suspended > 2) score -= 15;
    else if (metrics.suspended > 0) score -= 7;
    return Math.max(0, Math.min(100, score));
  }, [metrics]);

  const scoreBg    = healthScore >= 80 ? "from-emerald-500 to-emerald-600" : healthScore >= 60 ? "from-amber-400 to-amber-600" : "from-red-500 to-red-600";
  const scoreLabel = healthScore >= 80 ? "Saudável" : healthScore >= 60 ? "Atenção" : "Crítico";

  const bottlenecks = useMemo(() => {
    const results = [];
    // Expiring soon
    if (metrics.expiringSoon > 0)
      results.push({ type: "critical", title: "Assinaturas Vencendo", description: `${metrics.expiringSoon} organização(ões) com assinatura expirando em menos de 7 dias`, metric: `${metrics.expiringSoon} org(s)`, action: "Entre em contato e renove antes do vencimento" });
    // Suspended
    if (metrics.suspended > 0)
      results.push({ type: metrics.suspended > 2 ? "critical" : "warning", title: "Organizações Suspensas", description: `${metrics.suspended} conta(s) suspensa(s) — possível perda de receita`, metric: `${metrics.suspended} org(s)`, action: "Reative ou cancele formalmente para manter o MRR limpo" });
    // Low trial conversion
    if (metrics.total >= 3) {
      if (metrics.trialConvRate < 30)
        results.push({ type: "critical", title: "Conversão de Trial Baixa", description: `Apenas ${metrics.trialConvRate.toFixed(1)}% dos trials estão a converter para plano pago`, metric: `${metrics.trialConvRate.toFixed(1)}%`, action: "Revise o onboarding e ofereça suporte activo durante o trial" });
      else if (metrics.trialConvRate < 50)
        results.push({ type: "warning", title: "Conversão de Trial Moderada", description: `${metrics.trialConvRate.toFixed(1)}% de conversão — há espaço para melhorar`, metric: `${metrics.trialConvRate.toFixed(1)}%`, action: "Implemente emails automáticos e demostrações para os trials" });
    }
    // High churn
    if (metrics.churnRate > 10)
      results.push({ type: metrics.churnRate > 20 ? "critical" : "warning", title: "Taxa de Churn Elevada", description: `${metrics.churnRate.toFixed(1)}% das organizações cancelaram o serviço`, metric: `${metrics.churnRate.toFixed(1)}%`, action: "Investigue os motivos de cancelamento e melhore a retenção" });
    // Low adoption orgs
    const lowAdoptionOrgs = organizations.filter(o => {
      const orgLeads = leads.filter(l => l.organization_id === o.id).length;
      return o.status === "active" && orgLeads === 0;
    });
    if (lowAdoptionOrgs.length > 0)
      results.push({ type: "warning", title: "Organizações Sem Adoção", description: `${lowAdoptionOrgs.length} org(s) ativas sem nenhum lead criado na plataforma`, metric: `${lowAdoptionOrgs.length} org(s)`, action: "Faça um check-in proativo e ofereça treinamento de adoção" });

    if (results.length === 0)
      results.push({ type: "success", title: "Plataforma em Boa Saúde!", description: "Nenhum gargalo crítico identificado. Continue a monitorar os indicadores.", metric: "100%", action: "Mantenha o ritmo e explore oportunidades de crescimento" });

    const order = { critical: 0, warning: 1, info: 2, success: 3 };
    return results.sort((a, b) => (order[a.type] ?? 4) - (order[b.type] ?? 4));
  }, [metrics, organizations, leads]);

  // Revenue last 6 months
  const revenueData = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const date = moment().subtract(5 - i, "months");
      const key  = date.format("YYYY-MM");
      const label= date.format("MMM/YY");
      const month= billings.filter(b => moment(b.billing_date).format("YYYY-MM") === key);
      return { month: label, Faturado: month.reduce((s, b) => s + (b.final_amount || 0), 0) };
    }), [billings]);

  // Per-org table
  const orgTable = useMemo(() =>
    organizations
      .map(o => ({
        name: o.name,
        plan: PLAN_LABEL[o.plan] || o.plan || "—",
        status: o.status,
        mrr: o.monthly_price || 0,
        users: allUsers.filter(u => u.organization_id === o.id).length,
        leads: leads.filter(l => l.organization_id === o.id).length,
        daysLeft: o.subscription_ends_at ? moment(o.subscription_ends_at).diff(moment(), "days") : null,
      }))
      .sort((a, b) => b.mrr - a.mrr),
  [organizations, allUsers, leads]);

  const exportPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210; const margin = 14; const colW = (W - margin * 2) / 2;
    let y = 0;
    const addPage = () => { doc.addPage(); y = 0; };
    const checkY  = (need = 20) => { if (y + need > 275) addPage(); };
    const rect = (x, ry, w, h, r, g, b) => { doc.setFillColor(r, g, b); doc.rect(x, ry, w, h, "F"); };
    const txt  = (text, x, ty, size, bold, color) => {
      doc.setFontSize(size); doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...color); doc.text(String(text), x, ty);
    };
    const line = (x1, ly, x2) => { doc.setDrawColor(220, 220, 230); doc.setLineWidth(0.3); doc.line(x1, ly, x2, ly); };

    // Header
    rect(0, 0, W, 32, 8, 145, 178);
    txt("Relatório Inteligente — Super Admin", margin, 12, 16, true, [255, 255, 255]);
    txt(`Gerado em: ${moment().format("DD/MM/YYYY [às] HH:mm")}`, margin, 20, 9, false, [200, 240, 255]);
    const scoreC = healthScore >= 80 ? [16, 185, 129] : healthScore >= 60 ? [245, 158, 11] : [239, 68, 68];
    rect(W - 50, 4, 36, 24, ...scoreC);
    txt("SAÚDE", W - 49, 10, 7, true, [255, 255, 255]);
    txt(`${healthScore}/100`, W - 49, 17, 14, true, [255, 255, 255]);
    txt(scoreLabel.toUpperCase(), W - 49, 23, 7, true, [255, 255, 255]);
    y = 38;

    // KPIs
    txt("INDICADORES DA PLATAFORMA", margin, y, 9, true, [8, 145, 178]); y += 2;
    line(margin, y, W - margin); y += 5;
    const kpis = [
      ["MRR Total", fmtBRL(metrics.mrr), `${metrics.active} orgs ativas`],
      ["ARR Projetado", fmtBRL(metrics.arr), "MRR × 12 meses"],
      ["Ticket Médio", fmtBRL(metrics.avgTicket), "Por organização ativa"],
      ["Total Faturado", fmtBRL(metrics.totalFat), "Histórico de cobranças"],
      ["Orgs em Trial", String(metrics.trial), `Conv. ${metrics.trialConvRate.toFixed(1)}%`],
      ["Churn Rate", `${metrics.churnRate.toFixed(1)}%`, `${metrics.cancelled} canceladas`],
      ["Total Usuários", String(metrics.totalUsers), "Todas as orgs"],
      ["Total Leads", String(metrics.totalLeads), "Todas as orgs"],
    ];
    kpis.forEach(([label, value, sub], i) => {
      const col = i % 2; const bx = margin + col * (colW + 2); const by = y + Math.floor(i / 2) * 18;
      rect(bx, by, colW, 16, 248, 250, 252);
      doc.setDrawColor(220, 226, 235); doc.setLineWidth(0.4); doc.rect(bx, by, colW, 16);
      txt(label, bx + 3, by + 5.5, 7.5, false, [100, 116, 139]);
      txt(value, bx + 3, by + 10.5, 10, true, [15, 23, 42]);
      txt(sub, bx + 3, by + 14.5, 6.5, false, [148, 163, 184]);
    });
    y += Math.ceil(kpis.length / 2) * 18 + 6;

    // Bottlenecks
    checkY(30);
    txt("GARGALOS IDENTIFICADOS", margin, y, 9, true, [8, 145, 178]); y += 2;
    line(margin, y, W - margin); y += 5;
    const sevColors = { critical: [239, 68, 68], warning: [245, 158, 11], info: [59, 130, 246], success: [16, 185, 129] };
    const sevLabel  = { critical: "CRÍTICO", warning: "ATENÇÃO", info: "INFO", success: "SAUDÁVEL" };
    bottlenecks.forEach((b) => {
      checkY(18);
      const sc = sevColors[b.type] || [100, 116, 139];
      rect(margin, y, 3, 14, ...sc);
      rect(margin + 3, y, W - margin * 2 - 3, 14, 250, 250, 252);
      txt(sevLabel[b.type] || b.type.toUpperCase(), margin + 6, y + 5, 7, true, sc);
      txt(b.title, margin + 28, y + 5, 8, true, [15, 23, 42]);
      if (b.metric) { rect(W - margin - 28, y + 1, 26, 8, ...sc); txt(b.metric, W - margin - 27, y + 6.5, 7, true, [255, 255, 255]); }
      txt(b.description, margin + 6, y + 10, 7, false, [71, 85, 105]);
      y += 16;
    });
    y += 4;

    // Revenue
    checkY(50);
    txt("FATURAMENTO — ÚLTIMOS 6 MESES", margin, y, 9, true, [8, 145, 178]); y += 2;
    line(margin, y, W - margin); y += 5;
    const rCols = [margin, margin + 50, margin + 120];
    rect(margin, y, W - margin * 2, 8, 241, 245, 249);
    txt("Mês", rCols[0] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
    txt("Faturado", rCols[1] + 2, y + 5.5, 7.5, true, [51, 65, 85]);
    y += 9;
    revenueData.forEach((row, idx) => {
      checkY(9);
      if (idx % 2 === 0) rect(margin, y, W - margin * 2, 8, 248, 250, 252);
      txt(row.month, rCols[0] + 2, y + 5.5, 7.5, false, [30, 41, 59]);
      txt(fmtBRL(row.Faturado), rCols[1] + 2, y + 5.5, 7.5, true, [16, 185, 129]);
      y += 9;
    });
    y += 6;

    // Org table
    checkY(40);
    txt("ORGANIZAÇÕES — VISÃO GERAL", margin, y, 9, true, [8, 145, 178]); y += 2;
    line(margin, y, W - margin); y += 5;
    const oCols = [margin, margin + 45, margin + 80, margin + 110, margin + 130, margin + 150];
    rect(margin, y, W - margin * 2, 8, 241, 245, 249);
    txt("Organização", oCols[0] + 2, y + 5.5, 7, true, [51, 65, 85]);
    txt("Plano", oCols[1] + 2, y + 5.5, 7, true, [51, 65, 85]);
    txt("MRR", oCols[2] + 2, y + 5.5, 7, true, [51, 65, 85]);
    txt("Status", oCols[3] + 2, y + 5.5, 7, true, [51, 65, 85]);
    txt("Users", oCols[4] + 2, y + 5.5, 7, true, [51, 65, 85]);
    txt("Leads", oCols[5] + 2, y + 5.5, 7, true, [51, 65, 85]);
    y += 9;
    const stColors = { active: [16, 185, 129], trial: [245, 158, 11], suspended: [234, 179, 8], cancelled: [239, 68, 68] };
    orgTable.forEach((o, idx) => {
      checkY(9);
      if (idx % 2 === 0) rect(margin, y, W - margin * 2, 8, 248, 250, 252);
      txt((o.name || "").substring(0, 22), oCols[0] + 2, y + 5.5, 7, false, [30, 41, 59]);
      txt(o.plan, oCols[1] + 2, y + 5.5, 7, false, [30, 41, 59]);
      txt(fmtBRL(o.mrr), oCols[2] + 2, y + 5.5, 7, true, [16, 185, 129]);
      txt(STATUS_LABEL[o.status] || o.status, oCols[3] + 2, y + 5.5, 7, true, stColors[o.status] || [100, 116, 139]);
      txt(String(o.users), oCols[4] + 2, y + 5.5, 7, false, [30, 41, 59]);
      txt(String(o.leads), oCols[5] + 2, y + 5.5, 7, false, [30, 41, 59]);
      y += 9;
    });

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      rect(0, 285, W, 12, 8, 145, 178);
      txt(`SECURE-CRM · Super Admin · ${moment().format("DD/MM/YYYY")}`, margin, 292, 7, false, [200, 240, 255]);
      txt(`Página ${p} de ${totalPages}`, W - margin - 20, 292, 7, false, [200, 240, 255]);
    }

    doc.save(`relatorio-superadmin-${moment().format("YYYY-MM-DD")}.pdf`);
  }, [metrics, healthScore, scoreLabel, bottlenecks, revenueData, orgTable]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-cyan-600" /> Relatório Inteligente
          </h2>
          <p className="text-sm text-gray-500 font-bold mt-0.5">
            Análise automática da plataforma · {moment().format("DD/MM/YYYY [às] HH:mm")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-black text-sm shadow-md transition-colors border-2 border-cyan-700"
          >
            <Download className="w-4 h-4" /> Baixar PDF
          </button>
          <div className={`bg-gradient-to-r ${scoreBg} text-white rounded-2xl px-5 py-3 shadow-lg text-center min-w-[130px]`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Saúde</p>
            <p className="text-3xl font-black leading-none mt-0.5">{healthScore}</p>
            <p className="text-xs font-black opacity-90">{scoreLabel}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "MRR Total",      value: fmtBRL(metrics.mrr),          sub: `${metrics.active} orgs ativas`,             color: "border-l-emerald-500 text-emerald-700" },
          { label: "ARR Projetado",  value: fmtBRL(metrics.arr),          sub: "MRR × 12 meses",                            color: "border-l-blue-500 text-blue-700" },
          { label: "Ticket Médio",   value: fmtBRL(metrics.avgTicket),    sub: "Por org ativa",                             color: "border-l-purple-500 text-purple-700" },
          { label: "Total Faturado", value: fmtBRL(metrics.totalFat),     sub: "Histórico de cobranças",                    color: "border-l-orange-500 text-orange-700" },
          { label: "Em Trial",       value: metrics.trial,                 sub: `Conv. ${metrics.trialConvRate.toFixed(1)}%`, color: "border-l-amber-500 text-amber-700" },
          { label: "Churn Rate",     value: `${metrics.churnRate.toFixed(1)}%`, sub: `${metrics.cancelled} canceladas`,    color: "border-l-red-500 text-red-700" },
          { label: "Usuários",       value: metrics.totalUsers,            sub: "Total na plataforma",                      color: "border-l-indigo-500 text-indigo-700" },
          { label: "Leads",          value: metrics.totalLeads,            sub: "Todas as orgs",                            color: "border-l-cyan-500 text-cyan-700" },
        ].map(m => (
          <Card key={m.label} className={`bg-white border border-gray-200 border-l-4 ${m.color.split(" ")[0]} shadow-sm`}>
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{m.label}</p>
              <p className={`text-2xl font-black mt-1 ${m.color.split(" ")[1]}`}>{m.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottlenecks */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-black">
            <Zap className="w-5 h-5 text-amber-500" />
            Gargalos Identificados
            <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
              {bottlenecks.filter(b => b.type === "critical").length} crítico(s) · {bottlenecks.filter(b => b.type === "warning").length} atenção
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bottlenecks.map((b, i) => <BotCard key={i} {...b} />)}
        </CardContent>
      </Card>

      {/* Revenue chart + Org table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black">Faturamento — Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="gFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`R$ ${v.toLocaleString("pt-BR")}`, "Faturado"]} />
                <Area type="monotone" dataKey="Faturado" stroke="#10b981" strokeWidth={2} fill="url(#gFat)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Per-org summary table */}
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black">Organizações por MRR</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-black text-gray-600 uppercase text-[10px]">Organização</th>
                    <th className="text-left px-3 py-2 font-black text-gray-600 uppercase text-[10px]">Status</th>
                    <th className="text-right px-3 py-2 font-black text-gray-600 uppercase text-[10px]">MRR</th>
                    <th className="text-center px-3 py-2 font-black text-gray-600 uppercase text-[10px]">Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {orgTable.map((o, i) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-bold text-gray-900">{o.name}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${STATUS_COLOR[o.status]}`}>
                          {STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-black text-emerald-700">{fmtBRL(o.mrr)}</td>
                      <td className="px-3 py-2 text-center font-bold text-gray-700">{o.leads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Aba Relatórios BI ─────────────────────────────────────────────────────────
function RelatoriosBI({ organizations, allUsers, leads, billings }) {
  const totalMRR  = organizations.filter(o => o.status === "active").reduce((s, o) => s + (o.monthly_price || 0), 0);
  const totalARR  = totalMRR * 12;
  const activeCount = organizations.filter(o => o.status === "active" && o.monthly_price > 0).length;
  const mediaTicket = activeCount ? Math.round(totalMRR / activeCount) : 0;
  const totalFat  = billings.reduce((s, b) => s + (b.final_amount || 0), 0);

  // Receita por plano (MRR de orgs ativas)
  const receitaPlano = useMemo(() => {
    const m = {};
    organizations.filter(o => o.status === "active").forEach(o => {
      const k = PLAN_LABEL[o.plan] || o.plan || "Sem Plano";
      m[k] = (m[k] || 0) + (o.monthly_price || 0);
    });
    return Object.entries(m).map(([name, valor]) => ({ name, valor }));
  }, [organizations]);

  // Distribuição de status
  const distStatus = useMemo(() => {
    const m = {};
    organizations.forEach(o => { const k = STATUS_LABEL[o.status] || o.status; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [organizations]);

  // Distribuição de planos
  const distPlano = useMemo(() => {
    const m = {};
    organizations.forEach(o => { const k = PLAN_LABEL[o.plan] || o.plan || "Sem Plano"; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [organizations]);

  // Faturamento por mês
  const fatMensal = useMemo(() => {
    const m = {};
    billings.forEach(b => {
      const key = moment(b.billing_date).format("MMM/YY");
      m[key] = (m[key] || 0) + (b.final_amount || 0);
    });
    return Object.entries(m)
      .sort((a, b) => moment(a[0], "MMM/YY").valueOf() - moment(b[0], "MMM/YY").valueOf())
      .map(([mes, receita]) => ({ mes, receita }));
  }, [billings]);

  // MRR por organização
  const receitaPorOrg = useMemo(() =>
    organizations.filter(o => o.monthly_price > 0)
      .map(o => ({ name: (o.name || "—").substring(0, 18), mrr: o.monthly_price || 0 }))
      .sort((a, b) => b.mrr - a.mrr),
  [organizations]);

  // Leads + usuários por organização
  const adocaoPorOrg = useMemo(() =>
    organizations.map(o => ({
      name: (o.name || "—").substring(0, 14),
      leads: leads.filter(l => l.organizacao_id === o.id || l.organization_id === o.id).length,
      usuarios: allUsers.filter(u => u.organization_id === o.id).length,
    })).filter(d => d.leads > 0 || d.usuarios > 0),
  [organizations, leads, allUsers]);

  const statusColorMap = { Trial: "#f59e0b", Ativo: "#10b981", Suspenso: "#eab308", Cancelado: "#ef4444" };

  return (
    <div className="space-y-5">
      {/* Métricas financeiras resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "MRR Total", value: `R$ ${totalMRR.toLocaleString("pt-BR")}`, sub: "Receita mensal recorrente", color: "border-l-emerald-500 text-emerald-700" },
          { label: "ARR Projetado", value: `R$ ${totalARR.toLocaleString("pt-BR")}`, sub: "MRR × 12 meses", color: "border-l-blue-500 text-blue-700" },
          { label: "Ticket Médio", value: `R$ ${mediaTicket.toLocaleString("pt-BR")}`, sub: "Por organização ativa", color: "border-l-purple-500 text-purple-700" },
          { label: "Total Faturado", value: `R$ ${totalFat.toLocaleString("pt-BR")}`, sub: "Histórico de cobranças", color: "border-l-orange-500 text-orange-700" },
        ].map(m => (
          <Card key={m.label} className={`bg-white border border-gray-200 border-l-4 ${m.color.split(" ")[0]} shadow-sm`}>
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{m.label}</p>
              <p className={`text-2xl font-black mt-1 ${m.color.split(" ")[1]}`}>{m.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Linha 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartCard title="MRR por Plano" subtitle="Receita mensal das organizações ativas, por tipo de plano">
          {receitaPlano.length === 0
            ? <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sem orgs ativas</div>
            : <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitaPlano} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                  <Tooltip content={<BRTooltip />} />
                  <Bar dataKey="valor" name="MRR" radius={[5, 5, 0, 0]}>
                    {receitaPlano.map((_, i) => <Cell key={i} fill={Object.values(PLAN_COLORS)[i % 3]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        <ChartCard title="Status das Organizações" subtitle="Distribuição por situação atual da assinatura">
          {distStatus.length === 0
            ? <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sem dados</div>
            : <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distStatus} cx="50%" cy="45%" innerRadius={55} outerRadius={90}
                    paddingAngle={3} dataKey="value" nameKey="name">
                    {distStatus.map((e, i) => <Cell key={i} fill={statusColorMap[e.name] || PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip content={<BRTooltip prefix="" />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
          }
        </ChartCard>
      </div>

      {/* Linha 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartCard title="Faturamento Mensal" subtitle="Receita acumulada registrada por mês" height={240}>
          {fatMensal.length === 0
            ? <div className="flex items-center justify-center h-full text-gray-400 text-sm">Nenhuma cobrança registrada ainda</div>
            : <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fatMensal}>
                  <defs>
                    <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                  <Tooltip content={<BRTooltip />} />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="#10b981" strokeWidth={2.5} fill="url(#gradReceita)" />
                </AreaChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        <ChartCard title="Distribuição de Planos" subtitle="Quantidade de organizações por plano contratado" height={240}>
          {distPlano.length === 0
            ? <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sem dados</div>
            : <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distPlano} cx="50%" cy="45%" outerRadius={90} paddingAngle={3}
                    dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} labelLine>
                    {distPlano.map((e, i) => {
                      const key = Object.keys(PLAN_LABEL).find(k => PLAN_LABEL[k] === e.name);
                      return <Cell key={i} fill={key ? PLAN_COLORS[key] : PIE_COLORS[i]} />;
                    })}
                  </Pie>
                  <Tooltip content={<BRTooltip prefix="" />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
          }
        </ChartCard>
      </div>

      {/* Linha 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartCard title="MRR por Organização" subtitle="Receita mensal individual de cada cliente" height={Math.max(240, receitaPorOrg.length * 40)}>
          {receitaPorOrg.length === 0
            ? <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sem organizações com plano</div>
            : <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitaPorOrg} layout="vertical" barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} width={115} />
                  <Tooltip content={<BRTooltip />} />
                  <Bar dataKey="mrr" name="MRR" fill="#6366f1" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </ChartCard>

        <ChartCard title="Adoção — Leads & Usuários por Org" subtitle="Engajamento de cada organização na plataforma" height={240}>
          {adocaoPorOrg.length === 0
            ? <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sem dados</div>
            : <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adocaoPorOrg} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<BRTooltip prefix="" />} />
                  <Legend />
                  <Bar dataKey="leads" name="Leads" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="usuarios" name="Usuários" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </ChartCard>
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function SuperAdmin() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [confirmDeleteOrg, setConfirmDeleteOrg] = useState(null);
  const queryClient = useQueryClient();

  const { data: organizations = [] } = useQuery({ queryKey: ["organizations"], queryFn: () => base44.entities.Organization.list("-created_date") });
  const { data: allUsers = [] }      = useQuery({ queryKey: ["all_users"],     queryFn: () => base44.entities.User.list() });
  const { data: leads = [] }         = useQuery({ queryKey: ["all_leads"],     queryFn: () => base44.entities.Lead.list() });
  const { data: contracts = [] }     = useQuery({ queryKey: ["all_contracts"], queryFn: () => base44.entities.Contract.list() });
  const { data: billings = [] }      = useQuery({ queryKey: ["billings"],      queryFn: () => base44.entities.Billing.list("-billing_date") });
  const { data: coupons = [] }       = useQuery({ queryKey: ["coupons"],       queryFn: () => base44.entities.Coupon.list() });

  const createOrgMutation = useMutation({
    mutationFn: (data) => base44.entities.Organization.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setShowOrgForm(false);
      setEditingOrg(null);
      toast.success("Organização criada com sucesso!");
    },
    onError: (err) => {
      console.error("Erro ao criar organização:", err);
      toast.error("Erro ao criar organização. Verifique os dados e tente novamente.");
    },
  });
  const updateOrgMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Organization.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setShowOrgForm(false);
      setEditingOrg(null);
      toast.success("Organização atualizada com sucesso!");
    },
    onError: (err) => {
      console.error("Erro ao atualizar organização:", err);
      toast.error("Erro ao atualizar organização. Tente novamente.");
    },
  });
  const createBillingMutation = useMutation({
    mutationFn: (data) => base44.entities.Billing.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billings"] }),
  });
  const createCouponMutation = useMutation({
    mutationFn: (data) => base44.entities.Coupon.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coupons"] }),
  });
  const updateCouponMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coupon.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coupons"] }),
  });
  const deleteOrgMutation = useMutation({
    mutationFn: (id) => base44.entities.Organization.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["organizations"] }); setConfirmDeleteOrg(null); },
  });
  const updateBillingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Billing.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billings"] }),
  });

  const handleFinanceiroAction = (action, target) => {
    if (action === "markPaid") {
      updateBillingMutation.mutate({ id: target.id, data: { status: "paid", billing_date: new Date().toISOString().split("T")[0] } });
    } else if (action === "suspend") {
      updateOrgMutation.mutate({ id: target.id, data: { status: "suspended" } });
    } else if (action === "reactivate") {
      updateOrgMutation.mutate({ id: target.id, data: { status: "active" } });
    }
  };

  const handleChangePlan = async (orgId, orgData, billingData) => {
    await updateOrgMutation.mutateAsync({ id: orgId, data: orgData });
    const org = organizations.find((o) => o.id === orgId);
    await createBillingMutation.mutateAsync({
      organization_id: orgId, organization_name: org.name, type: billingData.type,
      plan: orgData.plan, amount: orgData.monthly_price, discount: billingData.discount || 0,
      coupon_code: billingData.couponCode, final_amount: orgData.monthly_price - (billingData.discount || 0),
      billing_date: new Date().toISOString().split("T")[0],
      period_start: orgData.subscription_starts_at, period_end: orgData.subscription_ends_at,
      status: "paid", payment_method: billingData.paymentMethod,
    });
    if (billingData.couponCode) {
      const coupon = coupons.find((c) => c.code === billingData.couponCode);
      if (coupon) await updateCouponMutation.mutateAsync({ id: coupon.id, data: { used_count: (coupon.used_count || 0) + 1 } });
    }
  };

  const handleRenew = async (orgId, orgData, billingData) => {
    await updateOrgMutation.mutateAsync({ id: orgId, data: orgData });
    const org = organizations.find((o) => o.id === orgId);
    await createBillingMutation.mutateAsync({
      organization_id: orgId, organization_name: org.name, type: "renewal",
      plan: org.plan, amount: org.monthly_price, discount: billingData.discount || 0,
      coupon_code: billingData.couponCode, final_amount: org.monthly_price - (billingData.discount || 0),
      billing_date: new Date().toISOString().split("T")[0],
      period_start: orgData.subscription_starts_at, period_end: orgData.subscription_ends_at,
      status: "paid", payment_method: billingData.paymentMethod,
    });
    if (billingData.couponCode) {
      const coupon = coupons.find((c) => c.code === billingData.couponCode);
      if (coupon) await updateCouponMutation.mutateAsync({ id: coupon.id, data: { used_count: (coupon.used_count || 0) + 1 } });
    }
  };

  const stats = {
    total: organizations.length,
    active: organizations.filter(o => o.status === "active").length,
    trial: organizations.filter(o => o.status === "trial").length,
    suspended: organizations.filter(o => o.status === "suspended").length,
    mrr: organizations.filter(o => o.status === "active").reduce((s, o) => s + (o.monthly_price || 0), 0),
    totalUsers: allUsers.filter(u => u.role !== "super_admin").length,
    totalLeads: leads.length,
    totalContracts: contracts.filter(c => c.status === "active").length,
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-[#0891b2] via-[#0e7490] to-[#164e63] shadow-xl">
        <div className="w-full px-5 sm:px-8 py-10 flex items-center justify-between gap-4">

          {/* Left — brand */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="text-[32px] font-black italic leading-none text-white drop-shadow whitespace-nowrap"
                  style={{ fontFamily: "'Arial Black', 'Franklin Gothic Heavy', Impact, sans-serif" }}
                >
                  SECURE-<span className="text-cyan-300">CRM</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 bg-white/15 border border-white/30 text-cyan-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  <Zap className="w-3 h-3" /> Super Admin
                </span>
              </div>
              <p className="text-[12px] text-white/50 font-semibold tracking-[0.2em] uppercase mt-2 hidden sm:block">
                Gestão de Assinaturas · SaaS Dashboard
              </p>
            </div>
          </div>

          {/* Right — user + actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* User pill */}
            <div className="hidden md:flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-cyan-400/30 border border-cyan-300/40 flex items-center justify-center text-white text-base font-black">
                {user?.full_name?.[0]?.toUpperCase() || "S"}
              </div>
              <div className="leading-tight">
                <p className="text-[11px] text-white/50 font-semibold">Logado como</p>
                <p className="text-base font-black text-white">{user?.full_name || "Super Admin"}</p>
              </div>
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Logout */}
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 h-11 px-5 rounded-xl bg-white/10 border border-white/20 text-white/80 hover:text-white hover:bg-white/20 transition-colors text-sm font-bold"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-5">
        {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard title="Organizações" value={stats.total} sub={`${stats.active} ativas`} icon={Building2} borderColor="border-l-blue-500" valueColor="text-blue-700" />
          <KpiCard title="MRR" value={`R$ ${stats.mrr.toLocaleString("pt-BR")}`} sub="Receita recorrente" icon={DollarSign} borderColor="border-l-emerald-500" valueColor="text-emerald-700" />
          <KpiCard title="Usuários" value={stats.totalUsers} sub="Total no sistema" icon={Users} borderColor="border-l-indigo-500" valueColor="text-indigo-700" />
          <KpiCard title="Leads" value={stats.totalLeads} sub="Todas as orgs" icon={TrendingUp} borderColor="border-l-orange-500" valueColor="text-orange-700" />
          <KpiCard title="Em Trial" value={stats.trial} sub={`${stats.suspended} susp.`} icon={Clock} borderColor="border-l-amber-500" valueColor="text-amber-700" />
          <KpiCard title="Contratos" value={stats.totalContracts} sub="Ativos" icon={FileBarChart2} borderColor="border-l-purple-500" valueColor="text-purple-700" />
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="organizations" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList className="bg-transparent h-auto p-0 gap-2 flex flex-wrap">
              {[
                { value: "organizations", icon: Building2,     label: "Organizações" },
                { value: "users",         icon: Users,         label: "Usuários" },
                { value: "billing",       icon: CreditCard,    label: "Faturamento" },
                { value: "coupons",       icon: Tag,           label: "Cupons" },
                { value: "intelligent",   icon: BarChart2,     label: "Rel. Inteligente" },
                { value: "reports",       icon: FileBarChart2, label: "Relatórios BI" },
              ].map(({ value, icon: Icon, label }) => (
                <TabsTrigger key={value} value={value}
                  className="text-sm font-bold px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white shadow-sm
                    data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0891b2] data-[state=active]:to-[#0e7490]
                    data-[state=active]:text-white data-[state=active]:border-[#0891b2] data-[state=active]:shadow-md
                    text-gray-500 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50 transition-all">
                  <Icon className="w-4 h-4 mr-2" />{label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button onClick={() => setShowOrgForm(true)} className="bg-gradient-to-r from-[#0891b2] to-[#0e7490] hover:from-[#0e7490] hover:to-[#164e63] text-white font-bold shadow-md h-11 px-5 text-sm">
              <Plus className="w-4 h-4 mr-2" /> Nova Organização
            </Button>
          </div>

          {/* ── Organizações ─────────────────────────────────────────────────── */}
          <TabsContent value="organizations">
            <Card className="bg-white border-2 border-gray-100 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b-2 border-gray-100 pb-4 bg-gray-50/60">
                <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  {organizations.length} Organização{organizations.length !== 1 ? "s" : ""} Cadastrada{organizations.length !== 1 ? "s" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-4">
                <div className="space-y-2.5">
                  {organizations.length === 0 && (
                    <div className="text-center py-14 text-gray-400">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-semibold">Nenhuma organização cadastrada</p>
                      <p className="text-sm mt-1 opacity-60">Clique em "Nova Organização" para adicionar</p>
                    </div>
                  )}
                  {organizations.map((org) => {
                    const orgUsers = allUsers.filter(u => u.organization_id === org.id).length;
                    const orgLeads = leads.filter(l => l.organizacao_id === org.id || l.organization_id === org.id).length;
                    const daysLeft = org.subscription_ends_at ? moment(org.subscription_ends_at).diff(moment(), "days") : null;
                    const isExpiring = daysLeft !== null && daysLeft <= 7;
                    const statusBar = org.status === "active" ? "bg-emerald-500" : org.status === "trial" ? "bg-amber-400" : org.status === "suspended" ? "bg-yellow-400" : "bg-red-500";
                    return (
                      <div key={org.id} className={`flex items-stretch gap-0 rounded-2xl border-2 overflow-hidden transition-all hover:shadow-md
                        ${isExpiring ? "border-red-200 hover:border-red-300" : "border-gray-100 hover:border-blue-200"}`}>
                        {/* Status bar */}
                        <div className={`w-1.5 shrink-0 ${statusBar}`} />
                        <div className="flex flex-1 items-center gap-4 px-4 py-4 min-w-0 bg-white">
                          {/* Avatar */}
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-lg
                            ${org.status === "active" ? "bg-emerald-100 text-emerald-700" : org.status === "trial" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                            {(org.name || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-black text-gray-900 text-sm">{org.name}</h3>
                              <Badge className={`text-[10px] font-black border ${STATUS_COLOR[org.status]}`}>{STATUS_LABEL[org.status]}</Badge>
                              <Badge variant="outline" className="text-[10px] font-bold border-gray-200 text-gray-500 bg-gray-50">{PLAN_LABEL[org.plan] || org.plan}</Badge>
                              {isExpiring && (
                                <Badge className="text-[10px] font-black bg-red-100 text-red-700 border border-red-200">
                                  <AlertCircle className="w-2.5 h-2.5 mr-1" /> Vence em {daysLeft}d
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium truncate">{org.owner_name} • {org.owner_email}</p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="text-sm font-black text-emerald-600">R$ {(org.monthly_price || 0).toLocaleString("pt-BR")}/mês</span>
                              <span className="text-xs text-gray-400 font-semibold">{orgUsers} usuário{orgUsers !== 1 ? "s" : ""}</span>
                              <span className="text-xs text-gray-400 font-semibold">{orgLeads} lead{orgLeads !== 1 ? "s" : ""}</span>
                              {org.subscription_ends_at && (
                                <span className={`text-xs font-semibold flex items-center gap-1 ${isExpiring ? "text-red-500" : "text-gray-400"}`}>
                                  <Calendar className="w-3 h-3" /> {moment(org.subscription_ends_at).format("DD/MM/YYYY")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <PlanManager organization={org} onChangePlan={handleChangePlan} onRenew={handleRenew} coupons={coupons} />
                            <Button variant="outline" size="sm" className="border-2 border-gray-200 hover:border-blue-300 rounded-xl" onClick={() => { setEditingOrg(org); setShowOrgForm(true); }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="border-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 rounded-xl" onClick={() => setConfirmDeleteOrg(org)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Usuários ─────────────────────────────────────────────────────── */}
          <TabsContent value="users">
            <Card className="bg-white border-2 border-gray-100 shadow-md rounded-2xl overflow-hidden">
              <CardHeader className="border-b-2 border-gray-100 pb-4 bg-gray-50/60">
                <CardTitle className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  {allUsers.filter(u => u.role !== "super_admin").length} Usuários no Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-4">
                <div className="space-y-2.5">
                  {allUsers.filter(u => u.role !== "super_admin").length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="font-semibold">Nenhum usuário cadastrado</p>
                    </div>
                  )}
                  {allUsers.filter(u => u.role !== "super_admin").map((u) => {
                    const org = organizations.find(o => o.id === u.organization_id);
                    return (
                      <div key={u.id} className="flex items-center justify-between p-3.5 border-2 border-gray-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/20 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-black">
                            {u.full_name?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm">{u.full_name}</p>
                            <p className="text-xs text-gray-400 font-medium">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs font-black border-2 px-2.5 py-1 ${u.role === "admin" ? "border-blue-200 text-blue-700 bg-blue-50" : "border-gray-200 text-gray-500 bg-gray-50"}`}>
                            {u.role === "admin" ? "Admin" : "Usuário"}
                          </Badge>
                          {org && (
                            <span className="text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg">{org.name}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Faturamento ──────────────────────────────────────────────────── */}
          <TabsContent value="billing">
            <FinanceiroDashboard
              billings={billings}
              organizations={organizations}
              onCreateBilling={(data) => createBillingMutation.mutate(data)}
              onUpdateBilling={handleFinanceiroAction}
            />
          </TabsContent>

          {/* ── Cupons ───────────────────────────────────────────────────────── */}
          <TabsContent value="coupons">
            <CouponManager
              coupons={coupons}
              onCreateCoupon={(data) => createCouponMutation.mutate(data)}
              onUpdateCoupon={(id, data) => updateCouponMutation.mutate({ id, data })}
            />
          </TabsContent>

          {/* ── Relatório Inteligente ────────────────────────────────────────── */}
          <TabsContent value="intelligent">
            <RelatorioInteligenteAdmin
              organizations={organizations}
              allUsers={allUsers}
              leads={leads}
              contracts={contracts}
              billings={billings}
            />
          </TabsContent>

          {/* ── Relatórios BI ────────────────────────────────────────────────── */}
          <TabsContent value="reports">
            <RelatoriosBI
              organizations={organizations}
              allUsers={allUsers}
              leads={leads}
              contracts={contracts}
              billings={billings}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Modal de confirmação de exclusão ──────────────────────────────── */}
      <Dialog open={!!confirmDeleteOrg} onOpenChange={() => setConfirmDeleteOrg(null)}>
        <DialogContent className="w-[95vw] max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" /> Excluir Organização
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm font-black text-gray-900">{confirmDeleteOrg?.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{confirmDeleteOrg?.owner_email}</p>
            </div>
            <p className="text-sm text-gray-600 font-medium">
              Esta ação é <span className="font-black text-red-600">irreversível</span>. Todos os dados da organização serão removidos permanentemente.
            </p>
            <p className="text-xs text-gray-400">
              Usuários, leads e contratos vinculados a esta organização não serão excluídos automaticamente.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-2" onClick={() => setConfirmDeleteOrg(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2"
              disabled={deleteOrgMutation.isPending}
              onClick={() => deleteOrgMutation.mutate(confirmDeleteOrg.id)}
            >
              <Trash2 className="w-4 h-4" />
              {deleteOrgMutation.isPending ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrgForm
        open={showOrgForm}
        onClose={() => { setShowOrgForm(false); setEditingOrg(null); }}
        onSave={(data) => {
          if (editingOrg) updateOrgMutation.mutate({ id: editingOrg.id, data });
          else createOrgMutation.mutate(data);
        }}
        initialData={editingOrg}
        isSaving={createOrgMutation.isPending || updateOrgMutation.isPending}
      />
    </div>
  );
}

// ─── Formulário de Organização ────────────────────────────────────────────────
function OrgForm({ open, onClose, onSave, initialData, isSaving = false }) {
  const [form, setForm] = useState(
    initialData || { name: "", cnpj: "", owner_name: "", owner_email: "", phone: "", status: "trial", plan: "basic", max_users: 3, monthly_price: 0, notes: "" }
  );
  React.useEffect(() => {
    if (initialData) setForm(initialData);
    else setForm({ name: "", cnpj: "", owner_name: "", owner_email: "", phone: "", status: "trial", plan: "basic", max_users: 3, monthly_price: 0, notes: "" });
  }, [initialData, open]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black">{initialData ? "Editar Organização" : "Nova Organização"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2 space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Nome da Empresa *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">CNPJ</Label>
            <Input value={form.cnpj} onChange={e => set("cnpj", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Telefone</Label>
            <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Nome do Responsável *</Label>
            <Input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">E-mail do Responsável *</Label>
            <Input value={form.owner_email} onChange={e => set("owner_email", e.target.value)} type="email" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Plano</Label>
            <Select value={form.plan} onValueChange={v => set("plan", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Básico — R$ 97/mês (3 usuários)</SelectItem>
                <SelectItem value="professional">Profissional — R$ 197/mês (10 usuários)</SelectItem>
                <SelectItem value="enterprise">Enterprise — R$ 497/mês (50 usuários)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Valor Mensal (R$)</Label>
            <Input type="number" value={form.monthly_price} onChange={e => set("monthly_price", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Máximo de Usuários</Label>
            <Input type="number" value={form.max_users} onChange={e => set("max_users", Number(e.target.value))} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Observações</Label>
            <Input value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name || !form.owner_email || isSaving} className="bg-blue-600 hover:bg-blue-700 font-bold">
            {isSaving ? "Salvando..." : initialData ? "Atualizar" : "Criar Organização"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
