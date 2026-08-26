import { createFileRoute } from "@tanstack/react-router";
import { CloudRain, CloudSun, Sun, Cloud, CloudLightning, Wind, Droplets } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/eco/PageHeader";
import { DemoBadge, DemoNotice } from "@/components/eco/DemoBadge";
import { useWeatherForecast } from "@/lib/api";
import type { WeatherCondition } from "@/lib/types";

export const Route = createFileRoute("/dashboard/clima")({
  head: () => ({
    meta: [
      { title: "Clima y recomendación de riego — EcoSmart" },
      { name: "description", content: "Pronóstico y recomendación de riego según probabilidad de lluvia." },
      { property: "og:title", content: "Clima y recomendación de riego — EcoSmart" },
      { property: "og:description", content: "Decide cuándo regar según la probabilidad de lluvia." },
    ],
  }),
  component: WeatherPage,
});

const icons: Record<WeatherCondition, LucideIcon> = {
  soleado: Sun,
  nublado: Cloud,
  lluvia: CloudRain,
  tormenta: CloudLightning,
  parcial: CloudSun,
};

const labels: Record<WeatherCondition, string> = {
  soleado: "Soleado",
  nublado: "Nublado",
  lluvia: "Lluvia",
  tormenta: "Tormenta",
  parcial: "Parcialmente nublado",
};

function WeatherPage() {
  const { data: forecast = [], isLoading } = useWeatherForecast();
  const today = forecast[0];
  const recommend = today ? (today.rain_probability ?? 0) < 50 : true;

  return (
    <>
      <PageHeader
        title="Clima"
        description="Pronóstico y su impacto sobre el plan de riego."
        actions={<DemoBadge label="Tabla weather_forecasts en Supabase" />}
      />

      {!isLoading && forecast.length === 0 ? (
        <div className="card-soft p-8 text-center text-sm text-muted-foreground">
          No hay pronóstico cargado todavía. Este proyecto aún no está conectado a un servicio meteorológico real:
          carga filas de ejemplo en <code>weather_forecasts</code> (ver <code>supabase/seed-demo-data.sql</code>).
        </div>
      ) : null}

      {today ? (
        <div
          className={`card-soft p-6 ${recommend ? "border-primary/30 bg-leaf-soft/50" : "border-sky/30 bg-sky-soft/60"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Recomendación de hoy</p>
              <h2 className="mt-1 text-2xl font-semibold">
                {recommend ? "Riego recomendado" : "No se recomienda regar"}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {recommend
                  ? "Baja probabilidad de lluvia: el riego programado puede ejecutarse normalmente."
                  : `Probabilidad de lluvia del ${today.rain_probability}%. Conviene posponer el riego y aprovechar el agua de lluvia.`}
              </p>
            </div>
            <div className="flex items-center gap-4 rounded-2xl bg-card px-5 py-4">
              <CloudRain className="h-9 w-9 text-sky" aria-hidden />
              <div>
                <p className="text-xs text-muted-foreground">Prob. de lluvia</p>
                <p className="text-3xl font-semibold">{today.rain_probability}%</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {forecast.map((d) => {
          const Icon = icons[d.condition];
          return (
            <article key={d.id} className="card-soft p-5 text-center">
              <p className="text-sm font-medium text-muted-foreground">{d.day}</p>
              <Icon className="mx-auto mt-3 h-10 w-10 text-sky" aria-hidden />
              <p className="mt-2 text-sm">{labels[d.condition]}</p>
              <p className="mt-3 text-2xl font-semibold">
                {d.temp_max}° <span className="text-base text-muted-foreground">/ {d.temp_min}°</span>
              </p>
              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center justify-center gap-1.5">
                  <CloudRain className="h-3.5 w-3.5" aria-hidden /> Lluvia {d.rain_probability}%
                </p>
                <p className="flex items-center justify-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5" aria-hidden /> Humedad {d.humidity}%
                </p>
                <p className="flex items-center justify-center gap-1.5">
                  <Wind className="h-3.5 w-3.5" aria-hidden /> Viento {d.wind_kmh} km/h
                </p>
              </div>
              <p
                className={`mt-4 rounded-xl px-3 py-1.5 text-xs font-medium ${
                  (d.rain_probability ?? 0) >= 50 ? "bg-sky-soft text-sky" : "bg-leaf-soft text-accent-foreground"
                }`}
              >
                {(d.rain_probability ?? 0) >= 50 ? "No regar" : "Riego posible"}
              </p>
            </article>
          );
        })}
      </div>

      <DemoNotice>
        Los datos meteorológicos vienen de la tabla <code>weather_forecasts</code> en Supabase, pero todavía no están
        conectados a un servicio de pronóstico real — hoy son valores de ejemplo que tú (o el backend) cargan a mano.
      </DemoNotice>
    </>
  );
}
