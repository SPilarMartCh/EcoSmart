import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { PageHeader } from "@/components/eco/PageHeader";
import { DemoNotice } from "@/components/eco/DemoBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIrrigationConfig, useSystemStatus, useUpdateIrrigationConfig } from "@/lib/api";
import { demoUser } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — EcoSmart" },
      { name: "description", content: "Perfil, notificaciones, riego automático y ajustes del sistema EcoSmart." },
      { property: "og:title", content: "Configuración — EcoSmart" },
      { property: "og:description", content: "Ajusta tu perfil y las preferencias del sistema de riego." },
    ],
  }),
  component: SettingsPage,
});

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="card-soft p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function ToggleRow({ id, label, hint, defaultChecked = false }: { id: string; label: string; hint: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} defaultChecked={defaultChecked} />
    </div>
  );
}

function SettingsPage() {
  const { data: config } = useIrrigationConfig();
  const updateConfig = useUpdateIrrigationConfig();
  const status = useSystemStatus();

  const umbralMinRef = useRef<HTMLInputElement>(null);
  const umbralMaxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!config) return;
    if (umbralMinRef.current) umbralMinRef.current.value = String(config.humidity_start_threshold);
    if (umbralMaxRef.current) umbralMaxRef.current.value = String(config.humidity_stop_threshold);
  }, [config]);

  return (
    <>
      <PageHeader title="Configuración" description="Preferencias de la cuenta y del sistema de riego." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Perfil de usuario" description="Datos de la cuenta y de la finca (login de demostración).">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input id="nombre" defaultValue={demoUser.full_name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="correo">Correo electrónico</Label>
            <Input id="correo" type="email" defaultValue={demoUser.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finca">Nombre de la finca</Label>
            <Input id="finca" defaultValue={demoUser.farm_name} />
          </div>
          <Button onClick={() => toast("El perfil se guardará aquí cuando actives Supabase Auth")}>
            Guardar perfil
          </Button>
        </Section>

        <Section title="Notificaciones" description="Cuándo quieres recibir avisos del sistema.">
          <ToggleRow id="n1" label="Humedad crítica" hint="Aviso cuando un cultivo baja del mínimo." defaultChecked />
          <ToggleRow id="n2" label="Riego iniciado / detenido" hint="Notificar cada ciclo de riego." defaultChecked />
          <ToggleRow id="n3" label="Sensor sin conexión" hint="Avisar si un sensor deja de reportar." defaultChecked />
          <ToggleRow id="n4" label="Resumen diario por correo" hint="Reporte con lecturas y consumo estimado." />
          <p className="text-xs text-muted-foreground">
            Las notificaciones todavía no se envían de verdad: falta el servicio de correo/push (fuera del alcance
            actual).
          </p>
        </Section>

        <Section title="Riego automático" description="Parámetros globales guardados en irrigation_config.">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="umbral-min">Umbral de inicio (%)</Label>
              <Input ref={umbralMinRef} id="umbral-min" type="number" defaultValue={config?.humidity_start_threshold ?? 45} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="umbral-max">Umbral de paro (%)</Label>
              <Input ref={umbralMaxRef} id="umbral-max" type="number" defaultValue={config?.humidity_stop_threshold ?? 65} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dur-global">Duración por defecto</Label>
            <Select defaultValue={String(config?.default_duration_min ?? 15)}>
              <SelectTrigger id="dur-global">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["5", "10", "15", "20", "30"].map((d) => (
                  <SelectItem key={d} value={d}>
                    {d} minutos
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ToggleRow
            id="a1"
            label="Posponer riego si hay lluvia prevista"
            hint="Omitir el ciclo cuando la probabilidad supera el 50%."
            defaultChecked
          />
          <Button
            onClick={() =>
              updateConfig.mutate(
                {
                  humidity_start_threshold: Number(umbralMinRef.current?.value ?? 45),
                  humidity_stop_threshold: Number(umbralMaxRef.current?.value ?? 65),
                },
                {
                  onError: (e) => toast.error(e.message),
                  onSuccess: () => toast.success("Ajustes de riego guardados"),
                },
              )
            }
            disabled={updateConfig.isPending}
          >
            Guardar ajustes
          </Button>
        </Section>

        <Section title="Sistema" description="Estado general e integración con hardware.">
          <div className="space-y-2">
            <Label htmlFor="intervalo">Intervalo de lectura de sensores</Label>
            <Select defaultValue="15">
              <SelectTrigger id="intervalo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["5", "15", "30", "60"].map((d) => (
                  <SelectItem key={d} value={d}>
                    Cada {d} minutos
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Este valor lo controla hoy <code>SENSOR_READ_INTERVAL_SECONDS</code> en el <code>.env</code> de la
              Raspberry Pi, no la app web.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unidad">Unidad de temperatura</Label>
            <Select defaultValue="c">
              <SelectTrigger id="unidad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="c">Celsius (°C)</SelectItem>
                <SelectItem value="f">Fahrenheit (°F)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-xl border border-border px-4 py-3 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Dispositivo</span>
              <span>{status.device}</span>
            </p>
            <p className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Conexión a Supabase</span>
              <span>{status.internet}</span>
            </p>
            <p className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Última lectura</span>
              <span>{status.last_sync}</span>
            </p>
          </div>
        </Section>
      </div>

      <DemoNotice>
        Los umbrales de riego ya se guardan de verdad en Supabase. El perfil y las notificaciones siguen siendo de
        demostración porque el login real (Supabase Auth) todavía no está activo.
      </DemoNotice>
    </>
  );
}
