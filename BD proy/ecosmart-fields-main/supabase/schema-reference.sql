-- =============================================================================
-- EcoSmart — esquema de referencia (Supabase / PostgreSQL)
--
-- Este archivo documenta el esquema REAL que ya existe en el proyecto
-- Supabase (creado a mano en el dashboard). Está pensado para:
--   1. Servir de referencia versionada en el repositorio (el dashboard de
--      Supabase no se versiona solo).
--   2. Poder recrear el esquema desde cero en un proyecto nuevo.
--   3. Documentar las buenas prácticas aplicadas: llaves foráneas, checks,
--      índices, y comentarios de cada tabla/columna.
--
-- No lo corras contra el proyecto actual si las tablas ya existen (usa
-- CREATE TABLE IF NOT EXISTS a propósito para que sea seguro re-ejecutarlo).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- crops — un cultivo (bancal) por fila, con sus umbrales de riego.
-- -----------------------------------------------------------------------------
create table if not exists crops (
  id                                    uuid primary key default gen_random_uuid(),
  user_id                               uuid,                       -- reservado para Supabase Auth (Fase 4)
  device_id                             text not null,              -- dispositivo/Raspberry dueño de este cultivo
  name                                  text not null,
  variety                               text,
  area_m2                               numeric check (area_m2 >= 0),
  planted_at                            date,
  humidity_min                          numeric not null check (humidity_min between 0 and 100),
  humidity_target                       numeric not null check (humidity_target between 0 and 100),
  humidity_max                          numeric not null check (humidity_max between 0 and 100),
  temp_min                              numeric,
  temp_max                              numeric,
  auto_irrigation                       boolean not null default true,
  irrigation_duration_min               integer not null default 15 check (irrigation_duration_min > 0),
  tiempo_minimo_entre_riegos_segundos   integer not null default 1800 check (tiempo_minimo_entre_riegos_segundos >= 0),
  status                                text not null default 'optimo' check (status in ('optimo', 'atencion', 'critico')),
  current_humidity                      numeric check (current_humidity between 0 and 100),
  created_at                            timestamptz not null default now(),
  updated_at                            timestamptz not null default now(),
  -- Coherencia de los umbrales: mínimo <= objetivo <= máximo.
  constraint crops_humidity_order check (humidity_min <= humidity_target and humidity_target <= humidity_max)
);
comment on table crops is 'Un cultivo/bancal por fila. Define los umbrales de riego que usa la histéresis.';

create index if not exists idx_crops_device_id on crops (device_id);

-- -----------------------------------------------------------------------------
-- sensors — un sensor físico (o virtual, en simulador) por fila.
-- -----------------------------------------------------------------------------
create table if not exists sensors (
  id               uuid primary key default gen_random_uuid(),
  crop_id          uuid references crops (id) on delete set null,
  device_id        text not null,
  name             text not null,
  type             text not null check (type in ('humedad_suelo', 'temperatura', 'humedad_ambiental', 'bomba')),
  unit             text,
  location         text,
  status           text not null default 'activo' check (status in ('activo', 'inactivo', 'error')),
  current_value    numeric,
  battery          numeric check (battery between 0 and 100),
  last_reading_at  timestamptz,
  firmware         text,
  created_at       timestamptz not null default now()
);
comment on table sensors is 'Inventario de sensores/actuadores por dispositivo. current_value es el último valor conocido (caché de lectura).';

create index if not exists idx_sensors_device_id on sensors (device_id);
create index if not exists idx_sensors_crop_id on sensors (crop_id);

-- -----------------------------------------------------------------------------
-- readings — serie de tiempo de lecturas de sensores. Tabla de mayor volumen.
-- -----------------------------------------------------------------------------
create table if not exists readings (
  id                      uuid primary key default gen_random_uuid(),
  local_uuid              text,                          -- uuid generado en SQLite antes de sincronizar (dedup/trazabilidad)
  device_id               text not null,
  sensor_id               uuid references sensors (id) on delete set null,
  crop_id                 uuid references crops (id) on delete set null,
  soil_humidity           numeric check (soil_humidity between 0 and 100),
  soil_humidity_adc_raw   integer,
  temperature             numeric,
  ambient_humidity        numeric check (ambient_humidity between 0 and 100),
  valido                  boolean not null default true, -- false = descartada por el agente (fuera de rango, sensor con error, etc.)
  recorded_at             timestamptz not null default now()
);
comment on table readings is 'Serie de tiempo de lecturas. Es la tabla de mayor volumen: indexada por (device_id, recorded_at) para las gráficas del dashboard.';

-- Índice compuesto: la app siempre filtra por device_id y ordena por
-- recorded_at descendente (ver src/lib/api.ts -> useReadings). Este índice
-- cubre exactamente ese patrón de consulta.
create index if not exists idx_readings_device_recorded on readings (device_id, recorded_at desc);
-- Evita subir el mismo registro dos veces si el agente reintenta una
-- sincronización que en realidad ya se había completado.
create unique index if not exists idx_readings_local_uuid on readings (local_uuid) where local_uuid is not null;

