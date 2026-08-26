"""
EcoSmart - Control de la bomba de agua vía módulo relé.

Arquitectura: Raspberry Pi GPIO -> Relé -> Bomba de agua

IMPORTANTE: este módulo nunca conecta la bomba directamente al GPIO.
El GPIO solo conmuta el relé; la bomba se alimenta de una fuente externa.

Incluye protección de seguridad a nivel de hardware: si algo en capas
superiores olvida apagar la bomba, un hilo watchdog la apaga de todas
formas al superar el tiempo máximo absoluto.
"""

import threading
import time
from datetime import datetime, timezone

from config import settings


class Pump:
    """
    Controlador de la bomba. Mantiene su propio estado (encendida/apagada,
    desde cuándo) y aplica un corte de seguridad por tiempo máximo
    absoluto, independientemente de quién la haya encendido (riego
    automático o manual).
    """

    def __init__(self, max_on_seconds_absolute: int = 600):
        self._gpio = None
        self._initialized = False
        self._is_on = False
        self._on_since: datetime | None = None
        self._lock = threading.Lock()
        self._max_on_seconds_absolute = max_on_seconds_absolute
        self._watchdog_thread: threading.Thread | None = None
        self._watchdog_stop_event = threading.Event()

    def _lazy_init_hardware(self):
        if self._initialized:
            return
        try:
            from gpiozero import OutputDevice
        except ImportError as exc:
            raise RuntimeError(
                "gpiozero no está disponible. Instálalo con "
                "'pip install gpiozero rpi-lgpio', o usa HARDWARE_MODE=simulator."
            ) from exc

        # active_high=False porque la mayoría de módulos relé son activos en bajo
        self._gpio = OutputDevice(
            settings.RELAY_GPIO_PIN,
            active_high=not settings.RELAY_ACTIVE_LOW,
            initial_value=False,
        )
        self._initialized = True

    def turn_on(self):
        with self._lock:
            if self._is_on:
                return
            self._lazy_init_hardware()
            self._gpio.on()
            self._is_on = True
            self._on_since = datetime.now(timezone.utc)
            self._start_watchdog()

    def turn_off(self):
        with self._lock:
            if not self._is_on:
                return
            self._gpio.off()
            self._is_on = False
            self._on_since = None
            self._stop_watchdog()

    def is_on(self) -> bool:
        with self._lock:
            return self._is_on

    def seconds_on(self) -> float:
        with self._lock:
            if not self._is_on or self._on_since is None:
                return 0.0
            return (datetime.now(timezone.utc) - self._on_since).total_seconds()

    # ------------------------------------------------------------------
    # Watchdog de seguridad: corte absoluto de hardware.
    # Actúa como última línea de defensa, independiente de la lógica de
    # histéresis. Si por cualquier motivo (bug, cuelgue del proceso
    # principal, etc.) la bomba queda encendida más del máximo absoluto,
    # este hilo la apaga igualmente.
    # ------------------------------------------------------------------

    def _start_watchdog(self):
        self._watchdog_stop_event.clear()
        self._watchdog_thread = threading.Thread(target=self._watchdog_loop, daemon=True)
        self._watchdog_thread.start()

    def _stop_watchdog(self):
        self._watchdog_stop_event.set()

    def _watchdog_loop(self):
        while not self._watchdog_stop_event.wait(timeout=1.0):
            if self.seconds_on() >= self._max_on_seconds_absolute:
                self.turn_off()
                from database import db
                db.log_system_event(
                    "warning",
                    f"Watchdog de seguridad apagó la bomba tras "
                    f"{self._max_on_seconds_absolute}s encendida (corte absoluto).",
                )
                break
