import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import {
  Users, FileText, DollarSign, TrendingUp, AlertTriangle, Clock,
  BellRing, ChevronRight, CreditCard, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "../components/dashboard/StatsCard";
import FunnelChart from "../components/dashboard/FunnelChart";
import RevenueChart from "../components/dashboard/RevenueChart";
import RecentLeads from "../components/dashboard/RecentLeads";
import UpcomingActivities from "../components/dashboard/UpcomingActivities";
import { useNotifications } from "../hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import moment from "moment";

const NOTIF_STYLE = {
  overdue_payment:   { border: "border-l-red-500",    icon: "bg-red-100",    iconText: "text-red-600",    tag: "bg-red-50 text-red-700" },
  late_activity:     { border: "border-l-orange-500", icon: "bg-orange-100", iconText: "text-orange-600", tag: "bg-orange-50 text-orange-700" },
  lead_no_contact:   { border: "border-l-amber-500",  icon: "bg-amber-100",  iconText: "text-amber-600",  tag: "bg-amber-50 text-amber-700" },
  contract_expiring: { border: "border-l-purple-500", icon: "bg-purple-100", iconText: "text-purple-600", tag: "bg-purple-50 text-purple-700" },
};
const NOTIF_ICON = {
  overdue_payment:   CreditCard,
  late_activity:     Clock,
  lead_no_contact:   Users,
  contract_expiring: Calendar,
};
const NOTIF_TYPE_LABEL = {
  overdue_payment: "Cobrança", late_activity: "Atividade",
  lead_no_contact: "Lead", contract_expiring: "Contrato",
};

function AlertsPanel({ notifications }) {
  const navigate = useNavigate();
  const shown = notifications.slice(0, 6);

  return (
    <Card className="bg-white border border-gray-200 border-l-4 border-l-red-500 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
            <BellRing className="w-4 h-4 text-red-500" />
            Alertas e Ações Urgentes
            {notifications.length > 0 && (
              <span className="ml-1 text-[10px] font-black bg-red-500 text-white rounded-full px-1.5 py-0.5">
                {notifications.length}
              </span>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {shown.length === 0 ? (
          <div className="text-center py-8">
            <BellRing className="w-8 h-8 mx-auto text-gray-200 mb-2" />
            <p className="text-sm font-semibold text-gray-400">Nenhum alerta no momento</p>
          </div>
        ) : (
          <div className="space-y-1">
            {shown.map((n) => {
              const s = NOTIF_STYLE[n.type] || NOTIF_STYLE.late_activity;
              const Icon = NOTIF_ICON[n.type] || BellRing;
              return (
                <button
                  key={n.id}
                  onClick={() => navigate(n.link)}
                  className={`w-full text-left flex items-center gap-3 py-2.5 px-3 border-l-4 ${s.border} bg-gray-50/50 hover:bg-gray-100/70 rounded-r-lg transition-colors`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.icon}`}>
                    <Icon className={`w-3.5 h-3.5 ${s.iconText}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-gray-900 truncate">{n.title}</p>
                    <p className="text-[10px] text-gray-400 font-medium truncate">{n.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {n.priority === "high" && (
                      <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded">URGENTE</span>
                    )}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.tag}`}>
                      {NOTIF_TYPE_LABEL[n.type]}
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                  </div>
                </button>
              );
            })}
            {notifications.length > 6 && (
              <p className="text-center text-xs font-bold text-gray-400 pt-2">
                +{notifications.length - 6} alertas adicionais
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const { data: leads = [] } = useQuery({
    queryKey: ["leads", orgId],
    queryFn: () => base44.entities.Lead.filter({ organization_id: orgId }, "-created_date", 500),
    enabled: !!orgId,
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", orgId],
    queryFn: () => base44.entities.Contract.filter({ organization_id: orgId }, "-created_date", 500),
    enabled: !!orgId,
  });
  const { data: financials = [] } = useQuery({
    queryKey: ["financials", orgId],
    queryFn: () => base44.entities.Financial.filter({ organization_id: orgId }, "-due_date", 500),
    enabled: !!orgId,
  });
  const { data: activities = [] } = useQuery({
    queryKey: ["activities", orgId],
    queryFn: () => base44.entities.Activity.filter({ organization_id: orgId }, "-scheduled_date", 500),
    enabled: !!orgId,
  });

  const { notifications } = useNotifications();

  const activeContracts = contracts.filter((c) => c.status === "active");
  const mrr = activeContracts.reduce((sum, c) => sum + (c.monthly_value || 0), 0);
  const overduePayments = financials.filter(
    (f) => f.status !== "paid" && f.status !== "cancelled" && f.due_date && moment(f.due_date).isBefore(moment(), "day")
  );
  const pendingFollowUps = activities.filter(
    (a) => !a.completed && a.scheduled_date && moment(a.scheduled_date).isBefore(moment())
  );
  const conversionRate =
    leads.length > 0
      ? ((leads.filter((l) => l.status === "won").length / leads.length) * 100).toFixed(1)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">
          Visão geral do seu CRM · {moment().format("DD [de] MMMM [de] YYYY")}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatsCard title="Leads" value={leads.length} icon={Users} color="blue" subtitle={`${leads.filter(l => l.status === "won").length} ganhos`} />
        <StatsCard title="Contratos" value={activeContracts.length} icon={FileText} color="green" subtitle="ativos" />
        <StatsCard
          title="MRR"
          value={`R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
          icon={DollarSign}
          color="indigo"
          subtitle="receita mensal recorrente"
        />
        <StatsCard title="Conversão" value={`${conversionRate}%`} icon={TrendingUp} color="purple" subtitle="leads → ganhos" />
        <StatsCard
          title="Inadimplentes"
          value={overduePayments.length}
          icon={AlertTriangle}
          color="red"
          subtitle="cobranças atrasadas"
        />
        <StatsCard
          title="Follow-ups"
          value={pendingFollowUps.length}
          icon={Clock}
          color="orange"
          subtitle="atividades atrasadas"
        />
      </div>

      {/* Alerts + Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-1">
          <AlertsPanel notifications={notifications} />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <FunnelChart leads={leads} />
          <RevenueChart financials={financials} />
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <RecentLeads leads={leads} />
        <UpcomingActivities activities={activities} />
      </div>
    </div>
  );
}
