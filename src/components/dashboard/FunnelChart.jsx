import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const STAGES = [
  { key: "new",         label: "Novo",        color: "#64748b" },
  { key: "contacted",   label: "Contato",     color: "#8b5cf6" },
  { key: "qualified",   label: "Qualificado", color: "#f59e0b" },
  { key: "proposal",    label: "Proposta",    color: "#06b6d4" },
  { key: "negotiation", label: "Negociação",  color: "#f97316" },
  { key: "won",         label: "Ganhos",      color: "#10b981" },
];

const CustomTooltip = ({ active = false, payload = [] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-black text-gray-800 mb-1">{d.name}</p>
      <p className="font-bold" style={{ color: d.color }}>{d.count} leads</p>
      {d.rate != null && <p className="text-gray-500 mt-0.5">Taxa de conversão: <strong>{d.rate}%</strong></p>}
      {d.value > 0 && (
        <p className="text-emerald-700 font-bold mt-0.5">R$ {d.value.toLocaleString("pt-BR")}</p>
      )}
    </div>
  );
};

export default function FunnelChart({ leads }) {
  const total = leads.length || 1;
  const wonLeads = leads.filter((l) => l.status === "won");
  const lostCount = leads.filter((l) => l.status === "lost").length;

  const data = STAGES.map((s, i) => {
    const stageLeads = leads.filter((l) => l.status === s.key);
    const count = stageLeads.length;
    const value = stageLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
    const prevCount = i === 0 ? total : (leads.filter((l) => l.status === STAGES[i - 1].key).length || 1);
    const rate = i === 0 ? ((count / total) * 100).toFixed(0) : ((count / prevCount) * 100).toFixed(0);
    return { name: s.label, count, color: s.color, rate: Number(rate), value };
  });

  const totalValue = wonLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
  const convRate = ((wonLeads.length / total) * 100).toFixed(1);

  return (
    <Card className="bg-white border border-gray-200 border-l-4 border-l-indigo-500 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Funil de Vendas
          </CardTitle>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Conversão</p>
              <p className="text-lg font-black text-indigo-700">{convRate}%</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Perdidos</p>
              <p className="text-lg font-black text-red-600">{lostCount}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 2, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                width={78}
                tick={{ fontSize: 11, fill: "#475569", fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={(props) => <CustomTooltip {...props} />} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 900, fill: "#374151" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {totalValue > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Valor total ganho</span>
            <span className="text-sm font-black text-emerald-700">
              R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
