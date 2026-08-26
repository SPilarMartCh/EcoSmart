"""
EcoSmart - Capa de acceso a la base de datos local (SQLite).

Todas las escrituras/lecturas de la Raspberry Pi pasan por aquí.
Este módulo es la única parte del sistema que sabe escribir SQL.
"""

import sqlite3
import uuid
from pathlib import Path
from contextlib import contextmanager

from config import settings


def _row_to_dict(row: sqlite3.Row) -> dict:
    return {key: row[key] for key in row.keys()}


@contextmanager
def get_connection():
    """Context manager que abre y cierra la conexión de forma segura."""
    Path(settings.DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Crea las tablas si no existen y siembra datos por defecto."""
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    schema_sql = schema_path.read_text(encoding="utf-8")

    with get_connection() as conn:
        conn.executescript(schema_sql)

        # Sembrar cultivos por defecto si la tabla está vacía
        existing = conn.execute("SELECT COUNT(*) as c FROM crops").fetchone()["c"]
        if existing == 0:
            default_crops = [
                ("Tomate", 40.0, 60.0, 85.0, 300, 1800),
                ("Lechuga", 45.0, 65.0, 85.0, 240, 1800),
                ("Fresa", 35.0, 55.0, 80.0, 240, 2400),
                ("Pepino", 40.0, 62.0, 85.0, 300, 1800),
            ]
            for name, h_min, h_des, h_max, t_max, t_min_entre in default_crops:
                conn.execute(
                    """INSERT INTO crops
                       (uuid, name, humedad_minima, humedad_deseada, humedad_maxima,
                        tiempo_maximo_riego_segundos, tiempo_minimo_entre_riegos_segundos)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (str(uuid.uuid4()), name, h_min, h_des, h_max, t_max, t_min_entre),
                )

        # Config activa por defecto (usa el primer cultivo: Tomate)
        config_row = conn.execute("SELECT id FROM config WHERE id = 1").fetchone()
        if config_row is None:
            first_crop = conn.execute("SELECT id FROM crops ORDER BY id LIMIT 1").fetchone()
            conn.execute(
                """INSERT INTO config (id, active_crop_id, modo_automatico, usar_prediccion_meteorologica)
                   VALUES (1, ?, 1, 1)""",
                (first_crop["id"],),
            )

        # Calibración por defecto
        calibration_row = conn.execute("SELECT id FROM calibration WHERE id = 1").fetchone()
        if calibration_row is None:
            conn.execute(
                """INSERT INTO calibration (id, adc_seco, adc_humedo) VALUES (1, ?, ?)""",
                (settings.DEFAULT_CALIBRATION_DRY_ADC, settings.DEFAULT_CALIBRATION_WET_ADC),
            )


# --------------------------------------------------------------------------
# Cultivos
# --------------------------------------------------------------------------

def get_all_crops() -> list:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM crops ORDER BY name").fetchall()
        return [_row_to_dict(r) for r in rows]


def get_crop_by_id(crop_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM crops WHERE id = ?", (crop_id,)).fetchone()
        return _row_to_dict(row) if row else None


def update_crop(crop_id: int, **fields) -> dict | None:
    if not fields:
        return get_crop_by_id(crop_id)
    allowed = {
        "humedad_minima", "humedad_deseada", "humedad_maxima",
        "tiempo_maximo_riego_segundos", "tiempo_minimo_entre_riegos_segundos",
    }
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_crop_by_id(crop_id)
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [crop_id]
    with get_connection() as conn:
        conn.execute(
            f"UPDATE crops SET {set_clause}, updated_at = datetime('now') WHERE id = ?",
            values,
        )
    return get_crop_by_id(crop_id)


# --------------------------------------------------------------------------
# Configuración activa
# --------------------------------------------------------------------------

def get_active_config() -> dict:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM config WHERE id = 1").fetchone()
        return _row_to_dict(row)


def set_active_crop(crop_id: int):
    with get_connection() as conn:
        conn.execute(
            "UPDATE config SET active_crop_id = ?, updated_at = datetime('now') WHERE id = 1",
            (crop_id,),
        )


def set_modo_automatico(enabled: bool):
    with get_connection() as conn:
        conn.execute(
            "UPDATE config SET modo_automatico = ?, updated_at = datetime('now') WHERE id = 1",
            (1 if enabled else 0,),
        )


# --------------------------------------------------------------------------
# Calibración
# --------------------------------------------------------------------------

def get_calibration() -> dict:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM calibration WHERE id = 1").fetchone()
        return _row_to_dict(row)


def set_calibration(adc_seco: int, adc_humedo: int):
    with get_connection() as conn:
        conn.execute(
            """UPDATE calibration SET adc_seco = ?, adc_humedo = ?, updated_at = datetime('now')
               WHERE id = 1""",
            (adc_seco, adc_humedo),
        )


# --------------------------------------------------------------------------
# Lecturas de sensores
# --------------------------------------------------------------------------

def insert_reading(humedad_porcentaje, humedad_adc_raw, temperatura_celsius, valido: bool = True) -> dict:
    reading_uuid = str(uuid.uuid4())
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO readings (uuid, humedad_porcentaje, humedad_adc_raw, temperatura_celsius, valido)
               VALUES (?, ?, ?, ?, ?)""",
            (reading_uuid, humedad_porcentaje, humedad_adc_raw, temperatura_celsius, 1 if valido else 0),
        )
    return get_latest_reading()


def get_latest_reading() -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM readings ORDER BY id DESC LIMIT 1"
        ).fetchone()
        return _row_to_dict(row) if row else None


def get_readings(since_iso: str | None = None, limit: int = 500) -> list:
    with get_connection() as conn:
        if since_iso:
            rows = conn.execute(
                "SELECT * FROM readings WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT ?",
                (since_iso, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM readings ORDER BY timestamp DESC LIMIT ?", (limit,)
            ).fetchall()
        return [_row_to_dict(r) for r in rows]


def get_unsynced_readings(limit: int = 200) -> list:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM readings WHERE synced = 0 ORDER BY id ASC LIMIT ?", (limit,)
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def mark_readings_synced(reading_uuids: list):
    if not reading_uuids:
        return
    with get_connection() as conn:
        placeholders = ",".join("?" for _ in reading_uuids)
        conn.execute(
            f"UPDATE readings SET synced = 1 WHERE uuid IN ({placeholders})", reading_uuids
        )


# --------------------------------------------------------------------------
# Eventos de riego
# --------------------------------------------------------------------------

def start_irrigation_event(tipo: str, motivo: str, humedad_inicial: float | None) -> dict:
    event_uuid = str(uuid.uuid4())
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO irrigation_events (uuid, inicio, humedad_inicial, tipo, motivo)
               VALUES (?, datetime('now'), ?, ?, ?)""",
            (event_uuid, humedad_inicial, tipo, motivo),
        )
        row = conn.execute(
            "SELECT * FROM irrigation_events WHERE uuid = ?", (event_uuid,)
        ).fetchone()
        return _row_to_dict(row)