-- -----------------------------------------------------------------------------
-- irrigation_events — historial: cada ciclo de riego, con inicio/fin.
-- -----------------------------------------------------------------------------
create table if not exists irrigation_events (
  id                 uuid primary key default gen_random_uuid(),
  local_uuid         text,
  device_id          text not null,
  crop_id            uuid references crops (id) on delete set null,
  started_at         timestamptz not null,
  ended_at           timestamptz,
  duration_seconds   integer check (duration_seconds >= 0),
  mode               text not null check (mode in ('automatico', 'manual')),
  humidity_start     numeric check (humidity_start between 0 and 100),
  humidity_end       numeric check (humidity_end between 0 and 100),
  reason             text,
  reason_end         text,
  created_at         timestamptz not null default now(),
  -- Un evento no puede terminar antes de empezar.
  constraint irrigation_events_dates check (ended_at is null or ended_at >= started_at)
);
comment on table irrigation_events is 'Historial de riego. ended_at IS NULL = riego en curso (evento abierto).';

create index if not exists idx_irrigation_events_device_started on irrigation_events (device_id, started_at desc);
create unique index if not exists idx_irrigation_events_local_uuid on irrigation_events (local_uuid) where local_uuid is not null;
-- Acelera la búsqueda de "el evento abierto más reciente" que usa el botón
-- de detener riego manual (ver useStopManualIrrigation en api.ts).
create index if not exists idx_irrigation_events_open on irrigation_events (device_id, started_at desc) where ended_at is null;

-- -----------------------------------------------------------------------------
-- irrigation_config — una fila por dispositivo: modo actual, umbrales, bomba.
-- -----------------------------------------------------------------------------
create table if not exists irrigation_config (
  device_id                    text primary key,     -- 1 fila por dispositivo (no uuid: es la llave natural)
  active_crop_id                uuid references crops (id) on delete set null,
  mode                          text not null default 'automatico' check (mode in ('automatico', 'manual')),
  pump_on                       boolean not null default false,
  humidity_start_threshold      numeric not null check (humidity_start_threshold between 0 and 100),
  humidity_stop_threshold       numeric not null check (humidity_stop_threshold between 0 and 100),
  default_duration_min          integer not null default 15 check (default_duration_min > 0),
  current_humidity              numeric check (current_humidity between 0 and 100),
  updated_at                    timestamptz not null default now(),
  constraint irrigation_config_thresholds check (humidity_start_threshold <= humidity_stop_threshold)
);
comment on table irrigation_config is 'Estado y configuración de riego, una fila por device_id (no por usuario: ver docs/DATABASE.md).';

-- -----------------------------------------------------------------------------
-- sensor_calibrations — historial de calibraciones seco/húmedo por sensor.
-- -----------------------------------------------------------------------------
create table if not exists sensor_calibrations (
  id              uuid primary key default gen_random_uuid(),
  sensor_id       uuid references sensors (id) on delete cascade,
  device_id       text not null,
  dry_value       integer not null,
  wet_value       integer not null,
  calibrated_at   timestamptz not null default now(),
  calibrated_by   text,
  constraint sensor_calibrations_values check (dry_value <> wet_value)
);
comment on table sensor_calibrations is 'Cada fila es UNA calibración (append-only). La más reciente por sensor_id es la vigente.';

create index if not exists idx_sensor_calibrations_sensor on sensor_calibrations (sensor_id, calibrated_at desc);

-- -----------------------------------------------------------------------------
-- weather_forecasts — pronóstico por día, usado para recomendar/posponer riego.
-- -----------------------------------------------------------------------------
create table if not exists weather_forecasts (
  id                uuid primary key default gen_random_uuid(),
  device_id         text not null,
  day               date not null,
  condition         text not null check (condition in ('soleado', 'nublado', 'lluvia', 'tormenta', 'parcial')),
  temp_max          numeric,
  temp_min          numeric,
  rain_probability  numeric check (rain_probability between 0 and 100),
  humidity          numeric check (humidity between 0 and 100),
  wind_kmh          numeric check (wind_kmh >= 0),
  created_at        timestamptz not null default now(),
  unique (device_id, day) -- un solo pronóstico por dispositivo y día (evita duplicados al recargar)
);
comment on table weather_forecasts is 'Pronóstico por dispositivo/día. unique(device_id, day) evita filas duplicadas.';

-- -----------------------------------------------------------------------------
-- system_events — bitácora técnica (info/warning/error) del agente.
-- -----------------------------------------------------------------------------
create table if not exists system_events (
  id           uuid primary key default gen_random_uuid(),
  local_uuid   text,
  device_id    text not null,
  level        text not null check (level in ('info', 'warning', 'error')),
  message      text not null,
  created_at   timestamptz not null default now()
);
comment on table system_events is 'Bitácora técnica del agente (arranque, errores de sincronización, sensores en falla, etc).';

create index if not exists idx_system_events_device_created on system_events (device_id, created_at desc);
create unique index if not exists idx_system_events_local_uuid on system_events (local_uuid) where local_uuid is not null;

-- -----------------------------------------------------------------------------
-- profiles — perfil de usuario (Fase 4, cuando se active Supabase Auth).
-- -----------------------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  farm_name   text,
  role        text not null default 'operador' check (role in ('admin', 'operador')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table profiles is 'Extiende auth.users con datos de la app. Vacía mientras el login siga siendo de demostración.';
