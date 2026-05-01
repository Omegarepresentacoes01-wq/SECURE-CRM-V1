import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const STATUS_LABEL = {
  new:"Novo", contacted:"Contato", qualified:"Qualificado",
  proposal:"Proposta", negotiation:"Negociação", won:"Ganho", lost:"Perdido",
};
const TEMP_LABEL  = { cold:"Frio", warm:"Morno", hot:"Quente" };
const STATUS_COLOR = {
  new:"#94a3b8", contacted:"#8b5cf6", qualified:"#f59e0b",
  proposal:"#06b6d4", negotiation:"#f97316", won:"#10b981", lost:"#ef4444",
};
const TEMP_COLOR = { cold:"#38bdf8", warm:"#fb923c", hot:"#f43f5e" };

function makeMarker(color, size = 18) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border-radius:50%;
      border:2.5px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
    "></div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -(size / 2 + 6)],
  });
}

function BoundsController({ positions }) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (!map || positions.length === 0 || didFit.current) return;
    didFit.current = true;
    if (positions.length === 1) {
      map.setView(positions[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [60, 60], maxZoom: 14 });
    }
  }, [positions.length]);  

  return null;
}

export default function MapPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [savingId, setSavingId] = useState(null);
  const queryClient = useQueryClient();

  const savePosition = async (lead, latlng) => {
    setSavingId(lead.id);
    try {
      await base44.entities.Lead.update(lead.id, {
        latitude: latlng.lat,
        longitude: latlng.lng,
      });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } finally {
      setSavingId(null);
    }
  };

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 500),
  });

  const leadsWithCoords = leads.filter(
    l => l.latitude && l.longitude &&
         !isNaN(parseFloat(l.latitude)) && !isNaN(parseFloat(l.longitude)) &&
         !(parseFloat(l.latitude) === -14.235 && parseFloat(l.longitude) === -51.925)
  );

  const filtered = leadsWithCoords.filter(
    l => statusFilter === "all" || l.status === statusFilter
  );

  const positions = filtered.map(l => [parseFloat(l.latitude), parseFloat(l.longitude)]);

  return (
    <div className="flex flex-col" style={{ margin: "-1rem", height: "calc(100vh - 56px)" }}>

      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-800">Mapa de Clientes</h1>
          <p className="text-xs text-gray-500">
            {isLoading ? "Carregando…" : `${leadsWithCoords.length} lead${leadsWithCoords.length !== 1 ? "s" : ""} com localização`}
          </p>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* mapa */}
      <div className="relative flex-1">
        <MapContainer
          center={[-14.235, -51.925]}
          zoom={5}
          style={{ height: "100%", width: "100%", position: "absolute", inset: 0 }}
          scrollWheelZoom
          minZoom={3}
          maxZoom={19}
          zoomControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            subdomains="abc"
            maxZoom={19}
          />

          <BoundsController positions={positions} />

          {filtered.map(lead => {
            const lat   = parseFloat(lead.latitude);
            const lng   = parseFloat(lead.longitude);
            const color = STATUS_COLOR[lead.status] || "#94a3b8";
            const isSaving = savingId === lead.id;
            return (
              <Marker
                key={lead.id}
                position={[lat, lng]}
                icon={makeMarker(color)}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => savePosition(lead, e.target.getLatLng()),
                }}
              >
                <Popup minWidth={200} maxWidth={260}>
                  <div style={{ padding: "10px 12px", fontFamily: "system-ui, sans-serif" }}>
                    <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 2px" }}>{lead.name}</p>
                    {lead.company && <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 6px" }}>{lead.company}</p>}

                    {(lead.address || lead.city) && (
                      <p style={{ fontSize: 11, color: "#475569", margin: "0 0 6px" }}>
                        📍 {[lead.address, lead.city, lead.state].filter(Boolean).join(", ")}
                      </p>
                    )}

                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ background: color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                        {STATUS_LABEL[lead.status] || lead.status}
                      </span>
                      {lead.temperature && (
                        <span style={{ background: TEMP_COLOR[lead.temperature] || "#64748b", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                          {TEMP_LABEL[lead.temperature]}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 10, color: "#94a3b8", margin: "6px 0 0", fontStyle: "italic" }}>
                      {isSaving ? "Salvando…" : "Arraste o pin para ajustar a posição"}
                    </p>

                    {lead.estimated_value > 0 && (
                      <p style={{ fontSize: 13, fontWeight: 800, color: "#10b981", margin: 0 }}>
                        R$ {Number(lead.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    {lead.phone && <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>{lead.phone}</p>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* legenda */}
        <div style={{
          position: "absolute", bottom: 20, left: 12, zIndex: 1000,
          background: "white", borderRadius: 10, padding: "10px 14px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)", minWidth: 130,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Status</p>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <div key={k}
              style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, cursor: "pointer" }}
              onClick={() => setStatusFilter(f => f === k ? "all" : k)}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: STATUS_COLOR[k], flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: statusFilter === k ? "#0f172a" : "#64748b", fontWeight: statusFilter === k ? 700 : 400 }}>{v}</span>
              <span style={{ fontSize: 10, color: "#cbd5e1", marginLeft: "auto" }}>
                {leadsWithCoords.filter(l => l.status === k).length}
              </span>
            </div>
          ))}
        </div>

        {/* badge visíveis */}
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 1000,
          background: "#0891b2", color: "white", borderRadius: 999,
          padding: "4px 12px", fontSize: 11, fontWeight: 700,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>
          {filtered.length} visível{filtered.length !== 1 ? "is" : ""}
        </div>

        {leadsWithCoords.length === 0 && !isLoading && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 999,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{
              background: "white", borderRadius: 12, padding: "20px 28px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)", textAlign: "center",
            }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Nenhum lead localizado</p>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 4, maxWidth: 260 }}>
                Preencha o CEP no cadastro do lead para aparecer no mapa.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
