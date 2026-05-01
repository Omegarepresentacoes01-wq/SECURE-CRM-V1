import { useState } from "react";
import { useNavigate } from "react-router-dom";
import auth from "@/api/auth";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

// ── Nós da rede (posições fixas em %)
const NODES = [
  { x: 8,  y: 15 }, { x: 22, y: 6  }, { x: 38, y: 10 }, { x: 55, y: 4  },
  { x: 72, y: 9  }, { x: 88, y: 14 }, { x: 95, y: 30 }, { x: 92, y: 50 },
  { x: 88, y: 70 }, { x: 80, y: 85 }, { x: 65, y: 92 }, { x: 48, y: 95 },
  { x: 32, y: 91 }, { x: 16, y: 84 }, { x: 5,  y: 68 }, { x: 3,  y: 48 },
  { x: 6,  y: 30 }, { x: 18, y: 40 }, { x: 35, y: 28 }, { x: 52, y: 22 },
  { x: 68, y: 30 }, { x: 82, y: 42 }, { x: 75, y: 58 }, { x: 60, y: 68 },
  { x: 42, y: 72 }, { x: 26, y: 62 }, { x: 14, y: 55 }, { x: 30, y: 45 },
  { x: 50, y: 50 }, { x: 67, y: 45 }, { x: 82, y: 22 }, { x: 10, y: 80 },
];

// Conexões entre nós
const EDGES_IDX = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],
  [10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,0],[16,17],
  [17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[23,24],[24,25],
  [25,26],[26,27],[27,28],[28,29],[29,21],[18,27],[19,28],[2,18],
  [3,19],[4,20],[5,30],[7,22],[9,23],[11,24],[13,25],[1,17],[15,31],
  [31,13],[30,6],[28,24],[17,26],[0,16],[20,29],
];

// Pulsos animados nas arestas
const PULSES = [0,3,7,11,15,19,23,27,31,35,40,44];

function NetworkBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <style>{`
          @keyframes nodePulse { 0%,100%{opacity:0.35;r:2.5} 50%{opacity:0.9;r:4} }
          @keyframes edgeFlow  { from{stroke-dashoffset:0} to{stroke-dashoffset:-24} }
          @keyframes pulseDot  { 0%{offset-distance:0%;opacity:0.9} 80%{opacity:0.9} 100%{offset-distance:100%;opacity:0} }
          @keyframes shimmer   { 0%,100%{opacity:0.04} 50%{opacity:0.09} }
        `}</style>
        <radialGradient id="bgGrad" cx="40%" cy="40%">
          <stop offset="0%"   stopColor="#0e7490" stopOpacity="0.4"/>
          <stop offset="60%"  stopColor="#0c4a6e" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#062d3f"  stopOpacity="0"/>
        </radialGradient>
        <filter id="nodeGlow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="lineGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Glow central suave */}
      <ellipse cx="50%" cy="48%" rx="40%" ry="35%" fill="url(#bgGrad)"/>

      {/* Grade hexagonal sutil */}
      {Array.from({length: 18}, (_, row) =>
        Array.from({length: 36}, (_, col) => (
          <circle key={`g${row}-${col}`}
            cx={`${(col + (row % 2 === 0 ? 0 : 0.5)) * (100/35)}%`}
            cy={`${row * (100/17)}%`}
            r="0.6" fill="white" opacity="0.025"
          />
        ))
      )}

      {/* Arestas da rede */}
      {EDGES_IDX.map(([a, b], i) => {
        const na = NODES[a], nb = NODES[b];
        const isPulse = PULSES.includes(i);
        return (
          <line key={`e${i}`}
            x1={`${na.x}%`} y1={`${na.y}%`}
            x2={`${nb.x}%`} y2={`${nb.y}%`}
            stroke={isPulse ? "#67e8f9" : "white"}
            strokeWidth={isPulse ? "0.7" : "0.45"}
            strokeDasharray={isPulse ? "6 6" : "none"}
            opacity={isPulse ? "0.18" : "0.07"}
            filter={isPulse ? "url(#lineGlow)" : undefined}
            style={isPulse ? { animation: `edgeFlow ${2 + (i % 3) * 0.5}s linear infinite` } : undefined}
          />
        );
      })}

      {/* Nós da rede */}
      {NODES.map((n, i) => {
        const isActive = [2, 5, 11, 17, 20, 24, 28].includes(i);
        return (
          <circle key={`n${i}`}
            cx={`${n.x}%`} cy={`${n.y}%`}
            r={isActive ? "3.5" : "2"}
            fill={isActive ? "#67e8f9" : "white"}
            filter={isActive ? "url(#nodeGlow)" : undefined}
            style={{
              animation: `nodePulse ${2.5 + (i % 5) * 0.4}s ease-in-out ${(i * 0.3) % 2}s infinite`,
              opacity: isActive ? 0.6 : 0.3,
            }}
          />
        );
      })}

      {/* Linhas diagonais de fundo */}
      {Array.from({length: 6}, (_, i) => (
        <line key={`dl${i}`}
          x1={`${-10 + i * 22}%`} y1="0%"
          x2={`${10 + i * 22}%`} y2="100%"
          stroke="white" strokeWidth="0.3" opacity="0.025"
        />
      ))}
    </svg>
  );
}

