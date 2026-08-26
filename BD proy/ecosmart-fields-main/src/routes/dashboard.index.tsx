import { createFileRoute, Link } from "@tanstack/react-router";
import { Droplets, Thermometer, CloudRain, Power, Wifi, ServerCog, CloudSun } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/eco/StatCard";
import { PageHeader } from "@/components/eco/PageHeader";
import { DemoBadge, DemoNotice } from "@/components/eco/DemoBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCrops, useHumidityHistory, useSystemStatus, useWeatherForecast } from "@/lib/api";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Panel general — EcoSmart" },
      { name: "description", content: "Resumen de humedad, temperatura, bomba y clima de tus cultivos en EcoSmart." },
      { property: "og:title", content: "Panel general — EcoSmart" },
      { property: "og:description", content: "Resumen del sistema de riego inteligente EcoSmart." },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const { data: crops = [] } = useCrops();
  const { data: forecast = [] } = useWeatherForecast();
  const { data: history = [] } = useHumidityHistory();
  const status = useSystemStatus();

  const today = forecast[0];
  const recommend = today ? (today.rain_probability ?? 0) < 50 : true;

  const avgHumidity = crops.length
    ? Math.round(crops.reduce((a, c) => a + (c.current_humidity ?? 0), 0) / crops.length)
    : null;
  const latest = history[history.length - 1];

  return (
    <>
      <PageHeader
        title="Panel general"
        description="Resumen del estado de riego y condiciones de tus cultivos."
        actions={<DemoBadge label="Login demo · datos reales en Supabase" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Droplets}
          label="Humedad del suelo"
          value={avgHumidity ?? "—"}
          unit={avgHumidity !== null ? "%" : ""}
          hint={`Promedio de ${crops.length} cultivo${crops.length === 1 ? "" : "s"}`}
          tone="leaf"
        />
        <StatCard
          icon={Thermometer}
          label="Temperatura"
          value={latest?.temperatura ?? "—"}
          unit={latest ? "°C" : ""}
          hint="Última lectura registrada"
          tone="warn"
        />
        <StatCard
          icon={CloudRain}
          label="Humedad ambiental"
          value={latest?.ambiental ?? "—"}
          unit={latest ? "%" : ""}
          hint="Última lectura registrada"
          tone="sky"
        />
        <StatCard
          icon={Power}
          label="Bomba"
          value={status.pump_on ? "ON" : "OFF"}
          hint="Estado guardado en irrigation_config"
          tone="navy"
          footer={
            <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
              <Link to="/dashboard/riego">Ir al control de riego</Link>
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-soft p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Historial de humedad</h2>
              <p className="text-sm text-muted-foreground">Últimas lecturas guardadas en la tabla readings</p>
            </div>
            <DemoBadge />
          </div>
          <div className="mt-5 h-72">
            {history.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ left: -18, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="humedadFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--card-foreground)",
                    }}
                    formatter={(v: number) => [`${v}%`, "Humedad"]}
                  />
                  <Area type="monotone" dataKey="humedad" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#humedadFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Todavía no hay lecturas en Supabase. Corre el script de datos de ejemplo o inicia el agente de la Raspberry Pi." />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-soft p-5">
            <h2 className="text-lg font-semibold">Estado del sistema</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ServerCog className="h-4 w-4" aria-hidden /> Modo
                </span>
                <Badge variant="secondary">{status.mode}</Badge>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Wifi className="h-4 w-4" aria-hidden /> Conexión a Supabase
                </span>
                <Badge className="bg-primary text-primary-foreground">{status.internet}</Badge>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Dispositivo</span>
                <Badge variant="outline">{status.device}</Badge>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Última lectura</span>
                <span>{status.last_sync}</span>
              </li>
            </ul>
          </div>

          <div className="card-soft p-5">
            <div className="flex items-center gap-2">
              <CloudSun className="h-5 w-5 text-sky" aria-hidden />
              <h2 className="text-lg font-semibold">Recomendación climática</h2>
            </div>
            {today ? (
              <>
                <p className="mt-3 text-sm text-muted-foreground">
                  Probabilidad de lluvia hoy: <span className="font-semibold text-foreground">{today.rain_probability}%</span>
                </p>
                <div
                  className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
                    recommend ? "bg-leaf-soft text-accent-foreground" : "bg-sky-soft text-sky"
                  }`}
                >
                  {recommend ? "Riego recomendado hoy" : "No se recomienda regar: se esperan lluvias"}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Sin pronóstico cargado todavía.</p>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
              <Link to="/dashboard/clima">Ver pronóstico completo</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="card-soft p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Humedad por cultivo</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/cultivos">Ver cultivos</Link>
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {crops.length === 0 ? (
            <EmptyState text="No hay cultivos en Supabase todavía para este dispositivo." />
          ) : (
            crops.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.name}</p>
                  <Badge
                    variant="outline"
                    className={
                      c.status === "optimo"
                        ? "border-primary/30 bg-leaf-soft text-accent-foreground"
                        : c.status === "atencion"
                          ? "border-warn/30 bg-warn-soft text-earth"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                    }
                  >
                    {c.status === "optimo" ? "Óptimo" : c.status === "atencion" ? "Atención" : "Crítico"}
                  </Badge>
                </div>
                <p className="mt-2 text-2xl font-semibold">{c.current_humidity ?? "—"}%</p>
                <p className="text-xs text-muted-foreground">
                  Objetivo {c.humidity_target}% · mínimo {c.humidity_min}%
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${c.current_humidity ?? 0}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card-soft p-5">
        <h2 className="text-lg font-semibold">Temperatura y humedad ambiental</h2>
        <div className="mt-4 h-64">
          {history.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                  }}
                />
                <Line type="monotone" dataKey="temperatura" stroke="var(--chart-3)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="ambiental" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Sin lecturas todavía." />
          )}
        </div>
      </div>

      <DemoNotice>
        El panel ya lee y escribe directamente en tu proyecto Supabase (tablas crops, readings, irrigation_events,
        etc). El login sigue siendo de demostración y el ESP32/Raspberry física aún no está enviando datos en vivo
        salvo que ejecutes el agente Python de la carpeta <code>raspberry/</code>.
      </DemoNotice>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">{text}</div>;
}
