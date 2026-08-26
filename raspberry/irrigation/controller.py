"""
EcoSmart - Controlador de riego.

Orquesta: sensor de humedad + sensor de temperatura + motor de
histéresis + bomba (relé) + base de datos local + protecciones de
seguridad. Esta es la pieza central que corre en el loop principal
de la Raspberry Pi (main.py) y que garantiza que el riego automático
funcione de forma 100% local, sin depender del backend ni de Internet.
"""

import time
from datetime import datetime, timezone

from config import settings
from database import db
from irrigation.hysteresis import HysteresisEngine, StartReason, StopReason
from sensors.soil_sensor import InvalidReadingError, validate_reading


class IrrigationController:
    def __init__(self, soil_sensor, temperature_sensor, pump, weather_provider=None):
        """
        soil_sensor: objeto con método .read_raw() -> int y .read_percentage() -> float
                     (puede ser SoilSensor real o SimulatedSoilSensor)
        temperature_sensor: objeto con método .read_celsius() -> float | None
        pump: objeto con .turn_on()/.turn_off()/.is_on()/.seconds_on()
        weather_provider: objeto opcional con .should_delay_irrigation() -> bool
        """
        self.soil_sensor = soil_sensor
        self.temperature_sensor = temperature_sensor
        self.pump = pump
        self.weather_provider = weather_provider

        self.hysteresis = HysteresisEngine()

        self._consecutive_invalid_readings = 0
        self._last_valid_reading: dict | None = None
        self._last_valid_reading_time: datetime | None = None

        self._current_event_id: int | None = None
        self._current_event_start_time: float | None = None
        self._manual_override_until: float | None = None  # timestamp epoch; None = sin control manual activo

    # ----------------------------------------------------------------
    # Lectura de sensores con protección de lecturas inválidas
    # ----------------------------------------------------------------

    def read_sensors(self) -> dict:
        """
        Lee humedad y temperatura, valida la lectura, la guarda en BD,
        y aplica la protección contra lecturas inválidas consecutivas.

        Devuelve un dict con la lectura efectiva a usar (la nueva si es
        válida, o la última válida conocida si la nueva falló y aún no
        ha caducado).
        """
        raw_adc = None
        percentage = None
        valido = True

        try:
            raw_adc = self.soil_sensor.read_raw()
            percentage = self.soil_sensor.read_percentage()
            valido = validate_reading(percentage, raw_adc)
        except InvalidReadingError as exc:
            valido = False
            db.log_system_event("warning", f"Lectura de humedad inválida: {exc}")
        except Exception as exc:  # protección extra ante fallos inesperados de hardware
            valido = False
            db.log_system_event("error", f"Error inesperado leyendo sensor de humedad: {exc}")

        temperature = None
        try:
            temperature = self.temperature_sensor.read_celsius()
        except Exception:
            temperature = None  # la temperatura no es crítica, se tolera su ausencia

        db.insert_reading(percentage, raw_adc, temperature, valido=valido)

        if valido:
            self._consecutive_invalid_readings = 0
            self._last_valid_reading = {
                "humedad_porcentaje": percentage,
                "humedad_adc_raw": raw_adc,
                "temperatura_celsius": temperature,
            }
            self._last_valid_reading_time = datetime.now(timezone.utc)
            return self._last_valid_reading

        self._consecutive_invalid_readings += 1
        db.log_system_event(
            "warning",
            f"Lecturas inválidas consecutivas: {self._consecutive_invalid_readings}",
        )

        if self._consecutive_invalid_readings >= settings.MAX_CONSECUTIVE_INVALID_READINGS:
            self._safety_shutdown_invalid_readings()

        return self._get_effective_reading()

    def _get_effective_reading(self) -> dict | None:
        """Devuelve la última lectura válida si no ha caducado, o None."""
        if self._last_valid_reading is None or self._last_valid_reading_time is None:
            return None
        age_seconds = (datetime.now(timezone.utc) - self._last_valid_reading_time).total_seconds()
        if age_seconds > settings.READING_STALE_AFTER_SECONDS:
            return None
        return self._last_valid_reading

    def _safety_shutdown_invalid_readings(self):
        """Corte de seguridad: si no confiamos en el sensor, no seguimos regando a ciegas."""
        if self.pump.is_on():
            self._stop_irrigation(humedad_final=None, motivo_fin=StopReason.SAFETY_INVALID_READINGS.value)
            self.hysteresis.force_idle()
        db.log_system_event(
            "error",
            "Riego detenido por seguridad: demasiadas lecturas inválidas consecutivas del sensor.",
        )

    # ----------------------------------------------------------------
    # Ciclo automático (histéresis)
    # ----------------------------------------------------------------

    def run_automatic_cycle(self):
        """
        Un ciclo completo: lee sensores, consulta configuración/cultivo
        activo, evalúa histéresis, y aplica la decisión sobre la bomba.
        Debe llamarse periódicamente desde el loop principal.
        """
        if self._is_manual_override_active():
            return  # el control manual tiene prioridad temporal sobre el automático

        config = db.get_active_config()
        if not config["modo_automatico"]:
            return  # modo automático desactivado por el usuario

        crop = db.get_crop_by_id(config["active_crop_id"])
        if crop is None:
            db.log_system_event("error", "No hay cultivo activo configurado; riego automático pausado.")
            return

        reading = self.read_sensors()
        if reading is None or reading["humedad_porcentaje"] is None:
            return  # sin lectura fiable reciente, no se toma ninguna decisión

        # Protección de ciclos excesivos
        recent_cycles = db.get_recent_irrigation_start_count(settings.IRRIGATION_CYCLE_WINDOW_SECONDS)
        if recent_cycles >= settings.MAX_IRRIGATION_CYCLES_PER_WINDOW and self.hysteresis.state.value == "idle":
            db.log_system_event(
                "warning",
                f"Riego automático pausado temporalmente: se alcanzó el máximo de "
                f"{settings.MAX_IRRIGATION_CYCLES_PER_WINDOW} ciclos en "
                f"{settings.IRRIGATION_CYCLE_WINDOW_SECONDS}s.",
            )
            return

        tiempo_regando = self.pump.seconds_on() if self.pump.is_on() else 0.0

        last_end = db.get_last_irrigation_end_time()
        tiempo_desde_ultimo_riego = None
        if last_end:
            last_end_dt = datetime.strptime(last_end, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            tiempo_desde_ultimo_riego = (datetime.now(timezone.utc) - last_end_dt).total_seconds()

        weather_delay = False
        if config["usar_prediccion_meteorologica"] and self.weather_provider is not None:
            try:
                weather_delay = self.weather_provider.should_delay_irrigation()
            except Exception as exc:
                # Requisito explícito: si el clima falla, el sistema sigue funcionando localmente.
                db.log_system_event("warning", f"Proveedor meteorológico no disponible, se ignora: {exc}")
                weather_delay = False

        decision = self.hysteresis.evaluate(
            humedad_actual=reading["humedad_porcentaje"],
            humedad_minima=crop["humedad_minima"],
            humedad_deseada=crop["humedad_deseada"],
            tiempo_regando_segundos=tiempo_regando,
            tiempo_maximo_riego_segundos=crop["tiempo_maximo_riego_segundos"],
            tiempo_desde_ultimo_riego_segundos=tiempo_desde_ultimo_riego,
            tiempo_minimo_entre_riegos_segundos=crop["tiempo_minimo_entre_riegos_segundos"],
            weather_delay=weather_delay,
        )

        if decision.should_start:
            self._start_irrigation(
                tipo="automatico",
                motivo=decision.start_reason.value,
                humedad_inicial=reading["humedad_porcentaje"],
            )
        elif decision.should_stop:
            self._stop_irrigation(
                humedad_final=reading["humedad_porcentaje"],
                motivo_fin=decision.stop_reason.value,
            )

    # ----------------------------------------------------------------
    # Control manual
    # ----------------------------------------------------------------

    def manual_start(self, max_seconds: int | None = None):
        """Enciende la bomba manualmente, con corte de seguridad por tiempo."""
        limit = max_seconds or settings.MANUAL_IRRIGATION_MAX_SECONDS
        reading = self._get_effective_reading()
        humedad_actual = reading["humedad_porcentaje"] if reading else None

        self._start_irrigation(tipo="manual", motivo=StartReason.MANUAL_COMMAND.value, humedad_inicial=humedad_actual)
        self._manual_override_until = time.monotonic() + limit
        self.hysteresis.state = self.hysteresis.state  # sin cambios; histéresis se retoma tras el manual

    def manual_stop(self):
        reading = self._get_effective_reading()
        humedad_actual = reading["humedad_porcentaje"] if reading else None
        self._stop_irrigation(humedad_final=humedad_actual, motivo_fin=StopReason.MANUAL_STOP.value)
        self._manual_override_until = None
        self.hysteresis.force_idle()

    def _is_manual_override_active(self) -> bool:
        if self._manual_override_until is None:
            return False
        if time.monotonic() >= self._manual_override_until:
            # se venció el tiempo máximo de riego manual: apagar por seguridad
            self.manual_stop()
            return False
        return True

    def check_manual_safety_timeout(self):
        """Debe llamarse en cada ciclo del loop principal para no depender
        de que el temporizador se evalúe solo cuando hay una decisión de histéresis."""
        if self._manual_override_until is not None and time.monotonic() >= self._manual_override_until:
            self.manual_stop()

    # ----------------------------------------------------------------
    # Primitivas de arranque/parada de riego (comparten lógica con BD y bomba)
    # ----------------------------------------------------------------

    def _start_irrigation(self, tipo: str, motivo: str, humedad_inicial: float | None):
        if self.pump.is_on():
            return  # ya está regando, no duplicar evento
        event = db.start_irrigation_event(tipo=tipo, motivo=motivo, humedad_inicial=humedad_inicial)
        self._current_event_id = event["id"]
        self.pump.turn_on()
        db.log_system_event("info", f"Riego iniciado ({tipo}, motivo: {motivo}).")

    def _stop_irrigation(self, humedad_final: float | None, motivo_fin: str):
        if not self.pump.is_on():
            return
        self.pump.turn_off()
        if self._current_event_id is not None:
            db.finish_irrigation_event(self._current_event_id, humedad_final, motivo_fin)
            self._current_event_id = None
        db.log_system_event("info", f"Riego detenido (motivo: {motivo_fin}).")

    # ----------------------------------------------------------------
    # Estado para exponer al backend / dashboard
    # ----------------------------------------------------------------

    def get_status(self) -> dict:
        reading = self._get_effective_reading() or {}
        config = db.get_active_config()
        crop = db.get_crop_by_id(config["active_crop_id"]) if config else None
        return {
            "humedad_porcentaje": reading.get("humedad_porcentaje"),
            "temperatura_celsius": reading.get("temperatura_celsius"),
            "bomba_encendida": self.pump.is_on(),
            "tiempo_bomba_encendida_segundos": self.pump.seconds_on(),
            "modo_automatico": bool(config["modo_automatico"]) if config else None,
            "modo_manual_activo": self._is_manual_override_active(),
            "cultivo_activo": crop["name"] if crop else None,
            "estado_histeresis": self.hysteresis.state.value,
        }