// ── Ícone de escudo com cadeado
function ShieldIcon() {
  return (
    <svg width="72" height="82" viewBox="0 0 72 82" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="72" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#67e8f9" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#0e7490" stopOpacity="0.7"/>
        </linearGradient>
        <filter id="shieldGlow">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Glow */}
      <path d="M36 4 L66 16 L66 40 C66 58 52 72 36 78 C20 72 6 58 6 40 L6 16 Z"
        fill="#67e8f9" opacity="0.12" filter="url(#shieldGlow)"/>
      {/* Escudo */}
      <path d="M36 4 L66 16 L66 40 C66 58 52 72 36 78 C20 72 6 58 6 40 L6 16 Z"
        fill="url(#shieldGrad)" opacity="0.15" stroke="#67e8f9" strokeWidth="1.5" strokeOpacity="0.6"/>
      {/* Cadeado corpo */}
      <rect x="24" y="38" width="24" height="18" rx="3" fill="white" opacity="0.9"/>
      {/* Cadeado arco */}
      <path d="M27 38 L27 31 C27 25.5 45 25.5 45 31 L45 38"
        stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.9"/>
      {/* Buraco do cadeado */}
      <circle cx="36" cy="46" r="3.5" fill="#0e7490" opacity="0.8"/>
      <rect x="34.5" y="46" width="3" height="5" rx="1" fill="#0e7490" opacity="0.8"/>
      {/* Brilho no escudo */}
      <path d="M22 18 L36 12 L50 18 L50 26 C50 34 42 40 36 42 C30 40 22 34 22 26 Z"
        fill="white" opacity="0.05"/>
      {/* Pulsação */}
      <path d="M36 4 L66 16 L66 40 C66 58 52 72 36 78 C20 72 6 58 6 40 L6 16 Z"
        fill="none" stroke="#67e8f9" strokeWidth="1" strokeOpacity="0.4">
        <animate attributeName="stroke-opacity" values="0.4;0.9;0.4" dur="2.5s" repeatCount="indefinite"/>
        <animate attributeName="stroke-width"   values="1;2;1"       dur="2.5s" repeatCount="indefinite"/>
      </path>
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { checkAppState } = useAuth();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      await auth.login(email, password);
      await checkAppState();
      const u = auth.usuarioLocal();
      navigate(u?.role === "super_admin" ? "/SuperAdmin" : "/Dashboard", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error ?? "E-mail ou senha inválidos");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #051e2c 0%, #082d40 25%, #0e4d66 55%, #0a3a52 80%, #061e2e 100%)" }}
    >
      {/* Fundo de rede */}
      <NetworkBackground />

      {/* Névoa central */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(14,116,144,0.22) 0%, transparent 70%)",
      }}/>

      {/* Luz superior */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{
        background: "radial-gradient(ellipse, rgba(103,232,249,0.08) 0%, transparent 70%)",
        filter: "blur(30px)",
      }}/>

      {/* Luz inferior */}
      <div className="absolute bottom-0 right-1/4 w-80 h-80 pointer-events-none" style={{
        background: "radial-gradient(circle, rgba(52,211,153,0.06), transparent 70%)",
        filter: "blur(40px)",
      }}/>

      {/* ── Conteúdo central ── */}
      <div className="w-full max-w-md relative z-10">

        {/* Hero: ícone + logo + subtítulo */}
        <div className="text-center mb-8">
          {/* Escudo animado */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              {/* Anel de pulso externo */}
              <div className="absolute inset-0 rounded-full pointer-events-none" style={{
                background: "radial-gradient(circle, rgba(103,232,249,0.15), transparent 70%)",
                animation: "ping 3s ease-in-out infinite",
                transform: "scale(1.6)",
              }}/>
              <ShieldIcon />
            </div>
          </div>

          {/* Logotipo */}
          <h1
            className="text-[42px] sm:text-[52px] font-black italic leading-none tracking-tight drop-shadow-2xl mb-2"
            style={{ fontFamily: "'Arial Black', 'Franklin Gothic Heavy', Impact, sans-serif" }}
          >
            <span className="text-white">SECURE-</span><span className="text-cyan-300">CRM</span>
          </h1>

          {/* Subtítulo */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-400/50"/>
            <p className="text-cyan-200 text-sm font-semibold tracking-widest uppercase">
              CRM para segurança eletrônica
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-400/50"/>
          </div>
        </div>

        {/* Card do formulário */}
        <div
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(103,232,249,0.2)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          {/* Topo do card com linha ciano */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"/>

          <div className="p-7 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-4 h-4 text-cyan-300"/>
              <h2 className="text-lg font-black text-white tracking-tight">Acesso ao sistema</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-cyan-100 font-bold text-xs uppercase tracking-wider">
                  E-mail
                </Label>
                <Input
                  id="email" type="email" placeholder="seu@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" autoFocus
                  className="h-11 font-medium rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(103,232,249,0.25)",
                    color: "white",
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-cyan-100 font-bold text-xs uppercase tracking-wider">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password" type={mostrarSenha ? "text" : "password"} placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                    required autoComplete="current-password"
                    className="h-11 pr-11 font-medium rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(103,232,249,0.25)",
                      color: "white",
                    }}
                  />
                  <button
                    type="button" tabIndex={-1}
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-300/70 hover:text-cyan-200 transition-colors"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>

              <Button
                type="submit" disabled={carregando}
                className="w-full h-12 font-black text-base rounded-xl transition-all duration-200 mt-2"
                style={{
                  background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                  boxShadow: "0 4px 20px rgba(6,182,212,0.35)",
                  color: "white",
                  border: "none",
                }}
              >
                {carregando
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Entrando...</>
                  : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/10 text-center">
              <p className="text-xs text-cyan-200/60 font-medium">
                Problemas para acessar? Fale com o administrador.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-center text-[11px] text-white/25 mt-6 font-medium tracking-wide">
          SECURE-CRM © {new Date().getFullYear()} · Todos os direitos reservados
        </p>
      </div>

      <style>{`
        @keyframes ping {
          0%, 100% { transform: scale(1.4); opacity: 0.2; }
          50%       { transform: scale(1.8); opacity: 0.05; }
        }
        input::placeholder { color: rgba(186, 230, 253, 0.4) !important; }
        input:focus {
          border-color: rgba(103, 232, 249, 0.6) !important;
          box-shadow: 0 0 0 3px rgba(103, 232, 249, 0.12) !important;
          outline: none !important;
        }
      `}</style>
    </div>
  );
}
