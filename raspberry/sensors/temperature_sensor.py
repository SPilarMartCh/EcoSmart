"""
EcoSmart - Sensor de temperatura (DS18B20, bus 1-Wire).

Se eligió el DS18B20 porque:
- Es digital (no requiere el ADS1115, libera canales del ADC).
- Es apto para exteriores/tierra (encapsulado impermeable).
- Usa el bus 1-Wire nativo de la Raspberry Pi (GPIO4 por defecto),
  con librerías estables en el kernel de Raspberry Pi OS.

Si no se dispone de sensor de temperatura físico, este módulo puede
devolver None sin romper el resto del sistema (la temperatura es
opcional en la lógica de riego de la Fase 1).
"""

import glob


class TemperatureSensor:
    def __init__(self, device_glob: str = "/sys/bus/w1/devices/28-*/w1_slave"):
        self._device_glob = device_glob
        self._device_path = None

    def _find_device(self) -> str | None:
        if self._device_path:
            return self._device_path
        matches = glob.glob(self._device_glob)
        if matches:
            self._device_path = matches[0]
        return self._device_path

    def read_celsius(self) -> float | None:
        """
        Lee la temperatura en grados Celsius. Devuelve None si no hay
        sensor conectado o la lectura no es fiable (esto es tolerado:
        la temperatura no es crítica para la decisión de riego).
        """
        device_path = self._find_device()
        if device_path is None:
            return None

        try:
            with open(device_path, "r") as f:
                lines = f.readlines()
        except OSError:
            return None

        if len(lines) < 2 or "YES" not in lines[0]:
            return None  # checksum CRC falló, lectura no fiable

        equals_pos = lines[1].find("t=")
        if equals_pos == -1:
            return None

        temp_raw = lines[1][equals_pos + 2:]
        try:
            return round(float(temp_raw) / 1000.0, 2)
        except ValueError:
            return None
