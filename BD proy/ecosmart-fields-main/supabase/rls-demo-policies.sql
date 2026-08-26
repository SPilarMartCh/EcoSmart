

alter table crops                enable row level security;
alter table sensors              enable row level security;
alter table readings             enable row level security;
alter table irrigation_events    enable row level security;
alter table irrigation_config    enable row level security;
alter table sensor_calibrations  enable row level security;
alter table weather_forecasts    enable row level security;
alter table system_events        enable row level security;

-- Cultivos: lectura y escritura abiertas (demo)
drop policy if exists "demo_crops_all" on crops;
create policy "demo_crops_all" on crops for all using (true) with check (true);

-- Sensores: solo lectura desde la app (los escribe el agente de la Raspberry)
drop policy if exists "demo_sensors_select" on sensors;
create policy "demo_sensors_select" on sensors for select using (true);
drop policy if exists "demo_sensors_write" on sensors;
create policy "demo_sensors_write" on sensors for all using (true) with check (true);

-- Lecturas: lectura abierta, escritura abierta (la usa la Raspberry al sincronizar)
drop policy if exists "demo_readings_all" on readings;
create policy "demo_readings_all" on readings for all using (true) with check (true);

-- Eventos de riego: la app crea/edita al iniciar y detener riego manual
drop policy if exists "demo_irrigation_events_all" on irrigation_events;
create policy "demo_irrigation_events_all" on irrigation_events for all using (true) with check (true);

-- Configuración de riego: la app la lee y actualiza (modo, umbrales, bomba)
drop policy if exists "demo_irrigation_config_all" on irrigation_config;
create policy "demo_irrigation_config_all" on irrigation_config for all using (true) with check (true);

-- Calibraciones: la app inserta nuevas calibraciones
drop policy if exists "demo_sensor_calibrations_all" on sensor_calibrations;
create policy "demo_sensor_calibrations_all" on sensor_calibrations for all using (true) with check (true);

-- Clima: normalmente solo lo escribiría un backend/cron, la app solo lee
drop policy if exists "demo_weather_forecasts_select" on weather_forecasts;
create policy "demo_weather_forecasts_select" on weather_forecasts for select using (true);
drop policy if exists "demo_weather_forecasts_write" on weather_forecasts;
create policy "demo_weather_forecasts_write" on weather_forecasts for all using (true) with check (true);

-- Eventos del sistema: los escribe el agente de la Raspberry
drop policy if exists "demo_system_events_all" on system_events;
create policy "demo_system_events_all" on system_events for all using (true) with check (true);
