import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import moment from "moment";

const CustomTooltip = ({ active = false, payload = [], label = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-black text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 font-bold" style={{ color: p.color }}>
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-black text-gray-800">
            R$ {(p.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function RevenueChart({ financials }) {
  const now = moment();
  const monthlyData = {};

  for (let i = 5; i >= 0; i--) {
    const key = now.clone().subtract(i, "months").format("YYYY-MM");
    monthlyData[key] = {
      month: now.clone().subtract(i, "months").format("MMM/YY"),
      received: 0,
      expected: 0,
      overdue: 0,
    };
  }

  financials.forEach((f) => {
    if (!f.due_date) return;
    const key = moment(f.due_date).format("YYYY-MM");
    if (!monthlyData[key]) return;
    const amt = f.amount || 0;
    monthlyData[key].expected += amt;
    if (f.status === "paid") monthlyData[key].received += amt;
    if (f.status === "overdue") monthlyData[key].overdue += amt;
  });

  const data = Object.values(monthlyData);

  const totalReceived = data.reduce((s, d) => s + d.received, 0);
  const totalExpected = data.reduce((s, d) => s + d.expected, 0);
  const pctCollected = totalExpected > 0
    ? ((totalReceived / totalExpected) * 100).toFixed(0)
    : 0;

  return (
    <Card className="bg-white border border-gray-200 border-l-4 border-l-emerald-500 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Receita — 6 meses
          </CardTitle>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Recebido</p>
              <p className="text-lg font-black text-emerald-700">
                R$ {(totalReceived / 1000).toFixed(1)}k
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Cobrança</p>
              <p className="text-lg font-black text-blue-700">{pctCollected}%</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 0, right: 10, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gradExpected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOverdue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={(props) => <CustomTooltip {...props} />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }}
              />
              <Area
                type="monotone"
                dataKey="expected"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gradExpected)"
                name="Prevista"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="received"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#gradReceived)"
                name="Recebida"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="overdue"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="4 3"
                fill="url(#gradOverdue)"
                name="Atrasada"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
