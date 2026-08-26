/**
 * EcoSmart — cliente de Supabase.
 *
 * Usa las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
 * (ver .env.example). La "anon key" es pública por diseño: Supabase la
 * protege con Row Level Security (RLS), no ocultándola.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // No lanzamos error para que la app siga renderizando con un aviso claro
  // en pantalla en vez de una página en blanco.
  // eslint-disable-next-line no-console
  console.warn(
    "[EcoSmart] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.example a .env y complétalo.",
  );
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: false,
    },
  },
);

/**
 * En esta fase el login es de demostración (sin Supabase Auth todavía),
 * así que todas las tablas se filtran por un device_id fijo en vez de por
 * usuario autenticado. Esto es lo que usará también el agente Python de la
 * Raspberry Pi al sincronizar (ver raspberry/.env -> DEVICE_ID).
 */
export const DEMO_DEVICE_ID = (import.meta.env.VITE_DEVICE_ID as string | undefined) || "ecosmart-pi-01";
