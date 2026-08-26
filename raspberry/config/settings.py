"""
EcoSmart - Configuración global de la Raspberry Pi.

Carga variables de entorno (.env) y expone constantes usadas por
todos los módulos. No contiene lógica de negocio.
"""

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    BASE_DIR = Path(__file__).resolve().parent.parent
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    # python-dotenv es opcional; si no está instalado, se usan
    # variables de entorno del sistema directamente.
    pass


def _get_bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


def _get_int(name: str, default: int) -> int:
    val = os.getenv(name)
    if val is None:
        return default
    try:
        return int(val)
    except ValueError:
        return default


def _get_float(name: str, default: float) -> float:
    val = os.getenv(name)
    if val is None:
        return default
    try:
        return float(val)
    except ValueError:
        return default


# --- Modo de operación -------------------------------------------------
# HARDWARE_MODE = "real"       -> usa sensores/relé físicos
# HARDWARE_MODE = "simulator"  -> usa el simulador (sin hardware conectado)
HARDWARE_MODE = os.getenv("HARDWARE_MODE", "simulator").strip().lower()

# --- Base de datos local -------------------------------------------------
DB_PATH = os.getenv("DB_PATH", str(Path(__file__).resolve().parent.parent / "database" / "ecosmart.db"))

# --- I2C / ADS1115 --------------------------------------------------------
ADS1115_I2C_ADDRESS = int(os.getenv("ADS1115_I2C_ADDRESS", "0x48"), 16) if os.getenv("ADS1115_I2C_ADDRESS") else 0x48
ADS1115_CHANNEL = _get_int("ADS1115_CHANNEL", 0)  # 0 = A0

# --- GPIO ------------------------------------------------------------------
RELAY_GPIO_PIN = _get_int("RELAY_GPIO_PIN", 17)
RELAY_ACTIVE_LOW = _get_bool("RELAY_ACTIVE_LOW", True)  # la mayoría de módulos relé son activos en bajo

# --- Identificación del dispositivo ----------------------------------------
DEVICE_ID = os.getenv("DEVICE_ID", "ecosmart-pi-01")

# --- Ciclo de lectura --------------------------------------------------
SENSOR_READ_INTERVAL_SECONDS = _get_int("SENSOR_READ_INTERVAL_SECONDS", 10)

# --- Seguridad de la bomba (riego manual) -----------------------------
MANUAL_IRRIGATION_MAX_SECONDS = _get_int("MANUAL_IRRIGATION_MAX_SECONDS", 300)  # 5 min

# --- Protección de lecturas inválidas -----------------------------------
MAX_CONSECUTIVE_INVALID_READINGS = _get_int("MAX_CONSECUTIVE_INVALID_READINGS", 5)
READING_STALE_AFTER_SECONDS = _get_int("READING_STALE_AFTER_SECONDS", 120)

# --- Protección de ciclos excesivos -------------------------------------
MAX_IRRIGATION_CYCLES_PER_WINDOW = _get_int("MAX_IRRIGATION_CYCLES_PER_WINDOW", 6)
IRRIGATION_CYCLE_WINDOW_SECONDS = _get_int("IRRIGATION_CYCLE_WINDOW_SECONDS", 3600)  # 1 hora

# --- Calibración por defecto (se sobreescribe con lo guardado en BD) ----
DEFAULT_CALIBRATION_DRY_ADC = _get_int("DEFAULT_CALIBRATION_DRY_ADC", 27000)
DEFAULT_CALIBRATION_WET_ADC = _get_int("DEFAULT_CALIBRATION_WET_ADC", 12000)

# --- Backend (usado en Fase 2, ya se deja preparado) ----------------------
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:4000")
DEVICE_API_KEY = os.getenv("DEVICE_API_KEY", "")

# --- Supabase (sincronización real, Fase 2) --------------------------------
# Deben coincidir con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY del frontend
# (BD proy/ecosmart-fields-main/.env) para que ambos lean/escriban las mismas
# filas. La anon key es pública por diseño; Supabase la protege con RLS.
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SYNC_ENABLED = _get_bool("SUPABASE_SYNC_ENABLED", True)
