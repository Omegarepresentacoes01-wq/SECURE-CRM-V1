import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CheckCircle } from "lucide-react";

export default function OnboardingWizard({ user, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    cnpj: "",
    phone: "",
    plan: "basic",
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    setLoading(true);
    try {
      const org = await base44.entities.Organization.create({
        name: form.name,
        cnpj: form.cnpj,
        owner_name: user.full_name,
        owner_email: user.email,
        phone: form.phone,
        status: "trial",
        plan: form.plan,
        max_users: form.plan === "basic" ? 3 : form.plan === "professional" ? 10 : 50,
        monthly_price: form.plan === "basic" ? 97 : form.plan === "professional" ? 197 : 497,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });

      await base44.auth.updateMe({
        organization_id: org.id,
        role: "admin",
      });

      setDone(true);
      setTimeout(() => onComplete(), 2000);
    } catch (error) {
      console.error("Erro ao criar organização:", error);
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-12">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tudo Pronto!</h2>
            <p className="text-gray-600">Sua conta foi criada com sucesso. Redirecionando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao SecureCRM</CardTitle>
          <p className="text-gray-600 mt-2">Configure sua organização para começar</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Empresa *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Minha Empresa de Segurança"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plano *</Label>
              <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">
                    <div className="py-1">
                      <div className="font-semibold">Básico — R$ 97/mês</div>
                      <div className="text-xs text-gray-500">Até 3 usuários</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="professional">
                    <div className="py-1">
                      <div className="font-semibold">Profissional — R$ 197/mês</div>
                      <div className="text-xs text-gray-500">Até 10 usuários</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <div className="py-1">
                      <div className="font-semibold">Enterprise — R$ 497/mês</div>
                      <div className="text-xs text-gray-500">Até 50 usuários</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>14 dias de trial grátis</strong>
              <br />
              Experimente todas as funcionalidades sem compromisso
            </p>
          </div>

          <Button
            onClick={handleCreate}
            disabled={loading || !form.name}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
          >
            {loading ? "Criando..." : "Criar Conta"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
