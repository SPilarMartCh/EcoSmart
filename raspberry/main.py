

import signal
import sys
import time

from config import settings
from database import db
from irrigation.controller import IrrigationController
from sync.sync_manager import SyncManager

_running = True


def _print_status_line(cycle_number: int, status: dict):
    """Imprime una línea legible por ciclo para ver el sistema funcionando en vivo."""
    humedad = status["humedad_porcentaje"]
    humedad_str = f"{humedad:5.1f}%" if humedad is not None else " N/A "

    temperatura = status["temperatura_celsius"]
    temp_str = f"{temperatura:4.1f}C" if temperatura is not None else " N/A"

    bomba_str = "ENCENDIDA" if status["bomba_encendida"] else "apagada  "
    modo_str = "MANUAL" if status["modo_manual_activo"] else ("AUTO" if status["modo_automatico"] else "OFF ")

    print(
        f"[EcoSmart] ciclo {cycle_number:>4} | "
        f"humedad: {humedad_str} | temp: {temp_str} | "
        f"bomba: {bomba_str} | modo: {modo_str} | "
        f"cultivo: {status['cultivo_activo']} | "
        f"histeresis: {status['estado_histeresis']}"
    )


def _handle_shutdown(signum, frame):
    global _running
    print("\n[EcoSmart] Señal de apagado recibida, cerrando de forma segura...")
    _running = False


def build_hardware_stack():
    """Construye sensores/bomba reales o simulados según HARDWARE_MODE."""
    if settings.HARDWARE_MODE == "real":
        from sensors.soil_sensor import SoilSensor
        from sensors.temperature_sensor import TemperatureSensor
        from actuators.pump import Pump

        soil_sensor = SoilSensor()
        temperature_sensor = TemperatureSensor()
        pump = Pump(max_on_seconds_absolute=max(600, settings.MANUAL_IRRIGATION_MAX_SECONDS * 2))
        weather_provider = None  # se añade en Fase 3 al integrar la API meteorológica real
        print("[EcoSmart] Modo hardware REAL: ADS1115 + DS18B20 + Relé GPIO", settings.RELAY_GPIO_PIN)
        return soil_sensor, temperature_sensor, pump, weather_provider

    from simulator.simulator import build_simulated_stack
    print("[EcoSmart] Modo SIMULADOR: sin hardware físico conectado.")
    return build_simulated_stack(initial_humidity=35.0)


def main():
    global _running

    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)

    print(f"[EcoSmart] Iniciando agente '{settings.DEVICE_ID}'...")
    db.init_db()
    print(f"[EcoSmart] Base de datos local lista en: {settings.DB_PATH}")

    soil_sensor, temperature_sensor, pump, weather_provider = build_hardware_stack()
    controller = IrrigationController(soil_sensor, temperature_sensor, pump, weather_provider)
    sync_manager = SyncManager()

    db.log_system_event("info", f"Agente EcoSmart iniciado en modo {settings.HARDWARE_MODE}.")

    last_sync_attempt = 0.0
    sync_interval_seconds = 60
    cycle_number = 0

    while _running:
        try:
            controller.run_automatic_cycle()
            controller.check_manual_safety_timeout()

            cycle_number += 1
            _print_status_line(cycle_number, controller.get_status())

            now = time.monotonic()
            if now - last_sync_attempt >= sync_interval_seconds:
                sync_result = sync_manager.try_sync()
                if sync_result.get("synced") is False and sync_result.get("reason") != "sin_conexion_a_internet":
                    pass  # p.ej. Supabase sin configurar: no se trata como error fatal
                last_sync_attempt = now

        except Exception as exc:
            # Cualquier error inesperado se registra pero NUNCA detiene el loop de riego:
            # el sistema debe seguir intentando funcionar de forma local.
            db.log_system_event("error", f"Error no controlado en el ciclo principal: {exc}")
            print(f"[EcoSmart] ERROR en ciclo principal (continuando): {exc}")

        time.sleep(settings.SENSOR_READ_INTERVAL_SECONDS)

    # Apagado seguro: si la bomba estaba encendida, se apaga antes de salir.
    if pump.is_on():
        pump.turn_off()
        db.log_system_event("warning", "Bomba apagada por apagado seguro del proceso.")

    db.log_system_event("info", "Agente EcoSmart detenido.")
    print("[EcoSmart] Agente detenido correctamente.")
    sys.exit(0)


if __name__ == "__main__":
    main()
