import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Sprout, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/eco/PageHeader";
import { DemoBadge } from "@/components/eco/DemoBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCrops, useUpdateCrop } from "@/lib/api";
import type { Crop, CropStatus } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/cultivos")({
  head: () => ({
    meta: [
      { title: "Mis cultivos — EcoSmart" },
      { name: "description", content: "Gestiona tus cultivos con umbrales de humedad y riego automático reales." },
      { property: "og:title", content: "Mis cultivos — EcoSmart" },
      { property: "og:description", content: "Configuración de humedad, temperatura y riego por cultivo." },
    ],
  }),
  component: CropsPage,
});

const statusLabel: Record<CropStatus, string> = {
  optimo: "Óptimo",
  atencion: "Atención",
  critico: "Crítico",
};

const statusClass: Record<CropStatus, string> = {
  optimo: "border-primary/30 bg-leaf-soft text-accent-foreground",
  atencion: "border-warn/30 bg-warn-soft text-earth",
  critico: "border-destructive/30 bg-destructive/10 text-destructive",
};

function CropsPage() {
  const { data: crops = [], isLoading } = useCrops();
  const updateCrop = useUpdateCrop();
  const [selected, setSelected] = useState<Crop | null>(null);

  const hminRef = useRef<HTMLInputElement>(null);
  const hobjRef = useRef<HTMLInputElement>(null);
  const hmaxRef = useRef<HTMLInputElement>(null);
  const tminRef = useRef<HTMLInputElement>(null);
  const tmaxRef = useRef<HTMLInputElement>(null);
  const durRef = useRef<HTMLInputElement>(null);
  const autoRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <PageHeader
        title="Mis cultivos"
        description="Parámetros de riego y estado actual de cada cultivo."
        actions={<DemoBadge label="Tabla crops en Supabase" />}
      />

      {!isLoading && crops.length === 0 ? (
        <div className="card-soft p-8 text-center text-sm text-muted-foreground">
          No hay cultivos guardados todavía para este dispositivo. Corre el script de datos de ejemplo (
          <code>supabase/seed-demo-data.sql</code>) o crea filas en la tabla <code>crops</code>.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {crops.map((crop) => (
          <article key={crop.id} className="card-soft p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-leaf-soft text-accent-foreground">
                  <Sprout className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="font-semibold">{crop.name}</h2>
                  <p className="text-xs text-muted-foreground">{crop.variety}</p>
                </div>
              </div>
              <Badge variant="outline" className={statusClass[crop.status]}>
                {statusLabel[crop.status]}
              </Badge>
            </div>

            <p className="mt-4 text-3xl font-semibold">{crop.current_humidity ?? "—"}%</p>
            <p className="text-xs text-muted-foreground">
              Mín {crop.humidity_min}% · Objetivo {crop.humidity_target}% · Máx {crop.humidity_max}%
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${crop.current_humidity ?? 0}%` }} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <dt>Superficie</dt>
                <dd className="text-sm font-medium text-foreground">{crop.area_m2 ?? "—"} m²</dd>
              </div>
              <div>
                <dt>Riego automático</dt>
                <dd className="text-sm font-medium text-foreground">{crop.auto_irrigation ? "Activo" : "Inactivo"}</dd>
              </div>
            </dl>

            <Button variant="secondary" className="mt-4 w-full" onClick={() => setSelected(crop)}>
              <Settings2 className="mr-1 h-4 w-4" aria-hidden /> Configurar cultivo
            </Button>
          </article>
        ))}
      </div>

      {crops.length > 0 ? (
        <div className="card-soft overflow-hidden">
          <div className="flex items-center justify-between p-5">
            <h2 className="text-lg font-semibold">Resumen de configuración</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cultivo</TableHead>
                  <TableHead>Variedad</TableHead>
                  <TableHead>Humedad (mín/obj/máx)</TableHead>
                  <TableHead>Temp. (°C)</TableHead>
                  <TableHead>Riego auto</TableHead>
                  <TableHead>Duración</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crops.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.variety}</TableCell>
                    <TableCell>
                      {c.humidity_min}% / {c.humidity_target}% / {c.humidity_max}%
                    </TableCell>
                    <TableCell>
                      {c.temp_min ?? "—"} – {c.temp_max ?? "—"}
                    </TableCell>
                    <TableCell>{c.auto_irrigation ? "Sí" : "No"}</TableCell>
                    <TableCell>{c.irrigation_duration_min} min</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar {selected?.name}</DialogTitle>
            <DialogDescription>
              Estos parámetros se guardan en Supabase y definirán la lógica de riego automático cuando el hardware
              esté conectado.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                updateCrop.mutate(
                  {
                    id: selected.id,
                    patch: {
                      humidity_min: Number(hminRef.current?.value ?? selected.humidity_min),
                      humidity_target: Number(hobjRef.current?.value ?? selected.humidity_target),
                      humidity_max: Number(hmaxRef.current?.value ?? selected.humidity_max),
                      temp_min: tminRef.current?.value ? Number(tminRef.current.value) : null,
                      temp_max: tmaxRef.current?.value ? Number(tmaxRef.current.value) : null,
                      irrigation_duration_min: Number(durRef.current?.value ?? selected.irrigation_duration_min),
                      auto_irrigation: autoRef.current?.getAttribute("data-state") === "checked",
                    },
                  },
                  {
                    onError: (err) => toast.error(err.message),
                    onSuccess: () => {
                      toast.success(`Configuración de ${selected.name} guardada`);
                      setSelected(null);
                    },
                  },
                );
              }}
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="hmin">Humedad mín. (%)</Label>
                  <Input ref={hminRef} id="hmin" type="number" defaultValue={selected.humidity_min} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hobj">Objetivo (%)</Label>
                  <Input ref={hobjRef} id="hobj" type="number" defaultValue={selected.humidity_target} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hmax">Máximo (%)</Label>
                  <Input ref={hmaxRef} id="hmax" type="number" defaultValue={selected.humidity_max} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="tmin">Temp. mínima (°C)</Label>
                  <Input ref={tminRef} id="tmin" type="number" defaultValue={selected.temp_min ?? undefined} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tmax">Temp. máxima (°C)</Label>
                  <Input ref={tmaxRef} id="tmax" type="number" defaultValue={selected.temp_max ?? undefined} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dur">Duración de riego (minutos)</Label>
                <Input ref={durRef} id="dur" type="number" defaultValue={selected.irrigation_duration_min} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <Label htmlFor="auto">Riego automático</Label>
                  <p className="text-xs text-muted-foreground">Aplicar histéresis con los umbrales definidos.</p>
                </div>
                <Switch ref={autoRef} id="auto" defaultChecked={selected.auto_irrigation} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateCrop.isPending}>
                  Guardar cambios
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
