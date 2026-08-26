

do $$
declare
  v_device_id text := 'ecosmart-pi-01';
  v_crop_tomate uuid := gen_random_uuid();
  v_crop_lechuga uuid := gen_random_uuid();
  v_crop_chile uuid := gen_random_uuid();
  v_sensor_humedad_1 uuid := gen_random_uuid();
  v_sensor_humedad_2 uuid := gen_random_uuid();
  v_sensor_humedad_3 uuid := gen_random_uuid();
  v_sensor_temp uuid := gen_random_uuid();
  v_sensor_bomba uuid := gen_random_uuid();
  i int;
begin

  -- ---------------------------------------------------------------------
  -- Cultivos
  -- ---------------------------------------------------------------------
  insert into crops (id, user_id, device_id, name, variety, area_m2, planted_at,
                      humidity_min, humidity_target, humidity_max, temp_min, temp_max,
                      auto_irrigation, irrigation_duration_min, tiempo_minimo_entre_riegos_segundos,
                      status, current_humidity)
  values
    (v_crop_tomate, null, v_device_id, 'Tomate', 'Río Grande', 24, current_date - interval '45 days',
     40, 60, 80, 18, 29, true, 15, 3600, 'optimo', 58),
    (v_crop_lechuga, null, v_device_id, 'Lechuga', 'Great Lakes', 12, current_date - interval '20 days',
     45, 65, 85, 12, 24, true, 10, 3600, 'atencion', 41),
    (v_crop_chile, null, v_device_id, 'Chile Pimiento', 'California Wonder', 18, current_date - interval '60 days',
     35, 55, 75, 20, 32, false, 20, 5400, 'critico', 28);

  -- ---------------------------------------------------------------------
  -- Sensores
  -- ---------------------------------------------------------------------
  insert into sensors (id, crop_id, device_id, name, type, unit, location, status,
                        current_value, battery, last_reading_at, firmware)
  values
    (v_sensor_humedad_1, v_crop_tomate, v_device_id, 'Sensor humedad — Tomate', 'humedad_suelo', '%', 'Bancal A', 'activo', 58, 87, now(), 'v1.4.0'),
    (v_sensor_humedad_2, v_crop_lechuga, v_device_id, 'Sensor humedad — Lechuga', 'humedad_suelo', '%', 'Bancal B', 'activo', 41, 62, now(), 'v1.4.0'),
    (v_sensor_humedad_3, v_crop_chile, v_device_id, 'Sensor humedad — Chile', 'humedad_suelo', '%', 'Bancal C', 'error', 28, 15, now() - interval '3 hours', 'v1.3.2'),
    (v_sensor_temp, null, v_device_id, 'Sensor DHT22', 'temperatura', '°C', 'Estación central', 'activo', 24.5, 91, now(), 'v1.4.0'),
    (v_sensor_bomba, null, v_device_id, 'Relé de bomba', 'bomba', null, 'Cuarto de bombeo', 'activo', 0, null, now(), 'v1.4.0');

  -- ---------------------------------------------------------------------
  -- Lecturas (últimas 8 horas, cada 30 min, por cultivo)
  -- ---------------------------------------------------------------------
  for i in 0..15 loop
    insert into readings (device_id, sensor_id, crop_id, soil_humidity, soil_humidity_adc_raw,
                           temperature, ambient_humidity, valido, recorded_at)
    values (
      v_device_id, v_sensor_humedad_1, v_crop_tomate,
      round((55 + random() * 10)::numeric, 1),
      1500 + floor(random() * 200)::int,
      round((22 + random() * 6)::numeric, 1),
      round((55 + random() * 15)::numeric, 1),
      true,
      now() - ((15 - i) * interval '30 minutes')
    );
  end loop;

  -- ---------------------------------------------------------------------
  -- Eventos de riego (últimos días)
  -- ---------------------------------------------------------------------
  insert into irrigation_events (device_id, crop_id, started_at, ended_at, duration_seconds,
                                  mode, humidity_start, humidity_end, reason, reason_end)
  values
    (v_device_id, v_crop_tomate, now() - interval '1 day 3 hours', now() - interval '1 day 2 hours 45 minutes', 900,
     'automatico', 38, 61, 'Humedad por debajo del umbral mínimo (40%)', 'Umbral objetivo alcanzado'),
    (v_device_id, v_crop_lechuga, now() - interval '2 days 5 hours', now() - interval '2 days 4 hours 50 minutes', 600,
     'manual', 42, 63, 'Riego manual iniciado desde el panel', 'Detenido por el operador'),
    (v_device_id, v_crop_chile, now() - interval '3 days 1 hours', now() - interval '3 days 0 hours 45 minutes', 900,
     'automatico', 30, 55, 'Humedad por debajo del umbral mínimo (35%)', 'Umbral objetivo alcanzado');

  -- ---------------------------------------------------------------------
  -- Configuración de riego (una fila por dispositivo)
  -- ---------------------------------------------------------------------
  insert into irrigation_config (device_id, active_crop_id, mode, pump_on, humidity_start_threshold,
                                  humidity_stop_threshold, default_duration_min, current_humidity, updated_at)
  values (v_device_id, v_crop_tomate, 'automatico', false, 45, 65, 15, 58, now())
  on conflict (device_id) do update set
    active_crop_id = excluded.active_crop_id,
    mode = excluded.mode,
    pump_on = excluded.pump_on,
    humidity_start_threshold = excluded.humidity_start_threshold,
    humidity_stop_threshold = excluded.humidity_stop_threshold,
    default_duration_min = excluded.default_duration_min,
    current_humidity = excluded.current_humidity,
    updated_at = now();

  -- ---------------------------------------------------------------------
  -- Calibraciones
  -- ---------------------------------------------------------------------
  insert into sensor_calibrations (sensor_id, device_id, dry_value, wet_value, calibrated_at, calibrated_by)
  values
    (v_sensor_humedad_1, v_device_id, 3180, 1320, now() - interval '30 days', 'Pilar Martínez'),
    (v_sensor_humedad_2, v_device_id, 3210, 1290, now() - interval '18 days', 'Pilar Martínez'),
    (v_sensor_humedad_3, v_device_id, 3150, 1350, now() - interval '5 days', 'Pilar Martínez');

  -- ---------------------------------------------------------------------
  -- Pronóstico del clima (5 días)
  -- ---------------------------------------------------------------------
  insert into weather_forecasts (device_id, day, condition, temp_max, temp_min, rain_probability, humidity, wind_kmh)
  values
    (v_device_id, current_date,     'parcial',  27, 17, 30, 62, 12),
    (v_device_id, current_date + 1, 'soleado',  29, 18, 10, 55, 8),
    (v_device_id, current_date + 2, 'lluvia',   23, 16, 80, 78, 20),
    (v_device_id, current_date + 3, 'tormenta', 21, 15, 90, 85, 28),
    (v_device_id, current_date + 4, 'nublado',  24, 16, 45, 68, 14);

  -- ---------------------------------------------------------------------
  -- Eventos del sistema (log)
  -- ---------------------------------------------------------------------
  insert into system_events (device_id, level, message, created_at)
  values
    (v_device_id, 'info', 'Agente iniciado correctamente', now() - interval '2 hours'),
    (v_device_id, 'warning', 'Batería baja en sensor de humedad — Chile (15%)', now() - interval '3 hours'),
    (v_device_id, 'error', 'Sensor de humedad — Chile sin respuesta', now() - interval '3 hours');

end $$;
