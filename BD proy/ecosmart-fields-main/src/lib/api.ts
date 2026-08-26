/**
 * EcoSmart — capa de datos real (Supabase).
 *
 * Reemplaza a lib/mock-data.ts: en vez de arrays en memoria, cada hook lee
 * o escribe directamente en las tablas de Postgres a través de Supabase.
 * Todo se filtra por DEMO_DEVICE_ID porque el login sigue siendo de
 * demostración (sin Supabase Auth activo todavía) — es el mismo device_id
 * que usará el agente de la Raspberry Pi al sincronizar de verdad.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEMO_DEVICE_ID, isSupabaseConfigured, supabase } from "./supabaseClient";
import type {
  Crop,
  IrrigationConfig,
  IrrigationEvent,
  Reading,
  Sensor,
  SensorCalibration,
  WeatherForecast,
} from "./types";

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase no está configurado. Copia .env.example a .env y completa VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.",
    );
  }
}

/** Envuelve errores de Postgres/PostgREST (p. ej. RLS) en un mensaje legible. */
function explain(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.message?.toLowerCase().includes("row-level security") || error.code === "42501") {
    throw new Error(
      "Supabase rechazó la operación por Row Level Security (RLS). Revisa las políticas de la tabla o corre supabase/rls-demo-policies.sql.",
    );
  }
  throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Cultivos
// ---------------------------------------------------------------------------

export function useCrops() {
  return useQuery({
    queryKey: ["crops", DEMO_DEVICE_ID],
    queryFn: async (): Promise<Crop[]> => {
      assertConfigured();
      const { data, error } = await supabase
        .from("crops")
        .select("*")
        .eq("device_id", DEMO_DEVICE_ID)
        .order("name", { ascending: true });
      explain(error);
      return data ?? [];
    },
  });
}

export function useUpdateCrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Crop> }) => {
      assertConfigured();
      const { error } = await supabase.from("crops").update(patch).eq("id", id);
      explain(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crops", DEMO_DEVICE_ID] });
    },
  });
}

// ---------------------------------------------------------------------------
// Sensores
// ---------------------------------------------------------------------------

export function useSensors() {
  return useQuery({
    queryKey: ["sensors", DEMO_DEVICE_ID],
    queryFn: async (): Promise<Sensor[]> => {
      assertConfigured();
      const { data, error } = await supabase
        .from("sensors")
        .select("*")
        .eq("device_id", DEMO_DEVICE_ID)
        .order("name", { ascending: true });
      explain(error);
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Lecturas (readings)
// ---------------------------------------------------------------------------

export function useReadings(limit = 50) {
  return useQuery({
    queryKey: ["readings", DEMO_DEVICE_ID, limit],
    queryFn: async (): Promise<Reading[]> => {
      assertConfigured();
      const { data, error } = await supabase
        .from("readings")
        .select("*")
        .eq("device_id", DEMO_DEVICE_ID)
        .order("recorded_at", { ascending: false })
        .limit(limit);
      explain(error);
      return data ?? [];
    },
  });
}

/** Historial ordenado cronológicamente (ascendente) para las gráficas. */
export function useHumidityHistory(limit = 16) {
  const { data, ...rest } = useReadings(limit);
  const chartData = (data ?? [])
    .slice()
    .reverse()
    .map((r) => ({
      time: new Date(r.recorded_at).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" }),
      humedad: r.soil_humidity ?? 0,
      temperatura: r.temperature ?? 0,
      ambiental: r.ambient_humidity ?? 0,
    }));
  return { data: chartData, ...rest };
}

// ---------------------------------------------------------------------------
// Configuración de riego (histéresis) + control de bomba
// ---------------------------------------------------------------------------

export function useIrrigationConfig() {
  return useQuery({
    queryKey: ["irrigation_config", DEMO_DEVICE_ID],
    queryFn: async (): Promise<IrrigationConfig | null> => {
      assertConfigured();
      const { data, error } = await supabase
        .from("irrigation_config")
        .select("*")
        .eq("device_id", DEMO_DEVICE_ID)
        .maybeSingle();
      explain(error);
      return data;
    },
  });
}

export function useUpdateIrrigationConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<IrrigationConfig>) => {
      assertConfigured();
      const { error } = await supabase
        .from("irrigation_config")
        .update(patch)
        .eq("device_id", DEMO_DEVICE_ID);
      explain(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["irrigation_config", DEMO_DEVICE_ID] });
    },
  });
}

