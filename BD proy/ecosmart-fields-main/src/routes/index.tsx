import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, Droplets, Gauge, CloudSun, LineChart, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/eco/DemoBadge";
import heroFields from "@/assets/hero-fields.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoSmart — Riego inteligente para el campo moderno" },
      {
        name: "description",
        content:
          "EcoSmart es un panel de riego inteligente y agricultura de precisión: humedad del suelo, clima y control de bomba en un solo lugar.",
      },
      { property: "og:title", content: "EcoSmart — Riego inteligente para el campo moderno" },
      {
        property: "og:description",
        content: "Monitorea humedad, temperatura y riego automático desde un panel claro y moderno.",
      },
    ],
  }),
  component: Landing,
});

const benefits = [
  {
    icon: Droplets,
    title: "Riego automático con histéresis",
    text: "Inicia el riego al bajar del 45% de humedad y lo detiene al alcanzar el 65%, evitando encendidos constantes.",
  },
  {
    icon: Gauge,
    title: "Sensores en tiempo real",
    text: "Humedad de suelo, temperatura y humedad ambiental por parcela, con estado y calibración de cada sensor.",
  },
  {
    icon: CloudSun,
    title: "Decisiones con clima",
    text: "Si la probabilidad de lluvia es alta, EcoSmart recomienda posponer el riego y ahorrar agua.",
  },
  {
    icon: LineChart,
    title: "Historial y trazabilidad",
    text: "Cada evento de riego queda registrado con modo, duración, humedad inicial y final, y su motivo.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-navy/10 bg-navy text-navy-foreground">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">EcoSmart</span>
          <nav className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" className="text-navy-foreground hover:bg-navy-muted">
              <Link to="/auth">Iniciar sesión</Link>
            </Button>
            <Button asChild>
              <Link to="/dashboard">Ver demostración</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-navy text-navy-foreground">
        <img
          src={heroFields}
          alt="Vista aérea de campos de cultivo con líneas de riego al atardecer"
          width={1600}
          height={1008}
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <DemoBadge label="Versión demo · datos simulados" />
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Soluciones inteligentes para el campo moderno
            </h1>
            <p className="mt-5 max-w-xl text-base text-navy-foreground/80 sm:text-lg">
              EcoSmart monitorea la humedad del suelo, la temperatura y el clima para automatizar el riego de cada
              cultivo. Diseñado para conectarse con un ESP32 y sensores de humedad; por ahora funciona con datos
              simulados de demostración.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Iniciar sesión <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-navy-foreground/30 bg-transparent text-navy-foreground hover:bg-navy-muted hover:text-navy-foreground"
              >
                <Link to="/dashboard">Ver demostración</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-navy-foreground/60">
              No hay hardware conectado todavía: todos los valores mostrados son simulados.
            </p>
          </div>

          <div className="grid gap-4 self-center rounded-3xl border border-navy-foreground/15 bg-navy/70 p-5 backdrop-blur sm:grid-cols-2">
            {[
              { label: "Humedad del suelo", value: "63%" },
              { label: "Temperatura", value: "24.5 °C" },
              { label: "Humedad ambiental", value: "72%" },
              { label: "Bomba", value: "OFF" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-navy-muted/70 p-4">
                <p className="text-xs text-navy-foreground/70">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Un sistema de riego que piensa por ti</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          EcoSmart combina lecturas de sensores, configuración por cultivo y pronóstico del tiempo para decidir cuándo
          regar, cuánto tiempo y cuándo es mejor esperar.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {benefits.map((b) => (
            <article key={b.title} className="card-soft p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-leaf-soft text-accent-foreground">
                <b.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Listo para crecer con tu finca</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              La estructura de datos ya contempla usuarios, cultivos, sensores, lecturas, eventos de riego, calibración
              y pronósticos, para conectar una base de datos real y el ESP32 más adelante.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/dashboard">Explorar el panel</Link>
          </Button>
        </div>
      </section>

      <footer className="bg-navy py-8 text-navy-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" aria-hidden /> EcoSmart · Proyecto de riego inteligente
          </span>
          <span className="text-navy-foreground/60">Prototipo académico · datos simulados</span>
        </div>
      </footer>
    </div>
  );
}
