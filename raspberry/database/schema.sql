-- EcoSmart - Esquema de base de datos local (SQLite)
-- Esta base vive en la Raspberry Pi y es la fuente de verdad local.
-- Todo registro sincronizable tiene un UUID propio para deduplicar
-- correctamente cuando se sincronice con MongoDB en la Fase 2.

CREATE TABLE IF NOT EXISTS crops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    name TEXT UNIQUE NOT NULL,
    humedad_minima REAL NOT NULL,
    humedad_deseada REAL NOT NULL,
    humedad_maxima REAL NOT NULL,
    tiempo_maximo_riego_segundos INTEGER NOT NULL,
    tiempo_minimo_entre_riegos_segundos INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- fila única de configuración activa
    active_crop_id INTEGER NOT NULL REFERENCES crops(id),
    modo_automatico INTEGER NOT NULL DEFAULT 1,  -- 1 = ON, 0 = OFF
    usar_prediccion_meteorologica INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calibration (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- fila única de calibración activa
    adc_seco INTEGER NOT NULL,
    adc_humedo INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    humedad_porcentaje REAL,
    humedad_adc_raw INTEGER,
    temperatura_celsius REAL,
    valido INTEGER NOT NULL DEFAULT 1,  -- 0 si la lectura fue descartada
    synced INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS irrigation_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    inicio TEXT NOT NULL,
    fin TEXT,
    duracion_segundos INTEGER,
    humedad_inicial REAL,
    humedad_final REAL,
    tipo TEXT NOT NULL CHECK (tipo IN ('automatico', 'manual')),
    motivo TEXT,  -- ej: 'humedad_baja', 'comando_manual', 'timeout_seguridad'
    motivo_fin TEXT,  -- ej: 'humedad_objetivo_alcanzada', 'tiempo_maximo_alcanzado', 'comando_manual'
    synced INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS system_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    nivel TEXT NOT NULL CHECK (nivel IN ('info', 'warning', 'error')),
    mensaje TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_readings_synced ON readings(synced);
CREATE INDEX IF NOT EXISTS idx_irrigation_events_inicio ON irrigation_events(inicio);
CREATE INDEX IF NOT EXISTS idx_irrigation_events_synced ON irrigation_events(synced);
CREATE INDEX IF NOT EXISTS idx_system_events_synced ON system_events(synced);
