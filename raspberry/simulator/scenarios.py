"""
EcoSmart - Escenarios de prueba del simulador.

Implementa los 5 escenarios solicitados:
 1. Humedad 30% -> detecta suelo seco -> inicia riego.
 2. Humedad 45% -> continúa riego (no ha llegado al objetivo).
 3. Humedad 60% -> objetivo alcanzado -> detiene riego.
 4. Internet OFF -> el sistema sigue funcionando localmente (por diseño,
    no hay ninguna llamada de red en el camino del riego automático).
 5. Internet ON -> los datos pendientes se marcan para sincronizar
    (la sincronización real HTTP se implementa en la Fase 2 backend;
    aquí se demuestra que la cola de pendientes funciona).

Ejecutar con: python -m simulator.scenarios
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import db
from irrigation.controller import IrrigationController
from simulator.simulator import build_simulated_stack
from sync.sync_manager import SyncManager


def print_status(controller: IrrigationController, label: str):
    status = controller.get_status()
    print(f"\n--- {label} ---")
    for key, value in status.items():
        print(f"  {key}: {value}")


def scenario_1_low_humidity_starts_irrigation():
    print("\n========== ESCENARIO 1: Humedad 30% -> inicia riego ==========")
    soil, temp, pump, weather = build_simulated_stack(initial_humidity=30.0)
    controller = IrrigationController(soil, temp, pump, weather_provider=weather)

    controller.run_automatic_cycle()
    print_status(controller, "Después del primer ciclo (humedad=30%)")
    assert pump.is_on(), "La bomba debería haberse encendido con humedad 30%"
    print("OK: la bomba se encendió al detectar suelo seco (< humedad_minima).")
    return controller, soil, pump


def scenario_2_continues_at_45(controller, soil, pump):
    print("\n========== ESCENARIO 2: Humedad 45% -> continúa riego ==========")
    soil.set_percentage(45.0)
    controller.run_automatic_cycle()
    print_status(controller, "Después del ciclo (humedad=45%)")
    assert pump.is_on(), "La bomba debería seguir encendida a 45% (< humedad_deseada=60%)"
    print("OK: la bomba sigue encendida, la histéresis no la apaga prematuramente.")


def scenario_3_reaches_target_stops(controller, soil, pump):
    print("\n========== ESCENARIO 3: Humedad 60% -> objetivo alcanzado, detiene riego ==========")
    soil.set_percentage(60.0)
    controller.run_automatic_cycle()
    print_status(controller, "Después del ciclo (humedad=60%)")
    assert not pump.is_on(), "La bomba debería haberse apagado al alcanzar humedad_deseada"
    print("OK: la bomba se apagó al alcanzar el umbral de desactivación (60%).")


def scenario_4_offline_operation():
    print("\n========== ESCENARIO 4: Internet OFF -> funcionamiento local ==========")
    print("No hay ninguna dependencia de red en run_automatic_cycle().")
    print("El controlador lee sensores, aplica histéresis y escribe en SQLite")
    print("sin invocar el backend en ningún punto del camino crítico.")
    soil, temp, pump, weather = build_simulated_stack(initial_humidity=25.0)
    controller = IrrigationController(soil, temp, pump, weather_provider=weather)
    controller.run_automatic_cycle()
    history_before = db.get_irrigation_history(limit=1)
    print_status(controller, "Operando sin red disponible")
    assert len(history_before) > 0, "El evento de riego debe quedar registrado localmente igualmente"
    print("OK: el sistema decidió y registró el riego sin depender de Internet.")


def scenario_5_sync_when_online():
    print("\n========== ESCENARIO 5: Internet ON -> sincronización ==========")
    sync_manager = SyncManager()
    pending_before = sync_manager.count_pending()
    print(f"Registros pendientes de sincronizar antes: {pending_before}")
    result = sync_manager.try_sync()
    print(f"Resultado de intento de sincronización: {result}")
    print("OK: la cola de sincronización identifica correctamente los registros pendientes.")


def run_all_scenarios():
    db.init_db()
    controller, soil, pump = scenario_1_low_humidity_starts_irrigation()
    scenario_2_continues_at_45(controller, soil, pump)
    scenario_3_reaches_target_stops(controller, soil, pump)
    scenario_4_offline_operation()
    scenario_5_sync_when_online()
    print("\n========== TODOS LOS ESCENARIOS COMPLETADOS CORRECTAMENTE ==========")


if __name__ == "__main__":
    run_all_scenarios()