/** Inicia riego manual: enciende la bomba y registra el evento. */
export function useStartManualIrrigation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ humidityStart, cropId }: { humidityStart: number | null; cropId: string | null }) => {
      assertConfigured();
      const { error: cfgError } = await supabase
        .from("irrigation_config")
        .update({ pump_on: true })
        .eq("device_id", DEMO_DEVICE_ID);
      explain(cfgError);

      const { error: evError } = await supabase.from("irrigation_events").insert({
        device_id: DEMO_DEVICE_ID,
        crop_id: cropId,
        started_at: new Date().toISOString(),
        mode: "manual",
        humidity_start: humidityStart,
        reason: "Riego manual iniciado desde el panel",
      });
      explain(evError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["irrigation_config", DEMO_DEVICE_ID] });
      queryClient.invalidateQueries({ queryKey: ["irrigation_events", DEMO_DEVICE_ID] });
    },
  });
}

/** Detiene riego manual: apaga la bomba y cierra el evento abierto más reciente. */
export function useStopManualIrrigation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ humidityEnd }: { humidityEnd: number | null }) => {
      assertConfigured();
      const { error: cfgError } = await supabase
        .from("irrigation_config")
        .update({ pump_on: false })
        .eq("device_id", DEMO_DEVICE_ID);
      explain(cfgError);

      const { data: openEvent, error: findError } = await supabase
        .from("irrigation_events")
        .select("id, started_at")
        .eq("device_id", DEMO_DEVICE_ID)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      explain(findError);

      if (openEvent) {
        const startedAt = new Date(openEvent.started_at).getTime();
        const durationSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
        const { error: updError } = await supabase
          .from("irrigation_events")
          .update({
            ended_at: new Date().toISOString(),
            duration_seconds: durationSeconds,
            humidity_end: humidityEnd,
            reason_end: "Detenido por el operador",
          })
          .eq("id", openEvent.id);
        explain(updError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["irrigation_config", DEMO_DEVICE_ID] });
      queryClient.invalidateQueries({ queryKey: ["irrigation_events", DEMO_DEVICE_ID] });
    },
  });
}

// ---------------------------------------------------------------------------
// Historial de riego
// ---------------------------------------------------------------------------

export function useIrrigationEvents(limit = 100) {
  return useQuery({
    queryKey: ["irrigation_events", DEMO_DEVICE_ID, limit],
    queryFn: async (): Promise<IrrigationEvent[]> => {
      assertConfigured();
      const { data, error } = await supabase
        .from("irrigation_events")
        .select("*")
        .eq("device_id", DEMO_DEVICE_ID)
        .order("started_at", { ascending: false })
        .limit(limit);
      explain(error);
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Calibración de sensores
// ---------------------------------------------------------------------------

export function useCalibrations() {
  return useQuery({
    queryKey: ["sensor_calibrations", DEMO_DEVICE_ID],
    queryFn: async (): Promise<SensorCalibration[]> => {
      assertConfigured();
      const { data, error } = await supabase
        .from("sensor_calibrations")
        .select("*")
        .eq("device_id", DEMO_DEVICE_ID)
        .order("calibrated_at", { ascending: false });
      explain(error);
      return data ?? [];
    },
  });
}

export function useSaveCalibration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sensor_id: string; dry_value: number; wet_value: number; calibrated_by: string }) => {
      assertConfigured();
      const { error } = await supabase.from("sensor_calibrations").insert({
        device_id: DEMO_DEVICE_ID,
        sensor_id: input.sensor_id,
        dry_value: input.dry_value,
        wet_value: input.wet_value,
        calibrated_by: input.calibrated_by,
        calibrated_at: new Date().toISOString(),
      });
      explain(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensor_calibrations", DEMO_DEVICE_ID] });
    },
  });
}

// ---------------------------------------------------------------------------
// Clima
// ---------------------------------------------------------------------------

export function useWeatherForecast() {
  return useQuery({
    queryKey: ["weather_forecasts", DEMO_DEVICE_ID],
    queryFn: async (): Promise<WeatherForecast[]> => {
      assertConfigured();
      const { data, error } = await supabase
        .from("weather_forecasts")
        .select("*")
        .eq("device_id", DEMO_DEVICE_ID)
        .order("day", { ascending: true });
      explain(error);
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Estado del sistema (derivado, no es una tabla propia)
// ---------------------------------------------------------------------------

export function useSystemStatus() {
  const { data: config } = useIrrigationConfig();
  const { data: readings } = useReadings(1);
  const lastReading = readings?.[0];

  return {
    mode: isSupabaseConfigured ? "Conectado a Supabase" : "Sin configurar",
    internet: isSupabaseConfigured ? "Conectado" : "Sin conexión",
    device: DEMO_DEVICE_ID,
    last_sync: lastReading
      ? new Date(lastReading.recorded_at).toLocaleString("es-GT")
      : "Sin lecturas todavía",
    pump_on: config?.pump_on ?? false,
    demo_login: true,
  };
}
