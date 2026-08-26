import { createFileRoute } from "@tanstack/react-router";
import { Droplets, Thermometer, CloudRain } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/eco/PageHeader";
import { DemoBadge } from "@/components/eco/DemoBadge";
import { StatCard } from "@/components/eco/StatCard";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHumidityHistory, useReadings } from "@/lib/api";

export const Route = createFileRoute("/dashboard/monitoreo")({
  head: () => ({
    meta: [
      { title: "Monitoreo de sensores — EcoSmart" },
      { name: "description", content: "Gráficas y lecturas reales de humedad de suelo, temperatura y humedad ambiental." },
      { property: "og:title", content: "Monitoreo de sensores — EcoSmart" },
      { property: "og:description", content: "Lecturas recientes y tendencias de tus sensores." },
    ],
  }),
  component: MonitoringPage,
});

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--card-foreground)",
};

function MonitoringPage() {
  const { data: history = [] } = useHumidityHistory();
  const { data: readings = [] } = useReadings(25);
  const latest = history[history.length - 1];

  return (
    <>
      <PageHeader
        title="Monitoreo"
        description="Tendencias y lecturas recientes de los sensores del sistema."
        actions={<DemoBadge label="Tabla readings en Supabase" />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Droplets}
          label="Humedad del suelo"
          value={latest?.humedad ?? "—"}
          unit={latest ? "%" : ""}
          hint="Última lectura"
          tone="leaf"
        />
        <StatCard
          icon={Thermometer}
          label="Temperatura"
          value={latest?.temperatura ?? "—"}
          unit={latest ? "°C" : ""}
          hint="Última lectura"
          tone="warn"
        />
        <StatCard
          icon={CloudRain}
          label="Humedad ambiental"
          value={latest?.ambiental ?? "—"}
          unit={latest ? "%" : ""}
          hint="Última lectura"
          tone="sky"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-soft p-5">
          <h2 className="text-lg font-semibold">Humedad del suelo</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="humedad" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-soft p-5">
          <h2 className="text-lg font-semibold">Temperatura</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="temperatura" stroke="var(--chart-3)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-soft p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Humedad ambiental</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="ambiental" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card-soft overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-5">
          <h2 className="text-lg font-semibold">Lecturas recientes</h2>
          <Badge variant="outline" className="border-primary/30 bg-leaf-soft text-accent-foreground">
            Datos reales de Supabase
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y hora</TableHead>
                <TableHead>Humedad suelo</TableHead>
                <TableHead>Temperatura</TableHead>
                <TableHead>Humedad ambiental</TableHead>
                <TableHead>Válida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readings.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{new Date(r.recorded_at).toLocaleString("es-GT")}</TableCell>
                  <TableCell>{r.soil_humidity ?? "—"}%</TableCell>
                  <TableCell>{r.temperature ?? "—"} °C</TableCell>
                  <TableCell>{r.ambient_humidity ?? "—"}%</TableCell>
                  <TableCell>{r.valido ? "Sí" : "No"}</TableCell>
                </TableRow>
              ))}
              {readings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No hay lecturas todavía.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
