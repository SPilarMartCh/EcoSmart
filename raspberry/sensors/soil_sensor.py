"""
EcoSmart - Sensor de humedad del suelo (capacitivo) vía ADS1115.

Arquitectura: Sensor de humedad -> ADS1115 -> Raspberry Pi -> EcoSmart

Este módulo SOLO sabe leer el ADC y convertir a porcentaje usando la
calibración guardada en base de datos. No decide nada sobre riego.
"""

from database import db
from config import settings


class InvalidReadingError(Exception):
    """Se lanza cuando una lectura del sensor no es fiable."""
    pass


class SoilSensor:
    """
    Lector de humedad de suelo real, usando un ADS1115 conectado por I2C.

    La fórmula de conversión usa calibración de dos puntos:
        adc_seco   -> 0%   de humedad
        adc_humedo -> 100% de humedad

    Un valor ADC mayor que adc_seco normalmente indica suelo más seco
    (para la mayoría de sensores capacitivos comunes, el voltaje de
    salida BAJA cuando el suelo está más húmedo). La fórmula de abajo
    es válida en ambos sentidos porque se basa en la posición relativa
    entre los dos puntos de calibración, no en su orden.
    """

    def __init__(self):
        self._i2c = None
        self._ads = None
        self._channel = None
        self._initialized = False

    def _lazy_init_hardware(self):
        """Inicializa el bus I2C y el ADS1115 solo cuando se necesita.

        Se hace de forma perezosa para que este módulo se pueda importar
        en una máquina de desarrollo sin librerías de hardware instaladas,
        siempre que no se use HARDWARE_MODE=real.
        """
        if self._initialized:
            return

        try:
            import board
            import busio
            import adafruit_ads1x15.ads1115 as ADS
            from adafruit_ads1x15.analog_in import AnalogIn
        except ImportError as exc:
            raise RuntimeError(
                "Librerías de hardware no disponibles. Instala "
                "'adafruit-circuitpython-ads1x15' y 'adafruit-blinka', "
                "o usa HARDWARE_MODE=simulator."
            ) from exc

        self._i2c = busio.I2C(board.SCL, board.SDA)
        self._ads = ADS.ADS1115(self._i2c, address=settings.ADS1115_I2C_ADDRESS)
        # Ganancia 2/3 -> rango de +/-6.144V, adecuado para sensores alimentados a 5V
        self._ads.gain = 2 / 3

        channel_map = {
            0: ADS.P0,
            1: ADS.P1,
            2: ADS.P2,
            3: ADS.P3,
        }
        pin = channel_map.get(settings.ADS1115_CHANNEL, ADS.P0)
        self._channel = AnalogIn(self._ads, pin)
        self._initialized = True

    def read_raw(self) -> int:
        """Devuelve el valor crudo del ADC (0-32767 aprox para ADS1115 single-ended)."""
        self._lazy_init_hardware()
        try:
            return self._channel.value
        except OSError as exc:
            raise InvalidReadingError(f"Error de comunicación I2C con el ADS1115: {exc}") from exc

    def read_percentage(self) -> float:
        """
        Lee el ADC y convierte a porcentaje de humedad (0-100), usando
        la calibración activa almacenada en base de datos.
        """
        raw = self.read_raw()
        return convert_raw_to_percentage(raw)


def convert_raw_to_percentage(raw_adc: int) -> float:
    """
    Convierte una lectura cruda del ADC a porcentaje de humedad (0-100),
    usando los valores de calibración guardados en la base de datos.

    Es independiente de si adc_seco > adc_humedo o al revés: se calcula
    la posición relativa del valor leído entre ambos extremos y se
    recorta (clamp) entre 0 y 100.
    """
    calibration = db.get_calibration()
    adc_seco = calibration["adc_seco"]
    adc_humedo = calibration["adc_humedo"]

    if adc_seco == adc_humedo:
        raise InvalidReadingError(
            "Calibración inválida: adc_seco y adc_humedo no pueden ser iguales."
        )

    # Interpolación lineal entre los dos puntos de calibración.
    # Si adc_seco > adc_humedo (caso típico): a mayor raw, menor humedad.
    # Si fuera al revés, la fórmula se ajusta sola por el signo del denominador.
    percentage = (adc_seco - raw_adc) / (adc_seco - adc_humedo) * 100.0

    # Recorte a rango físico válido
    percentage = max(0.0, min(100.0, percentage))
    return round(percentage, 2)


def validate_reading(percentage: float | None, raw_adc: int | None) -> bool:
    """Valida que una lectura tenga sentido físico antes de usarla."""
    if percentage is None or raw_adc is None:
        return False
    if not (0.0 <= percentage <= 100.0):
        return False
    if raw_adc < 0 or raw_adc > 65535:
        return False
    return True
