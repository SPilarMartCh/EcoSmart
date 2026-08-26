import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/eco/PageHeader";
import { DemoBadge } from "@/components/eco/DemoBadge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCrops, useIrrigationEvents } from "@/lib/api";

export const Route = createFileRoute("/dashboard/historial")({
  head: () => ({
    meta: [
      { title: "Historial de riego — EcoSmart" },
      { name: "description", content: "Registro real de eventos de riego con modo, duración, humedad inicial y final." },
      { property: "og:title", content: "Historial de riego — EcoSmart" },
      { property: "og:description", content: "Trazabilidad completa de cada ciclo de riego." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data: events = [] } = useIrrigationEvents();
  const { data: crops = [] } = useCrops();
  const cropNameById = useMemo(() => new Map(crops.map((c) => [c.id, c.name])), [crops]);

  const [crop, setCrop] = useState("todos");
  const [mode, setMode] = useState("todos");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        const cropName = e.crop_id ? cropNameById.get(e.crop_id) : undefined;
        return (
          (crop === "todos" || cropName === crop) &&
          (mode === "todos" || e.mode === mode) &&
          (search === "" || (e.reason ?? "").toLowerCase().includes(search.toLowerCase()))
        );
      }),
    [events, cropNameById, crop, mode, search],
  );

  const totalMin = filtered.reduce((a, e) => a + Math.round((e.duration_seconds ?? 0) / 60), 0);

  return (
    <>
      <PageHeader
        title="Historial de riego"
        description="Eventos registrados en irrigation_events."
        actions={<DemoBadge label="Tabla irrigation_events en Supabase" />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-soft p-5">
          <p className="text-sm text-muted-foreground">Eventos mostrados</p>
          <p className="mt-1 text-3xl font-semibold">{filtered.length}</p>
        </div>
        <div className="card-soft p-5">
          <p className="text-sm text-muted-foreground">Tiempo total de riego</p>
          <p className="mt-1 text-3xl font-semibold">
            {totalMin} <span className="text-base font-medium text-muted-foreground">min</span>
          </p>
        </div>
        <div className="card-soft p-5">
          <p className="text-sm text-muted-foreground">Eventos automáticos</p>
          <p className="mt-1 text-3xl font-semibold">{filtered.filter((e) => e.mode === "automatico").length}</p>
        </div>
      </div>

      <div className="card-soft p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="f-cultivo">Cultivo</Label>
            <Select value={crop} onValueChange={setCrop}>
              <SelectTrigger id="f-cultivo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {crops.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-modo">Modo</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger id="f-modo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="automatico">Automático</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-motivo">Buscar por motivo</Label>
            <Input
              id="f-motivo"
              placeholder="Ej. umbral, manual…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card-soft overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y hora</TableHead>
                <TableHead>Cultivo</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Humedad inicial</TableHead>
                <TableHead>Humedad final</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{new Date(e.started_at).toLocaleString("es-GT")}</TableCell>
                  <TableCell className="font-medium">{e.crop_id ? cropNameById.get(e.crop_id) ?? "—" : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={e.mode === "automatico" ? "secondary" : "outline"}>
                      {e.mode === "automatico" ? "Automático" : "Manual"}
                    </Badge>
                  </TableCell>
                  <TableCell>{e.duration_seconds !== null ? `${Math.round(e.duration_seconds / 60)} min` : "En curso"}</TableCell>
                  <TableCell>{e.humidity_start ?? "—"}%</TableCell>
                  <TableCell>{e.humidity_end ?? "—"}%</TableCell>
                  <TableCell className="text-muted-foreground">{e.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No hay eventos con estos filtros.
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
