import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw } from "lucide-react";
import moment from "moment";

export default function PlanManager({ organization, onChangePlan, onRenew, coupons }) {
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showRenew, setShowRenew] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(organization.plan || "basic");
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [loading, setLoading] = useState(false);

  const plans = {
    basic:        { name: "Básico",       price: 97,  users: 3  },
    professional: { name: "Profissional", price: 197, users: 10 },
    enterprise:   { name: "Enterprise",   price: 497, users: 50 },
  };

  const handleChangePlan = async () => {
    setLoading(true);
    try {
      const newPrice = plans[selectedPlan].price;
      const coupon   = coupons.find((c) => c.code === couponCode && c.status === "active");

      let discount = 0;
      if (coupon) {
        discount = coupon.discount_type === "percentage"
          ? (newPrice * coupon.discount_value) / 100
          : coupon.discount_value;
      }

      const type = organization.plan === selectedPlan
        ? "renewal"
        : plans[selectedPlan].price > (plans[organization.plan]?.price ?? 0)
          ? "upgrade"
          : "downgrade";

      await onChangePlan(organization.id, {
        plan:                   selectedPlan,
        monthly_price:          newPrice,
        max_users:              plans[selectedPlan].users,
        subscription_starts_at: new Date().toISOString().split("T")[0],
        subscription_ends_at:   moment().add(1, "month").toISOString().split("T")[0],
      }, {
        type,
        discount,
        couponCode: coupon?.code,
        paymentMethod,
      });

      setShowChangePlan(false);
      setCouponCode("");
      setPaymentMethod("");
    } catch (error) {
      console.error("Erro ao mudar plano:", error);
      alert("Erro ao processar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = () => {
    const price  = organization.monthly_price;
    const coupon = coupons.find((c) => c.code === couponCode && c.status === "active");

    let discount = 0;
    if (coupon) {
      discount = coupon.discount_type === "percentage"
        ? (price * coupon.discount_value) / 100
        : coupon.discount_value;
    }

    onRenew(organization.id, {
      subscription_starts_at: organization.subscription_ends_at || new Date().toISOString().split("T")[0],
      subscription_ends_at:   moment(organization.subscription_ends_at || new Date()).add(1, "month").toISOString().split("T")[0],
      status: "active",
    }, {
      discount,
      couponCode: coupon?.code,
      paymentMethod,
    });

    setShowRenew(false);
    setCouponCode("");
    setPaymentMethod("");
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowChangePlan(true)}>
          {(plans[organization.plan]?.price ?? 0) < plans.professional.price
            ? <ArrowUpCircle className="w-4 h-4 mr-2" />
            : <ArrowDownCircle className="w-4 h-4 mr-2" />}
          Mudar Plano
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowRenew(true)}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Renovar
        </Button>
      </div>

      {/* Dialog Mudar Plano */}
      <Dialog open={showChangePlan} onOpenChange={setShowChangePlan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mudar Plano — {organization.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Novo Plano</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(plans).map(([key, plan]) => (
                    <SelectItem key={key} value={key}>
                      {plan.name} — R$ {plan.price}/mês ({plan.users} usuários)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cupom de Desconto (opcional)</Label>
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="PROMO2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Input
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="Cartão de Crédito, PIX, etc."
              />
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Valor:</strong> R$ {plans[selectedPlan]?.price ?? 0}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePlan(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleChangePlan} disabled={loading}>
              {loading ? "Processando..." : "Confirmar e Gerar Cobrança"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Renovar */}
      <Dialog open={showRenew} onOpenChange={setShowRenew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renovar Assinatura — {organization.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cupom de Desconto (opcional)</Label>
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="PROMO2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Input
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="Cartão de Crédito, PIX, etc."
              />
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Plano Atual:</strong> {plans[organization.plan]?.name ?? "—"}
                <br />
                <strong>Valor:</strong> R$ {organization.monthly_price ?? 0}
                <br />
                <strong>Período:</strong> +30 dias
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenew(false)}>Cancelar</Button>
            <Button onClick={handleRenew}>Renovar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
