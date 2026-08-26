"""
EcoSmart - Gestor de sincronización con Supabase (Fase 2, real).

Toma los registros locales pendientes (synced=0) en SQLite y los sube a
Supabase vía PostgREST (la API REST automática de Supabase), usando la
misma anon key y el mismo device_id que usa el frontend. Solo marca un
registro como sincronizado en SQLite después de una respuesta 2xx.

Notas de diseño:
- El agente local hoy solo maneja un "cultivo activo" a la vez (ver
  config.active_crop_id), no hay una tabla local que mapee ids locales a
  los UUID de `crops` en Supabase. Por eso crop_id se sube como NULL: las
  filas igual quedan asociadas al dispositivo vía device_id, que es lo
  que usa el frontend para filtrar. Mapear cultivo por cultivo es una
  mejora futura (Fase 4).
- No se usa upsert/on_conflict: la deduplicación ya la garantiza el flag
  `synced` en SQLite (cada fila se sube una sola vez).
"""

import socket

import requests

from database import db
from config import settings


class SyncManager:
    def __init__(self, backend_url: str | None = None):
        # Compatibilidad con Fase 1 (no se usa mientras Supabase esté activo).
        self.backend_url = backend_url or settings.BACKEND_BASE_URL
        self.supabase_url = settings.SUPABASE_URL.rstrip("/")
        self.supabase_anon_key = settings.SUPABASE_ANON_KEY
        self.device_id = settings.DEVICE_ID

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key and settings.SUPABASE_SYNC_ENABLED)

    def _headers(self) -> dict:
        return {
            "apikey": self.supabase_anon_key,
            "Authorization": f"Bearer {self.supabase_anon_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

    def is_internet_available(self, host: str = "8.8.8.8", port: int = 53, timeout: float = 2.0) -> bool:
        """Comprobación ligera de conectividad, sin depender del backend en sí."""
        try:
            socket.setdefaulttimeout(timeout)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((host, port))
            s.close()
            return True
        except OSError:
            return False

    def count_pending(self) -> int:
        pending_readings = db.get_unsynced_readings(limit=10_000)
        pending_events = db.get_unsynced_irrigation_events(limit=10_000)
        pending_logs = db.get_unsynced_system_events(limit=10_000)
        return len(pending_readings) + len(pending_events) + len(pending_logs)

    def _post(self, table: str, rows: list[dict], timeout: float = 8.0) -> bool:
        """POST de un lote a una tabla de Supabase. True si Supabase lo aceptó."""
        if not rows:
            return True
        url = f"{self.supabase_url}/rest/v1/{table}"
        try:
            resp = requests.post(url, headers=self._headers(), json=rows, timeout=timeout)
            if 200 <= resp.status_code < 300:
                return True
            # 4xx/5xx: dejamos las filas como no-sincronizadas para reintentar
            # en el siguiente ciclo y registramos el motivo localmente.
            db.log_system_event(
                "error",
                f"Fallo al sincronizar '{table}' con Supabase: HTTP {resp.status_code} — {resp.text[:200]}",
            )
            return False
        except requests.RequestException as exc:
            db.log_system_event("error", f"Error de red sincronizando '{table}': {exc}")
            return False

    def _sync_readings(self) -> int:
        pending = db.get_unsynced_readings(limit=200)
        if not pending:
            return 0
        payload = [
            {
                "device_id": self.device_id,
                "local_uuid": r["uuid"],
                "crop_id": None,
                "sensor_id": None,
                "soil_humidity": r.get("humedad_porcentaje"),
                "soil_humidity_adc_raw": r.get("humedad_adc_raw"),
                "temperature": r.get("temperatura_celsius"),
                "ambient_humidity": None,
                "valido": bool(r.get("valido", 1)),
                "recorded_at": r["timestamp"],
            }
            for r in pending
        ]
        if self._post("readings", payload):
            db.mark_readings_synced([r["uuid"] for r in pending])
            return len(pending)
        return 0

    def _sync_irrigation_events(self) -> int:
        pending = db.get_unsynced_irrigation_events(limit=200)
        if not pending:
            return 0
        payload = [
            {
                "device_id": self.device_id,
                "local_uuid": e["uuid"],
                "crop_id": None,
                "started_at": e["inicio"],
                "ended_at": e.get("fin"),
                "duration_seconds": e.get("duracion_segundos"),
                "mode": e["tipo"],
                "humidity_start": e.get("humedad_inicial"),
                "humidity_end": e.get("humedad_final"),
                "reason": e.get("motivo"),
                "reason_end": e.get("motivo_fin"),
            }
            for e in pending
        ]
        if self._post("irrigation_events", payload):
            db.mark_irrigation_events_synced([e["uuid"] for e in pending])
            return len(pending)
        return 0

    def _sync_system_events(self) -> int:
        pending = db.get_unsynced_system_events(limit=200)
        if not pending:
            return 0
        payload = [
            {
                "device_id": self.device_id,
                "local_uuid": e["uuid"],
                "level": e["nivel"],
                "message": e["mensaje"],
                "created_at": e["timestamp"],
            }
            for e in pending
        ]
        if self._post("system_events", payload):
            db.mark_system_events_synced([e["uuid"] for e in pending])
            return len(pending)
        return 0

    def try_sync(self) -> dict:
        """Punto de entrada llamado periódicamente por main.py."""
        if not self.supabase_configured:
            return {"synced": False, "reason": "supabase_no_configurado"}

        if not self.is_internet_available():
            return {"synced": False, "reason": "sin_conexion_a_internet"}

        n_readings = self._sync_readings()
        n_events = self._sync_irrigation_events()
        n_logs = self._sync_system_events()
        total = n_readings + n_events + n_logs

        return {
            "synced": True,
            "reason": "ok" if total else "nada_pendiente",
            "readings": n_readings,
            "irrigation_events": n_events,
            "system_events": n_logs,
        }
