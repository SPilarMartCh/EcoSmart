"""
EcoSmart - Simulador de hardware.

Permite probar todo el sistema (histéresis, riego automático, riego
manual, protecciones) sin tener la Raspberry Pi conectada a sensores
o relé reales. Implementa la misma interfaz que los módulos reales
(SoilSensor, TemperatureSensor, Pump) para que IrrigationController
no necesite saber si está hablando con hardware real o simulado.
"""

import random
import time


class SimulatedSoilSensor:
    """
    Simula un sensor de humedad. La humedad sube instantáneamente
    mientras la bomba simulada está encendida (drenaje realista lo
    haría gradual, pero para pruebas de lógica basta un incremento
    por ciclo), y baja lentamente con el tiempo (evapotranspiración).
    """

    def __init__(self, initial_percentage: float = 30.0, pump_ref=None):
        self._percentage = initial_percentage
        self._pump_ref = pump_ref  # referencia a SimulatedPump, para saber si está regando
        self._dry_rate_per_second = 0.01  # % que baja por segundo sin riego
        self._wet_rate_per_second = 0.15  # % que sube por segundo mientras riega
        self._last_update = time.monotonic()

    def set_pump_reference(self, pump):
        self._pump_ref = pump

    def set_percentage(self, value: float):
        self._percentage = max(0.0, min(100.0, value))

    def _update(self):
        now = time.monotonic()
        elapsed = now - self._last_update
        self._last_update = now

        if self._pump_ref is not None and self._pump_ref.is_on():
            self._percentage += self._wet_rate_per_second * elapsed
        else:
            self._percentage -= self._dry_rate_per_second * elapsed

        self._percentage = max(0.0, min(100.0, self._percentage))

    def read_raw(self) -> int:
        """Simula un valor ADC coherente con el porcentaje actual (para pruebas end-to-end)."""
        self._update()
        # Usa la misma calibración por defecto para generar un raw plausible
        adc_seco, adc_humedo = 27000, 12000
        raw = adc_seco - (self._percentage / 100.0) * (adc_seco - adc_humedo)
        # pequeño ruido para simular condiciones reales
        raw += random.uniform(-50, 50)
        return int(raw)

    def read_percentage(self) -> float:
        self._update()
        return round(self._percentage, 2)


class SimulatedTemperatureSensor:
    def __init__(self, base_celsius: float = 24.0):
        self._base = base_celsius

    def read_celsius(self) -> float:
        return round(self._base + random.uniform(-1.0, 1.0), 1)


class SimulatedPump:
    def __init__(self):
        self._is_on = False
        self._on_since = None

    def turn_on(self):
        if not self._is_on:
            self._is_on = True
            self._on_since = time.monotonic()

    def turn_off(self):
        self._is_on = False
        self._on_since = None

    def is_on(self) -> bool:
        return self._is_on

    def seconds_on(self) -> float:
        if not self._is_on or self._on_since is None:
            return 0.0
        return time.monotonic() - self._on_since


class SimulatedWeatherProvider:
    """Simula la API meteorológica; puede forzarse a fallar para probar la tolerancia a fallos."""

    def __init__(self, rain_probability: float = 0.0, simulate_api_down: bool = False):
        self.rain_probability = rain_probability
        self.simulate_api_down = simulate_api_down

    def should_delay_irrigation(self) -> bool:
        if self.simulate_api_down:
            raise ConnectionError("Simulación: API meteorológica no disponible.")
        return self.rain_probability >= 0.7


def build_simulated_stack(initial_humidity: float = 30.0):
    """Crea el conjunto sensor+temperatura+bomba simulados, ya enlazados entre sí."""
    pump = SimulatedPump()
    soil_sensor = SimulatedSoilSensor(initial_percentage=initial_humidity, pump_ref=pump)
    temperature_sensor = SimulatedTemperatureSensor()
    weather_provider = SimulatedWeatherProvider()
    return soil_sensor, temperature_sensor, pump, weather_provider
