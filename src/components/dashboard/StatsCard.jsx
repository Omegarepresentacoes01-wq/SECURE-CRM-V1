import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const colorMap = {
  blue:   { border: "border-l-blue-500",    value: "text-blue-700",    icon: "text-blue-400",    bg: "bg-blue-50" },
  green:  { border: "border-l-emerald-500", value: "text-emerald-700", icon: "text-emerald-400", bg: "bg-emerald-50" },
  orange: { border: "border-l-orange-500",  value: "text-orange-700",  icon: "text-orange-400",  bg: "bg-orange-50" },
  red:    { border: "border-l-red-500",      value: "text-red-700",     icon: "text-red-400",     bg: "bg-red-50" },
  purple: { border: "border-l-purple-500",   value: "text-purple-700",  icon: "text-purple-400",  bg: "bg-purple-50" },
  indigo: { border: "border-l-indigo-500",   value: "text-indigo-700",  icon: "text-indigo-400",  bg: "bg-indigo-50" },
  amber:  { border: "border-l-amber-500",    value: "text-amber-700",   icon: "text-amber-400",   bg: "bg-amber-50" },
};

export default function StatsCard({ title, value, subtitle, icon: Icon, color = "blue", trend }) {
  const c = colorMap[color] || colorMap.blue;
  return (
    <Card className={`bg-white border border-gray-200 border-l-4 ${c.border} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{title}</p>
            <p className={`text-2xl font-black leading-none mt-1.5 ${c.value}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
            {trend != null && (
              <div className={`flex items-center gap-1 text-xs font-bold mt-1.5 ${trend > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(trend)}% vs mês anterior
              </div>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
        </div>
      </div>
    </Card>
  );
}
