import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "./utils";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import OnboardingWizard from "@/components/OnboardingWizard";
import {
  LayoutDashboard, Users, Kanban, FileText, DollarSign, HeadphonesIcon,
  MapPin, Menu, X, ChevronDown, LogOut, Bell,
  AlertTriangle, Clock, Phone, CreditCard, FileWarning, Sun, Moon, BarChart2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";

const crmNavItems = [
  { name: "Dashboard",  page: "Dashboard",  icon: LayoutDashboard },
  { name: "Pipeline",   page: "Pipeline",   icon: Kanban },
  { name: "Leads",      page: "Leads",      icon: Users },
  { name: "Contratos",  page: "Contracts",  icon: FileText },
  { name: "Financeiro", page: "Financial",  icon: DollarSign },
  { name: "Pós-Venda",  page: "PostSale",   icon: HeadphonesIcon },
  { name: "Relatórios", page: "Reports",    icon: BarChart2 },
  { name: "Mapa",       page: "Map",        icon: MapPin },
];

const NOTIF_ICON = {
  overdue_payment:   { icon: CreditCard,  color: "text-red-400",    bg: "bg-red-900/40",    border: "border-l-red-500" },
  late_activity:     { icon: Clock,       color: "text-orange-400", bg: "bg-orange-900/40", border: "border-l-orange-500" },
  lead_no_contact:   { icon: Phone,       color: "text-amber-400",  bg: "bg-amber-900/40",  border: "border-l-amber-500" },
  contract_expiring: { icon: FileWarning, color: "text-blue-400",   bg: "bg-blue-900/40",   border: "border-l-blue-500" },
};

const NOTIF_TYPE_LABEL = {
  overdue_payment:   "Cobrança Atrasada",
  late_activity:     "Atividade Atrasada",
  lead_no_contact:   "Lead Sem Contato",
  contract_expiring: "Contrato Vencendo",
};

function NotificationPanel({ onClose }) {
  const { notifications, count, highPriority } = useNotifications();
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleClick = (link) => { navigate(link); onClose(); };

  const groups = {};
  notifications.forEach(n => {
    if (!groups[n.type]) groups[n.type] = [];
    groups[n.type].push(n);
  });

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-screen max-w-sm sm:w-96 bg-white border-2 border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-700" />
          <span className="text-sm font-black text-gray-900">Notificações</span>
          {count > 0 && (
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${highPriority > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
              {count}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-[480px] overflow-y-auto">
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Bell className="w-10 h-10 mb-2 opacity-20" />
            <p className="font-semibold text-sm">Nenhuma notificação</p>
            <p className="text-xs mt-0.5">Tudo em dia!</p>
          </div>
        ) : (
          Object.entries(groups).map(([type, items]) => {
            const cfg = NOTIF_ICON[type] || { icon: AlertTriangle, color: "text-gray-500", bg: "bg-gray-50", border: "border-l-gray-400" };
            const Icon = cfg.icon;
            return (
              <div key={type}>
                <div className="px-4 py-2 bg-gray-50/70 border-b-2 border-gray-100">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{NOTIF_TYPE_LABEL[type]}</span>
                  <span className="ml-2 text-[10px] font-bold text-gray-400">({items.length})</span>
                </div>
                {items.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n.link)}
                    className={`w-full flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors border-l-4 ${cfg.border} text-left`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 leading-tight">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.description}</p>
                    </div>
                    {n.priority === "high" && (
                      <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full shrink-0 mt-0.5">URGENTE</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>

      {count > 0 && (
        <div className="px-4 py-2.5 border-t-2 border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 font-bold text-center">{count} item{count !== 1 ? "s" : ""} requer{count === 1 ? "" : "em"} atenção</p>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifs, setShowNotifs]   = useState(false);
  const { user, logout } = useAuth();
  const { count, highPriority } = useNotifications();
  const { theme, setTheme } = useTheme();

  if (user && !user.organization_id) {
    return <OnboardingWizard user={user} onComplete={() => window.location.reload()} />;
  }

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────── */}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 w-64 h-full bg-gradient-to-b from-[#0891b2] via-[#0e7490] to-[#164e63] border-r-2 border-white/10 transform transition-transform duration-300 ease-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col shadow-2xl shrink-0`}>

        {/* Logo */}
        <div className="h-20 flex items-center pl-4 pr-2 border-b border-white/10">
          <div className="flex-1 min-w-0 select-none">
            <p
              className="text-[20px] font-black italic leading-none tracking-tight drop-shadow-md whitespace-nowrap"
              style={{ fontFamily: "'Arial Black', 'Franklin Gothic Heavy', Impact, sans-serif" }}
            >
              <span className="text-white">SECURE-</span><span className="text-cyan-300">CRM</span>
            </p>
            <p className="text-[10px] font-bold text-white/50 tracking-[0.2em] uppercase mt-1.5">
              Sistema de Gestão
            </p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-2 lg:hidden text-white/60 hover:text-white shrink-0 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-5 px-3 space-y-1.5 overflow-y-auto">
          {crmNavItems.filter(item => {
            if (user?.role === "user" && item.page === "PostSale") return false;
            return true;
          }).map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200
                  ${isActive
                    ? "bg-white text-cyan-800 shadow-lg shadow-black/20"
                    : "text-white hover:bg-white/15"}`}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-cyan-700" : "text-white"}`} />
                <span className={isActive ? "font-black" : "font-bold"}>{item.name}</span>
                {isActive && <span className="ml-auto w-2 h-2 rounded-full bg-cyan-500" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        {user && (
          <div className="p-3 border-t border-white/10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/15 transition-colors group">
                  <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-sm font-black shadow-md shrink-0">
                    {user.full_name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-black text-white truncate">{user.full_name || "Usuário"}</p>
                    <p className="text-xs text-white/70 font-semibold capitalize">{user.role || "user"}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/60 group-hover:text-white shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-2 border-gray-200 shadow-xl">
                <DropdownMenuItem onClick={() => logout()} className="font-bold text-red-600 focus:text-red-700 focus:bg-red-50">
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      {/* ── Main content ──────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-16 bg-white border-b-2 border-gray-300 flex items-center px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-3 p-2 rounded-xl hover:bg-gray-100 text-gray-600 border-2 border-gray-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="mr-2 p-2.5 rounded-xl transition-colors border-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-gray-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 dark:border-slate-600"
            title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(v => !v)}
              className={`relative p-2.5 rounded-xl transition-colors border-2 font-bold
                ${showNotifs
                  ? "bg-blue-50 text-blue-700 border-blue-300"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-gray-200"}`}
            >
              <Bell className="w-5 h-5" />
              {count > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white border-2 border-white shadow ${highPriority > 0 ? "bg-red-500" : "bg-amber-500"}`}>
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </button>
            {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
