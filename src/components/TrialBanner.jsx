import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import apiClient from "@/api/apiClient";
import { AlertTriangle, Lock, CreditCard, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TrialBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const { data: orgData } = useQuery({
    queryKey: ["minha-org"],
    queryFn: async () => {
      const res = await apiClient.get("/organizacoes/minha");
      return res.data.data;
    },
    enabled: !!user && user.role !== "super_admin" && !!user.organizacao_id,
    staleTime: 5 * 60 * 1000,
  });

  if (!orgData) return null;
  if (dismissed) return null;

  const { status, trial_fim, trial_dias } = orgData;

  // Conta expirada ou suspensa
  if (status === "suspenso" || status === "cancelado") {
    return (
      <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span className="text-sm font-semibold">
            Sua conta está {status === "suspended" ? "suspensa" : "cancelada"}.
            Entre em contato para reativar o acesso.
          </span>
        </div>
        <CreditCard className="w-5 h-5 shrink-0 opacity-70" />
      </div>
    );
  }

  // Trial expirado
  if (status === "trial" && trial_dias === 0) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-sm font-semibold">
            Seu período gratuito expirou. Adquira um plano para continuar usando o sistema.
          </span>
        </div>
        <Button size="sm" variant="secondary" className="text-xs shrink-0">
          Ver Planos
        </Button>
      </div>
    );
  }

  // Trial ativo com dias restantes
  if (status === "trial" && trial_dias !== null && trial_dias > 0) {
    const urgente = trial_dias <= 3;
    return (
      <div className={`px-4 py-2.5 flex items-center justify-between gap-3 ${urgente ? "bg-amber-500 text-white" : "bg-amber-50 border-b border-amber-200 text-amber-800"}`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 shrink-0 ${urgente ? "text-white" : "text-amber-500"}`} />
          <span className="text-sm font-medium">
            {urgente
              ? `⚠️ Apenas ${trial_dias} dia${trial_dias > 1 ? "s" : ""} restante${trial_dias > 1 ? "s" : ""} no período gratuito.`
              : `Período gratuito: ${trial_dias} dias restantes.`}
            {" "}Adquira um plano para não perder o acesso.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant={urgente ? "secondary" : "outline"}
            className="text-xs h-7"
          >
            Assinar Plano
          </Button>
          {!urgente && (
            <button onClick={() => setDismissed(true)} className="opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
