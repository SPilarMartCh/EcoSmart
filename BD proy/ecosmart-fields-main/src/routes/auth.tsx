import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoNotice } from "@/components/eco/DemoBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceder a EcoSmart — Riego inteligente" },
      { name: "description", content: "Inicia sesión o crea tu cuenta demo de EcoSmart para ver el panel de riego." },
      { property: "og:title", content: "Acceder a EcoSmart" },
      { property: "og:description", content: "Acceso demo al panel de riego inteligente EcoSmart." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Estructura preparada para Supabase Auth: aquí irá signInWithPassword / signUp.
  const submit = (e: React.FormEvent, kind: "login" | "register") => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success(kind === "login" ? "Sesión demo iniciada" : "Cuenta demo creada");
      navigate({ to: "/dashboard" });
    }, 500);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-navy p-12 text-navy-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold">EcoSmart</span>
        </Link>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Soluciones inteligentes para el campo moderno
          </h2>
          <p className="mt-4 max-w-md text-navy-foreground/75">
            Controla el riego de tus cultivos con datos de humedad, temperatura y clima desde un solo panel.
          </p>
        </div>
        <p className="text-xs text-navy-foreground/50">Prototipo con datos simulados · sin hardware conectado</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold">EcoSmart</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Accede a tu panel de riego inteligente.</p>

          <Tabs defaultValue="login" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form className="space-y-4" onSubmit={(e) => submit(e, "login")}>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input id="email" type="email" placeholder="pilar@ecosmart.demo" defaultValue="pilar@ecosmart.demo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" type="password" placeholder="••••••••" defaultValue="demo1234" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando…" : "Iniciar sesión"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form className="space-y-4" onSubmit={(e) => submit(e, "register")}>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input id="name" placeholder="Tu nombre" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farm">Nombre de la finca</Label>
                  <Input id="farm" placeholder="Finca La Esperanza" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remail">Correo electrónico</Label>
                  <Input id="remail" type="email" placeholder="correo@ejemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rpassword">Contraseña</Label>
                  <Input id="rpassword" type="password" placeholder="Mínimo 8 caracteres" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creando…" : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <DemoNotice>
              Autenticación de demostración: cualquier dato te lleva al panel. La estructura está lista para conectar
              Supabase Auth más adelante.
            </DemoNotice>
          </div>
        </div>
      </div>
    </div>
  );
}
