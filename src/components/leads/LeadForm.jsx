import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { MapPin, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const defaults = {
  name: "", company: "", cpf_cnpj: "", phone: "", whatsapp: "", email: "",
  address: "", neighborhood: "", city: "", state: "", zip_code: "",
  property_type: "residential", property_subtype: "house", origin: "website",
  business_type: "monitoring_comodato", estimated_value: "", monthly_value: "",
  temperature: "cold", urgency: "medium", has_current_system: false,
  current_competitor: "", had_invasion_attempt: false, notes: "",
};

export default function LeadForm({ open, onClose, onSave, initialData }) {
  const [form, setForm] = useState(initialData || defaults);
  const [saving, setSaving] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [geoStatus, setGeoStatus] = useState(null); // null | 'found' | 'notfound' | 'error'

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // ── geocodifica usando Nominatim com fallbacks progressivos
  const geocodeAddress = async (parts) => {
    for (let i = 0; i < parts.length; i++) {
      const query = parts.slice(i).join(", ");
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`,
          { headers: { "Accept-Language": "pt-BR,pt;q=0.9" } }
        );
        const data = await res.json();
        if (data.length > 0) {
          return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
      } catch (_) { /* tenta próximo fallback */ }
    }
    return null;
  };

  // ── busca pelo CEP (viaCEP + geocoding)
  const fetchAddressFromCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    setLoadingAddress(true);
    setGeoStatus(null);
    try {
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const d = await viaCepRes.json();
      if (d.erro) { setLoadingAddress(false); return; }

      setForm((p) => ({
        ...p,
        address:      d.logradouro  || p.address,
        neighborhood: d.bairro      || p.neighborhood,
        city:         d.localidade  || p.city,
        state:        d.uf          || p.state,
      }));

      // tenta geocodificar com fallbacks progressivos
      const coords = await geocodeAddress([
        [d.logradouro, d.bairro, d.localidade, d.uf, "Brasil"].filter(Boolean).join(", "),
        [d.bairro,     d.localidade, d.uf, "Brasil"].filter(Boolean).join(", "),
        [d.localidade, d.uf, "Brasil"].filter(Boolean).join(", "),
      ]);

      if (coords) {
        setForm((p) => ({ ...p, latitude: coords.lat, longitude: coords.lon }));
        setGeoStatus("found");
      } else {
        setGeoStatus("notfound");
      }
    } catch (_) {
      setGeoStatus("error");
    }
    setLoadingAddress(false);
  };

  // ── geocodificação manual pelos campos de endereço atuais
  const geocodeManual = async () => {
    const { address, neighborhood, city, state } = form;
    if (!city && !address) return;
    setLoadingAddress(true);
    setGeoStatus(null);
    const coords = await geocodeAddress([
      [address, neighborhood, city, state, "Brasil"].filter(Boolean).join(", "),
      [neighborhood, city, state, "Brasil"].filter(Boolean).join(", "),
      [city, state, "Brasil"].filter(Boolean).join(", "),
    ]);
    if (coords) {
      setForm((p) => ({ ...p, latitude: coords.lat, longitude: coords.lon }));
      setGeoStatus("found");
    } else {
      setGeoStatus("notfound");
    }
    setLoadingAddress(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined,
        monthly_value: form.monthly_value ? Number(form.monthly_value) : undefined,
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error("Erro ao salvar lead:", err);
      toast.error("Erro ao salvar lead. Verifique os dados e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[88vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-bold">{initialData ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nome *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Empresa</Label>
            <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Nome da empresa" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">CPF/CNPJ</Label>
            <Input value={form.cpf_cnpj} onChange={(e) => set("cpf_cnpj", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Telefone *</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">WhatsApp</Label>
            <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">E-mail</Label>
            <Input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" />
          </div>

          {/* ── bloco de endereço ── */}
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium">Endereço</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Rua, nº" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Bairro</Label>
            <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Cidade</Label>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Estado</Label>
            <Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="UF" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">CEP</Label>
            <Input
              value={form.zip_code}
              onChange={(e) => set("zip_code", e.target.value)}
              onBlur={(e) => fetchAddressFromCep(e.target.value)}
              placeholder="00000-000"
              disabled={loadingAddress}
            />
          </div>

          {/* ── localização no mapa ── */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-dashed border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 text-xs">
                {loadingAddress ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500"/><span className="text-blue-600">Buscando coordenadas...</span></>
                ) : geoStatus === "found" ? (
                  <><CheckCircle className="w-3.5 h-3.5 text-emerald-500"/><span className="text-emerald-600 font-medium">Localização encontrada</span>
                    <span className="text-gray-400 font-mono text-[10px]">
                      {form.latitude?.toFixed(5)}, {form.longitude?.toFixed(5)}
                    </span>
                  </>
                ) : geoStatus === "notfound" ? (
                  <><AlertCircle className="w-3.5 h-3.5 text-amber-500"/><span className="text-amber-600">Endereço não encontrado — tente informar cidade e estado</span></>
                ) : geoStatus === "error" ? (
                  <><AlertCircle className="w-3.5 h-3.5 text-red-400"/><span className="text-red-500">Erro ao buscar localização</span></>
                ) : form.latitude && form.longitude ? (
                  <><CheckCircle className="w-3.5 h-3.5 text-emerald-400"/><span className="text-gray-500">Coordenadas salvas</span>
                    <span className="text-gray-400 font-mono text-[10px]">
                      {parseFloat(form.latitude).toFixed(5)}, {parseFloat(form.longitude).toFixed(5)}
                    </span>
                  </>
                ) : (
                  <><MapPin className="w-3.5 h-3.5 text-gray-400"/><span className="text-gray-400">Sem coordenadas — preencha o CEP ou clique em Localizar</span></>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={geocodeManual}
                disabled={loadingAddress || (!form.city && !form.address)}
                className="text-xs shrink-0 gap-1.5 border-cyan-200 text-cyan-700 hover:bg-cyan-50"
              >
                {loadingAddress
                  ? <Loader2 className="w-3 h-3 animate-spin"/>
                  : <MapPin className="w-3 h-3"/>}
                Localizar
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tipo de Imóvel</Label>
            <Select value={form.property_type} onValueChange={(v) => set("property_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residencial</SelectItem>
                <SelectItem value="commercial">Comercial</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
                <SelectItem value="condominium">Condomínio</SelectItem>
                <SelectItem value="rural">Rural</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Subtipo</Label>
            <Select value={form.property_subtype} onValueChange={(v) => set("property_subtype", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="house">Casa</SelectItem>
                <SelectItem value="store">Loja</SelectItem>
                <SelectItem value="warehouse">Galpão</SelectItem>
                <SelectItem value="apartment">Apartamento</SelectItem>
                <SelectItem value="office">Escritório</SelectItem>
                <SelectItem value="factory">Fábrica</SelectItem>
                <SelectItem value="farm">Fazenda</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Origem</Label>
            <Select value={form.origin} onValueChange={(v) => set("origin", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid_traffic">Tráfego Pago</SelectItem>
                <SelectItem value="referral">Indicação</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="cold_call">Ligação Fria</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="social_media">Redes Sociais</SelectItem>
                <SelectItem value="event">Evento</SelectItem>
                <SelectItem value="partner">Parceiro</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tipo de Negócio</Label>
            <Select value={form.business_type} onValueChange={(v) => set("business_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monitoring_comodato">Monitoramento + Comodato</SelectItem>
                <SelectItem value="equipment_sale">Venda de Equipamento</SelectItem>
                <SelectItem value="monitoring_only">Só Monitoramento</SelectItem>
                <SelectItem value="project">Projeto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Valor Estimado (R$)</Label>
            <Input type="number" value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Valor Mensal (R$)</Label>
            <Input type="number" value={form.monthly_value} onChange={(e) => set("monthly_value", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Temperatura</Label>
            <Select value={form.temperature} onValueChange={(v) => set("temperature", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cold">🔵 Frio</SelectItem>
                <SelectItem value="warm">🟡 Morno</SelectItem>
                <SelectItem value="hot">🔴 Quente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Urgência</Label>
            <Select value={form.urgency} onValueChange={(v) => set("urgency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 py-2">
            <Switch checked={form.has_current_system} onCheckedChange={(v) => set("has_current_system", v)} />
            <Label className="text-xs font-medium">Possui sistema atual?</Label>
          </div>
          <div className="flex items-center gap-3 py-2">
            <Switch checked={form.had_invasion_attempt} onCheckedChange={(v) => set("had_invasion_attempt", v)} />
            <Label className="text-xs font-medium">Sofreu tentativa de invasão?</Label>
          </div>

          {form.has_current_system && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Concorrente Atual</Label>
              <Input value={form.current_competitor} onChange={(e) => set("current_competitor", e.target.value)} />
            </div>
          )}

          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium">Observações</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.phone} className="bg-blue-600 hover:bg-blue-700">
            {saving ? "Salvando..." : initialData ? "Atualizar" : "Criar Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}