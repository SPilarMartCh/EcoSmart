/**
 * EcoSmart — tipos de datos, alineados 1:1 con las tablas reales de Supabase
 * (public.crops, public.sensors, public.readings, etc). Ver
 * supabase/schema-reference.sql para el esquema completo.
 */

export type UUID = string;

export type CropStatus = "optimo" | "atencion" | "critico";

export interface Crop {
  id: UUID;
  user_id: UUID | null;
  device_id: string;
  name: string;
  variety: string | null;
  area_m2: number | null;
  planted_at: string | null;
  humidity_min: number;
  humidity_target: number;
  humidity_max: number;
  temp_min: number | null;
  temp_max: number | null;
  auto_irrigation: boolean;
  irrigation_duration_min: number;
  tiempo_minimo_entre_riegos_segundos: number;
  status: CropStatus;
  current_humidity: number | null;
  created_at: string;
  updated_at: string;
}

export type SensorType = "humedad_suelo" | "temperatura" | "humedad_ambiental" | "bomba";
export type SensorStatus = "activo" | "inactivo" | "error";

export interface Sensor {
  id: UUID;
  crop_id: UUID | null;
  device_id: string;
  name: string;
  type: SensorType;
  unit: string | null;
  location: string | null;
  status: SensorStatus;
  current_value: number | null;
  battery: number | null;
  last_reading_at: string | null;
  firmware: string | null;
  created_at: string;
}

export interface Reading {
  id: UUID;
  local_uuid: string | null;
  device_id: string;
  sensor_id: UUID | null;
  crop_id: UUID | null;
  soil_humidity: number | null;
  soil_humidity_adc_raw: number | null;
  temperature: number | null;
  ambient_humidity: number | null;
  valido: boolean;
  recorded_at: string;
}

export type IrrigationMode = "automatico" | "manual";

export interface IrrigationEvent {
  id: UUID;
  local_uuid: string | null;
  device_id: string;
  crop_id: UUID | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  mode: IrrigationMode;
  humidity_start: number | null;
  humidity_end: number | null;
  reason: string | null;
  reason_end: string | null;
  created_at: string;
}

export interface IrrigationConfig {
  device_id: string;
  active_crop_id: UUID | null;
  mode: IrrigationMode;
  pump_on: boolean;
  humidity_start_threshold: number;
  humidity_stop_threshold: number;
  default_duration_min: number;
  current_humidity: number | null;
  updated_at: string;
}

export interface SensorCalibration {
  id: UUID;
  sensor_id: UUID | null;
  device_id: string;
  dry_value: number;
  wet_value: number;
  calibrated_at: string;
  calibrated_by: string | null;
}

export type WeatherCondition = "soleado" | "nublado" | "lluvia" | "tormenta" | "parcial";

export interface WeatherForecast {
  id: UUID;
  device_id: string;
  day: string;
  condition: WeatherCondition;
  temp_max: number | null;
  temp_min: number | null;
  rain_probability: number | null;
  humidity: number | null;
  wind_kmh: number | null;
  created_at: string;
}

export interface SystemEvent {
  id: UUID;
  local_uuid: string | null;
  device_id: string;
  level: "info" | "warning" | "error";
  message: string;
  created_at: string;
}

export interface Profile {
  id: UUID;
  full_name: string | null;
  farm_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

/** Usuario de demostración: no hay Supabase Auth activo todavía en esta fase. */
export const demoUser = {
  full_name: "Pilar Martínez",
  email: "pilar@ecosmart.demo",
  farm_name: "Finca La Esperanza",
  role: "admin" as const,
};
