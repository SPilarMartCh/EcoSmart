import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Droplets, Play, Square, Info } from "lucide-react";
import { PageHeader } from "@/components/eco/PageHeader";
import { DemoBadge, DemoNotice } from "@/components/eco/DemoBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useIrrigationConfig,
  useStartManualIrrigation,
  useStopManualIrrigation,
  useUpdateIrrigationConfig,
} from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/riego")({
  head: () => ({
    meta: [
      { title: "Control de riego — EcoSmart" },
      { name: "description", content: "Modo automático o manual, estado real de la bomba y umbrales de histéresis." },
      { property: "og:title", content: "Control de riego — EcoSmart" },
      { property: "og:description", content: "Configura umbrales de riego y controla el ciclo de la bomba." },
    ],
  }),
  component: IrrigationPage,
});

function IrrigationPage() {
  const { data: config, isLoading } = useIrrigationConfig();
  const updateConfig = useUpdateIrrigationConfig();
  const startIrrigation = useStartManualIrrigation();
  const stopIrrigation = useStopManualIrrigation();

  const [mode, setMode] = useState<"automatico" | "manual">("automatico");
  const [duration, setDuration] = useState("15");
  const [start, setStart] = useState(45);
  const [stop, setStop] = useState(65);

  // Sincroniza el estado local con lo que hay guardado en Supabase.
  useEffect(() => {
    if (!config) return;
    setMode(config.mode);
    setDuration(String(config.default_duration_min));
    setStart(config.humidity_start_threshold);
    setStop(config.humidity_stop_threshold);
  }, [config]);

  const pumpOn = config?.pump_on ?? false;
  const current = config?.current_humidity ?? null;

  return (
    <>
      <PageHeader
        title="Control de riego"
        description="Configuración y control real del ciclo de riego con histéresis."
        actions={<DemoBadge label="Escribe en irrigation_config / irrigation_events" />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-soft space-y-6 p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Modo de operación</h2>
              <p className="text-sm text-muted-foreground">
                En automático, EcoSmart decide según la humedad. En manual, el operador controla la bomba.
              </p>
            </div>
            <Tabs
              value={mode}
              onValueChange={(v) => {
                const next = v as "automatico" | "manual";
                setMode(next);
                updateConfig.mutate(
                  { mode: next },
                  {
                    onError: (e) => toast.error(e.message),
                    onSuccess: () => toast.success(`Modo cambiado a ${next === "automatico" ? "automático" : "manual"}`),
                  },
                );
              }}
            >
              <TabsList>
                <TabsTrigger value="automatico">Automático</TabsTrigger>
                <TabsTrigger value="manual">Manual</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="rounded-2xl border border-border p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    pumpOn ? "bg-leaf-soft text-accent-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Droplets className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Estado de la bomba</p>
                  <p className="text-2xl font-semibold">{isLoading ? "…" : pumpOn ? "ON" : "OFF"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    startIrrigation.mutate(
                      { humidityStart: current, cropId: config?.active_crop_id ?? null },
                      {
                        onError: (e) => toast.error(e.message),
                        onSuccess: () => toast.success(`Riego iniciado por ${duration} minutos`),
                      },
                    );
                  }}
                  disabled={mode === "automatico" || pumpOn || startIrrigation.isPending}
                >
                  <Play className="mr-1 h-4 w-4" aria-hidden /> Iniciar riego
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    stopIrrigation.mutate(
                      { humidityEnd: current },
                      {
                        onError: (e) => toast.error(e.message),
                        onSuccess: () => toast("Riego detenido"),
                      },
                    );
                  }}
                  disabled={mode === "automatico" || !pumpOn || stopIrrigation.isPending}
                >
                  <Square className="mr-1 h-4 w-4" aria-hidden /> Detener
                </Button>
              </div>
            </div>
            {mode === "automatico" ? (
              <p className="mt-4 text-xs text-muted-foreground">
                El control manual está deshabilitado mientras el modo automático esté activo.
              </p>
            ) : null}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="duracion">Duración del riego manual</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duracion">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["5", "10", "15", "20", "30", "45"].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d} minutos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Humedad actual</Label>
              <div className="rounded-xl border border-border px-4 py-2.5 text-2xl font-semibold">
                {current !== null ? `${current}%` : "Sin datos"}
              </div>
            </div>
            <div className="space-y-3">
              <Label>Humedad mínima (inicia riego): {start}%</Label>
              <Slider value={[start]} min={20} max={70} step={1} onValueChange={([v]) => setStart(v ?? start)} />
            </div>
            <div className="space-y-3">
              <Label>Humedad objetivo (detiene riego): {stop}%</Label>
              <Slider value={[stop]} min={40} max={95} step={1} onValueChange={([v]) => setStop(v ?? stop)} />
            </div>
          </div>

          <Button
            onClick={() =>
              updateConfig.mutate(
                {
                  default_duration_min: Number(duration),
                  humidity_start_threshold: start,
                  humidity_stop_threshold: stop,
                },
                {
                  onError: (e) => toast.error(e.message),
                  onSuccess: () => toast.success("Configuración de riego guardada"),
                },
              )
            }
            disabled={updateConfig.isPending}
          >
            Guardar configuración
          </Button>
        </div>

        <div className="space-y-4">
          <div className="card-soft p-5">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-sky" aria-hidden />
              <h2 className="text-lg font-semibold">¿Qué es la histéresis?</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              La histéresis evita que la bomba se encienda y apague continuamente cuando la humedad oscila alrededor de
              un único valor. Por eso se usan dos umbrales distintos:
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="rounded-xl bg-leaf-soft/60 px-3 py-2">
                Si la humedad <strong>≤ {start}%</strong> → se <strong>inicia</strong> el riego.
              </li>
              <li className="rounded-xl bg-sky-soft/70 px-3 py-2">
                Si la humedad <strong>≥ {stop}%</strong> → se <strong>detiene</strong> el riego.
              </li>
              <li className="rounded-xl bg-muted px-3 py-2">
                Entre {start}% y {stop}% se mantiene el estado anterior (banda muerta).
              </li>
            </ul>
          </div>

          <div className="card-soft p-5">
            <h2 className="text-lg font-semibold">Estado actual</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Modo</span>
                <Badge variant="secondary">{mode === "automatico" ? "Automático" : "Manual"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Decisión automática</span>
                <span className="font-medium">
                  {current === null ? "Sin datos" : current <= start ? "Regar" : current >= stop ? "No regar" : "Mantener estado"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duración por ciclo</span>
                <span className="font-medium">{duration} min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DemoNotice>
        Iniciar/detener aquí actualiza de verdad <code>irrigation_config</code> y registra el evento en{" "}
        <code>irrigation_events</code> en Supabase. Lo único simulado es el hardware: sin un ESP32/Raspberry real
        conectado, no hay una bomba física que se accione.
      </DemoNotice>
    </>
  );
}
