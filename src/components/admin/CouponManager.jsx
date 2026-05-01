import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Tag } from "lucide-react";
import moment from "moment";

const STATUS_COLOR = {
  active:   "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-700",
  expired:  "bg-red-100 text-red-700",
};
const STATUS_LABEL = { active: "Ativo", inactive: "Inativo", expired: "Expirado" };

export default function CouponManager({ coupons, onCreateCoupon, onUpdateCoupon }) {
  const [showForm, setShowForm]     = useState(false);
  const [editingCoupon, setEditing] = useState(null);

  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
              <Tag className="w-4 h-4" /> Cupons de Desconto
            </CardTitle>
            <Button size="sm" onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 font-bold text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Cupom
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {coupons.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Tag className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="font-semibold">Nenhum cupom criado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {coupons.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-1 self-stretch rounded-full shrink-0 ${c.status === "active" ? "bg-emerald-500" : c.status === "expired" ? "bg-red-500" : "bg-gray-400"}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-blue-700 tracking-wider text-sm">{c.code}</span>
                        <Badge className={`text-[10px] font-bold ${STATUS_COLOR[c.status]}`}>{STATUS_LABEL[c.status] || c.status}</Badge>
                        <span className="text-sm font-black text-gray-700">
                          {c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `R$ ${c.discount_value} OFF`}
                        </span>
                      </div>
                      {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 font-medium">
                        <span>Usos: <strong className="text-gray-700">{c.used_count || 0}/{c.max_uses || "∞"}</strong></span>
                        {c.valid_until && <span>Válido até <strong className="text-gray-700">{moment(c.valid_until).format("DD/MM/YYYY")}</strong></span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(c); setShowForm(true); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CouponForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={(data) => {
          if (editingCoupon) onUpdateCoupon(editingCoupon.id, data);
          else onCreateCoupon(data);
          setShowForm(false);
          setEditing(null);
        }}
        initialData={editingCoupon}
      />
    </>
  );
}

function CouponForm({ open, onClose, onSave, initialData }) {
  const [form, setForm] = useState(initialData || {
    code: "", description: "", discount_type: "percentage", discount_value: 0,
    max_uses: null, valid_from: "", valid_until: "", status: "active",
  });
  React.useEffect(() => { if (initialData) setForm(initialData); }, [initialData]);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-black">{initialData ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <div className="sm:col-span-2 space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Código *</Label>
            <Input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="PROMO2026" className="font-black tracking-wider" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Descrição</Label>
            <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Promoção de lançamento" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Tipo de Desconto *</Label>
            <Select value={form.discount_type} onValueChange={v => set("discount_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">
              Valor {form.discount_type === "percentage" ? "(%)" : "(R$)"} *
            </Label>
            <Input type="number" value={form.discount_value} onChange={e => set("discount_value", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Máximo de Usos</Label>
            <Input type="number" value={form.max_uses || ""} onChange={e => set("max_uses", e.target.value ? Number(e.target.value) : null)} placeholder="Ilimitado" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Válido de</Label>
            <Input type="date" value={form.valid_from} onChange={e => set("valid_from", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-xs uppercase tracking-wide text-gray-600">Válido até</Label>
            <Input type="date" value={form.valid_until} onChange={e => set("valid_until", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.code || !form.discount_value} className="bg-blue-600 hover:bg-blue-700 font-bold">
            Salvar Cupom
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