def finish_irrigation_event(event_id: int, humedad_final: float | None, motivo_fin: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM irrigation_events WHERE id = ?", (event_id,)
        ).fetchone()
        if row is None:
            return None
        conn.execute(
            """UPDATE irrigation_events
               SET fin = datetime('now'),
                   duracion_segundos = CAST((julianday('now') - julianday(inicio)) * 86400 AS INTEGER),
                   humedad_final = ?,
                   motivo_fin = ?
               WHERE id = ?""",
            (humedad_final, motivo_fin, event_id),
        )
        updated = conn.execute(
            "SELECT * FROM irrigation_events WHERE id = ?", (event_id,)
        ).fetchone()
        return _row_to_dict(updated)


def get_irrigation_history(limit: int = 100) -> list:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM irrigation_events ORDER BY inicio DESC LIMIT ?", (limit,)
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def get_recent_irrigation_start_count(window_seconds: int) -> int:
    """Cuenta cuántos riegos han iniciado en los últimos `window_seconds`."""
    with get_connection() as conn:
        row = conn.execute(
            """SELECT COUNT(*) as c FROM irrigation_events
               WHERE inicio >= datetime('now', ?)""",
            (f"-{window_seconds} seconds",),
        ).fetchone()
        return row["c"]


def get_last_irrigation_end_time() -> str | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT fin FROM irrigation_events WHERE fin IS NOT NULL ORDER BY fin DESC LIMIT 1"
        ).fetchone()
        return row["fin"] if row else None


# --------------------------------------------------------------------------
# Eventos del sistema (log de errores/avisos)
# --------------------------------------------------------------------------

def log_system_event(nivel: str, mensaje: str):
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO system_events (uuid, nivel, mensaje) VALUES (?, ?, ?)",
            (str(uuid.uuid4()), nivel, mensaje),
        )


# --------------------------------------------------------------------------
# Sincronización (Fase 2): pendientes y marcado como sincronizado,
# igual que ya existe para readings, pero para irrigation_events y
# system_events.
# --------------------------------------------------------------------------

def get_unsynced_irrigation_events(limit: int = 200) -> list:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM irrigation_events WHERE synced = 0 ORDER BY id ASC LIMIT ?", (limit,)
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def mark_irrigation_events_synced(event_uuids: list):
    if not event_uuids:
        return
    with get_connection() as conn:
        placeholders = ",".join("?" for _ in event_uuids)
        conn.execute(
            f"UPDATE irrigation_events SET synced = 1 WHERE uuid IN ({placeholders})", event_uuids
        )


def get_unsynced_system_events(limit: int = 200) -> list:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM system_events WHERE synced = 0 ORDER BY id ASC LIMIT ?", (limit,)
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def mark_system_events_synced(event_uuids: list):
    if not event_uuids:
        return
    with get_connection() as conn:
        placeholders = ",".join("?" for _ in event_uuids)
        conn.execute(
            f"UPDATE system_events SET synced = 1 WHERE uuid IN ({placeholders})", event_uuids
        )
