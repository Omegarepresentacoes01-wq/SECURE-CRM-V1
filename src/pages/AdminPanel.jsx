import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, DollarSign, TrendingUp, Plus, Edit, Ban } from "lucide-react";
import BillingHistory from "@/components/admin/BillingHistory";
import CouponManager from "@/components/admin/CouponManager";
import PlanManager from "@/components/admin/PlanManager";
import moment from "moment";

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.Organization.list("-created_date"),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all_users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["all_leads"],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["all_contracts"],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: billings = [] } = useQuery({
    queryKey: ["billings"],
    queryFn: () => base44.entities.Billing.list("-billing_date"),
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => base44.entities.Coupon.list(),
  });

  const createOrgMutation = useMutation({
    mutationFn: (data) => base44.entities.Organization.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["organizations"]);
      setShowOrgForm(false);
      setEditingOrg(null);
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Organization.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["organizations"]);
      setShowOrgForm(false);
      setEditingOrg(null);
    },
  });

  const createBillingMutation = useMutation({
    mutationFn: (data) => base44.entities.Billing.create(data),
    onSuccess: () => queryClient.invalidateQueries(["billings"]),
  });

  const createCouponMutation = useMutation({
    mutationFn: (data) => base44.entities.Coupon.create(data),
    onSuccess: () => queryClient.invalidateQueries(["coupons"]),
  });

  const updateCouponMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coupon.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(["coupons"]),
  });

  const handleChangePlan = async (orgId, orgData, billingData) => {
    await updateOrgMutation.mutateAsync({ id: orgId, data: orgData });
    
    const org = organizations.find((o) => o.id === orgId);
    await createBillingMutation.mutateAsync({
      organization_id: orgId,
      organization_name: org.name,
      type: billingData.type,
      plan: orgData.plan,
      amount: orgData.monthly_price,
      discount: billingData.discount || 0,
      coupon_code: billingData.couponCode,
      final_amount: orgData.monthly_price - (billingData.discount || 0),
      billing_date: new Date().toISOString().split("T")[0],
      period_start: orgData.subscription_starts_at,
      period_end: orgData.subscription_ends_at,
      status: "paid",
      payment_method: billingData.paymentMethod,
    });

    if (billingData.couponCode) {
      const coupon = coupons.find((c) => c.code === billingData.couponCode);
      if (coupon) {
        await updateCouponMutation.mutateAsync({
          id: coupon.id,
          data: { used_count: (coupon.used_count || 0) + 1 },
        });
      }
    }
  };

  const handleRenew = async (orgId, orgData, billingData) => {
    await updateOrgMutation.mutateAsync({ id: orgId, data: orgData });
    
    const org = organizations.find((o) => o.id === orgId);
    await createBillingMutation.mutateAsync({
      organization_id: orgId,
      organization_name: org.name,
      type: "renewal",
      plan: org.plan,
      amount: org.monthly_price,
      discount: billingData.discount || 0,
      coupon_code: billingData.couponCode,
      final_amount: org.monthly_price - (billingData.discount || 0),
      billing_date: new Date().toISOString().split("T")[0],
      period_start: orgData.subscription_starts_at,
      period_end: orgData.subscription_ends_at,
      status: "paid",
      payment_method: billingData.paymentMethod,
    });

    if (billingData.couponCode) {
      const coupon = coupons.find((c) => c.code === billingData.couponCode);
      if (coupon) {
        await updateCouponMutation.mutateAsync({
          id: coupon.id,
          data: { used_count: (coupon.used_count || 0) + 1 },
        });
      }
    }
  };

  if (user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Ban className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Acesso Negado</h2>
          <p className="text-gray-600 mt-2">Apenas super admins podem acessar este painel.</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: organizations.length,
    active: organizations.filter((o) => o.status === "active").length,
    trial: organizations.filter((o) => o.status === "trial").length,
    mrr: organizations
      .filter((o) => o.status === "active")
      .reduce((sum, o) => sum + (o.monthly_price || 0), 0),
    totalUsers: allUsers.length,
    totalLeads: leads.length,
    totalContracts: contracts.filter(c => c.status === "active").length,
  };

  const statusColors = {
    trial: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    suspended: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const planLabels = {
    basic: "Básico",
    professional: "Profissional",
    enterprise: "Enterprise",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-gray-600 mt-1">Gerencie organizações e assinaturas do SaaS</p>
        </div>
        <Button onClick={() => setShowOrgForm(true)} className="bg-blue-600 hover:bg-blue-700 shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nova Organização
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Total de Organizações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.active} ativas • {stats.trial} trial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">
              R$ {stats.mrr.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-gray-500 mt-1">Receita recorrente mensal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Total de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
            <p className="text-xs text-gray-500 mt-1">Todos os usuários do sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Leads & Contratos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{stats.totalLeads}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalContracts} contratos ativos
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations">Organizações</TabsTrigger>
          <TabsTrigger value="billing">Faturamento</TabsTrigger>
          <TabsTrigger value="coupons">Cupons</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Organizações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{org.name}</h3>
                        <Badge className={statusColors[org.status]}>{org.status}</Badge>
                        <Badge variant="outline">{planLabels[org.plan]}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {org.owner_name} • {org.owner_email}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-sm text-gray-500">
                          R$ {org.monthly_price}/mês • {allUsers.filter((u) => u.organization_id === org.id).length} usuários
                        </p>
                        {org.subscription_ends_at && (
                          <p className="text-xs text-gray-500">
                            Vence em: {moment(org.subscription_ends_at).format("DD/MM/YYYY")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PlanManager 
                        organization={org} 
                        onChangePlan={handleChangePlan}
                        onRenew={handleRenew}
                        coupons={coupons}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingOrg(org);
                          setShowOrgForm(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <BillingHistory billings={billings} />
        </TabsContent>

        <TabsContent value="coupons">
          <CouponManager 
            coupons={coupons}
            onCreateCoupon={(data) => createCouponMutation.mutate(data)}
            onUpdateCoupon={(id, data) => updateCouponMutation.mutate({ id, data })}
          />
        </TabsContent>
      </Tabs>

      <OrgForm
        open={showOrgForm}
        onClose={() => {
          setShowOrgForm(false);
          setEditingOrg(null);
        }}
        onSave={(data) => {
          if (editingOrg) {
            updateOrgMutation.mutate({ id: editingOrg.id, data });
          } else {
            createOrgMutation.mutate(data);
          }
        }}
        initialData={editingOrg}
      />
    </div>
  );
}

function OrgForm({ open, onClose, onSave, initialData }) {
  const [form, setForm] = useState(
    initialData || {
      name: "",
      cnpj: "",
      owner_name: "",
      owner_email: "",
      phone: "",
      status: "trial",
      plan: "basic",
      max_users: 3,
      monthly_price: 0,
      notes: "",
    }
  );

  React.useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[88vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Organização" : "Nova Organização"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <div className="sm:col-span-2 space-y-2">
            <Label>Nome da Empresa *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nome do Proprietário *</Label>
            <Input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email do Proprietário *</Label>
            <Input value={form.owner_email} onChange={(e) => set("owner_email", e.target.value)} type="email" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
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
            <Label>Plano</Label>
            <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="professional">Profissional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor Mensal (R$)</Label>
            <Input type="number" value={form.monthly_price} onChange={(e) => set("monthly_price", Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Máximo de Usuários</Label>
            <Input type="number" value={form.max_users} onChange={(e) => set("max_users", Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Observações</Label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name || !form.owner_email}>
            {initialData ? "Atualizar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}