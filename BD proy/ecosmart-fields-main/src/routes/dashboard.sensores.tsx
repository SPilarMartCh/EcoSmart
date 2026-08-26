import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Cpu, Battery, Wifi, WifiOff, Ruler } from "lucide-react";
import { PageHeader } from "@/components/eco/PageHeader";
import { DemoBadge, DemoNotice } from "@/components/eco/DemoBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCalibrations, useSaveCalibration, useSensors } from "@/lib/api";
import { demoUser } from "@/lib/types";
import type { Sensor, SensorType, SensorStatus } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/sensores")({
  head: () => ({
    meta: [
      { title: "Sensores y calibración — EcoSmart" },
      { name: "description", content: "Lista de sensores reales, estado, batería y calibración seco/húmedo." },
      { property: "og:title", content: "Sensores y calibración — EcoSmart" },
      { property: "og:description", content: "Administra y calibra los sensores de tu sistema de riego." },
    ],
  }),
  component: SensorsPage,
});

const typeLabel: Record<SensorType, string> = {
  humedad_suelo: "Humedad de suelo",
  temperatura: "Temperatura",
  humedad_ambiental: "Humedad ambiental",
  bomba: "Relé de bomba",
};

const statusClass: Record<SensorStatus, string> = {
  activo: "border-primary/30 bg-leaf-soft text-accent-foreground",
  inactivo: "border-border bg-muted text-muted-foreground",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
};

function SensorsPage() {
  const { data: sensors = [], isLoading } = useSensors();
  const { data: calibrations = [] } = useCalibrations();
  const saveCalibration = useSaveCalibration();
  const [selected, setSelected] = useState<Sensor | null>(null);

  const secoRef = useRef<HTMLInputElement>(null);
  const humedoRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <PageHeader
        title="Sensores"
        description="Estado, valores actuales y calibración de los dispositivos."
        actions={<DemoBadge label="Tabla sensors en Supabase" />}
      />

      <DemoNotice>
        Los sensores y su estado vienen de Supabase (tabla <code>sensors</code>), pero ningún ESP32/Raspberry física
        está vinculado todavía a este dispositivo — los valores se actualizan cuando el agente Python o tú los
        escriban.
      </DemoNotice>

      {!isLoading && sensors.length === 0 ? (
        <div className="card-soft p-8 text-center text-sm text-muted-foreground">
          No hay sensores registrados para este dispositivo todavía.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sensors.map((s) => (
          <article key={s.id} className="card-soft p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy/10 text-navy">
                  <Cpu className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">{s.name}</h2>
                  <p className="text-xs text-muted-foreground">{typeLabel[s.type]}</p>
                </div>
              </div>
              <Badge variant="outline" className={statusClass[s.status]}>
                {s.status === "activo" ? "Activo" : s.status === "inactivo" ? "Inactivo" : "Error"}
              </Badge>
            </div>

            <p className="mt-4 text-3xl font-semibold">
              {s.type === "bomba"
                ? s.current_value
                  ? "ON"
                  : "OFF"
                : `${s.current_value ?? "—"}${s.unit === "%" ? "%" : s.unit ? ` ${s.unit}` : ""}`}
            </p>
            <p className="text-xs text-muted-foreground">{s.location}</p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Battery className="h-3.5 w-3.5" aria-hidden /> {s.battery ?? "—"}%
              </span>
              <span className="flex items-center gap-1.5">
                {s.status === "error" ? (
                  <WifiOff className="h-3.5 w-3.5 text-destructive" aria-hidden />
                ) : (
                  <Wifi className="h-3.5 w-3.5 text-primary" aria-hidden />
                )}
                {s.last_reading_at ? new Date(s.last_reading_at).toLocaleString("es-GT") : "Sin lecturas"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{s.firmware ?? "Firmware no reportado"}</p>

            <Button
              variant="secondary"
              className="mt-4 w-full"
              disabled={s.type !== "humedad_suelo"}
              onClick={() => setSelected(s)}
            >
              <Ruler className="mr-1 h-4 w-4" aria-hidden /> Calibrar sensor
            </Button>
          </article>
        ))}
      </div>

      <div className="card-soft overflow-hidden">
        <div className="p-5">
          <h2 className="text-lg font-semibold">Historial de calibraciones</h2>
          <p className="text-sm text-muted-foreground">Valores de referencia en seco y en húmedo (lectura ADC).</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sensor</TableHead>
                <TableHead>Valor en seco</TableHead>
                <TableHead>Valor en húmedo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Responsable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calibrations.map((c) => {
                const sensorName = sensors.find((s) => s.id === c.sensor_id)?.name ?? "—";
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{sensorName}</TableCell>
                    <TableCell>{c.dry_value}</TableCell>
                    <TableCell>{c.wet_value}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(c.calibrated_at).toLocaleString("es-GT")}</TableCell>
                    <TableCell>{c.calibrated_by ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
              {calibrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Sin calibraciones registradas.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Calibrar sensor</DialogTitle>
            <DialogDescription>
              Registra la lectura del sensor completamente seco y completamente húmedo para convertir el valor ADC en
              porcentaje de humedad. Se guarda en <code>sensor_calibrations</code>.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!selected) return;
              saveCalibration.mutate(
                {
                  sensor_id: selected.id,
                  dry_value: Number(secoRef.current?.value ?? 3180),
                  wet_value: Number(humedoRef.current?.value ?? 1320),
                  calibrated_by: demoUser.full_name,
                },
                {
                  onError: (err) => toast.error(err.message),
                  onSuccess: () => {
                    toast.success("Calibración guardada");
                    setSelected(null);
                  },
                },
              );
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="cal-sensor">Sensor</Label>
              <Input id="cal-sensor" readOnly value={selected?.name ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cal-seco">Valor en seco (ADC)</Label>
                <Input ref={secoRef} id="cal-seco" type="number" defaultValue={3180} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cal-humedo">Valor en húmedo (ADC)</Label>
                <Input ref={humedoRef} id="cal-humedo" type="number" defaultValue={1320} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveCalibration.isPending}>
                Guardar calibración
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
