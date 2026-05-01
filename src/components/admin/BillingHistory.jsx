import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, CreditCard } from "lucide-react";
import moment from "moment";

const STATUS_COLOR = {
  paid:     "bg-emerald-100 text-emerald-700",
  pending:  "bg-amber-100 text-amber-700",
  failed:   "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-700",
};
const STATUS_LABEL = { paid: "Pago", pending: "Pendente", failed: "Falhou", refunded: "Estornado" };
const TYPE_LABEL   = { subscription: "Assinatura", upgrade: "Upgrade", downgrade: "Downgrade", renewal: "Renovação", trial_conversion: "Conversão Trial" };

export default function BillingHistory({ billings, organizationName }) {
  const sorted = [...billings].sort((a, b) => new Date(b.billing_date) - new Date(a.billing_date));

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-3">
        <CardTitle className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
          <DollarSign className="w-4 h-4" />
          Histórico de Faturamento
          {organizationName && <span className="text-gray-400 font-semibold normal-case">— {organizationName}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {sorted.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="font-semibold">Nenhum registro de faturamento</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-1 self-stretch rounded-full shrink-0 ${b.status === "paid" ? "bg-emerald-500" : b.status === "pending" ? "bg-amber-400" : "bg-red-500"}`} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-[10px] font-bold ${STATUS_COLOR[b.status]}`}>{STATUS_LABEL[b.status] || b.status}</Badge>
                      <span className="text-sm font-black text-gray-800">{TYPE_LABEL[b.type] || b.type}</span>
                      {b.plan && <span className="text-xs font-semibold text-gray-500 capitalize">{b.plan}</span>}
                      {b.organization_name && <span className="text-xs font-bold text-indigo-600">{b.organization_name}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-gray-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {moment(b.billing_date).format("DD/MM/YYYY")}
                      </span>
                      {b.payment_method && (
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> {b.payment_method}
                        </span>
                      )}
                      {b.coupon_code && (
                        <Badge variant="outline" className="text-[10px] font-bold border-purple-300 text-purple-600">
                          Cupom: {b.coupon_code}
                        </Badge>
                      )}
                      {b.period_start && b.period_end && (
                        <span>{moment(b.period_start).format("DD/MM")} → {moment(b.period_end).format("DD/MM/YY")}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  {b.discount > 0 && (
                    <p className="text-xs text-gray-400 line-through">R$ {(b.amount || 0).toLocaleString("pt-BR")}</p>
                  )}
                  <p className="text-xl font-black text-gray-900">
                    R$ {(b.final_amount || 0).toLocaleString("pt-BR")}
                  </p>
                  {b.discount > 0 && (
                    <p className="text-xs font-bold text-emerald-600">-R$ {b.discount.toLocaleString("pt-BR")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
