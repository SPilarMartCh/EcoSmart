"""
EcoSmart - Motor de histéresis para riego automático.

CÓMO FUNCIONA LA HISTÉRESIS EN ESTE SISTEMA
--------------------------------------------
El sistema tiene dos umbrales DISTINTOS de humedad para el mismo cultivo:

    humedad_minima   -> umbral de ACTIVACIÓN   (enciende la bomba)
    humedad_deseada  -> umbral de DESACTIVACIÓN (apaga la bomba)

Ejemplo con Tomate (humedad_minima=40%, humedad_deseada=60%):

    Humedad baja a 40% o menos  -> se INICIA el riego.
    La bomba sigue encendida aunque la humedad ya esté en 45%, 50%, 55%...
    Solo se DETIENE cuando la humedad alcanza 60% (o se supera el tiempo
    máximo de riego, lo que ocurra primero).

Esto evita el "chattering" (encendidos/apagados repetidos) que ocurriría
si se usara un único umbral: con un solo umbral, la humedad oscilando
justo alrededor del límite haría que la bomba se encienda y apague
constantemente, desgastando el relé y la bomba.

La máquina de estados es un simple `IrrigationState` con dos estados:

    IDLE      -> esperando a que la humedad baje del umbral de activación.
    WATERING  -> regando, esperando a que la humedad suba al umbral de
                 desactivación o se cumpla el corte de seguridad por tiempo.

Este módulo NO conoce SQLite, GPIO, ni sensores. Es lógica pura y
testeable de forma aislada.
"""

from dataclasses import dataclass
from enum import Enum


class IrrigationState(Enum):
    IDLE = "idle"
    WATERING = "watering"


class StopReason(Enum):
    TARGET_HUMIDITY_REACHED = "humedad_objetivo_alcanzada"
    MAX_TIME_REACHED = "tiempo_maximo_alcanzado"
    MANUAL_STOP = "comando_manual"
    SAFETY_INVALID_READINGS = "lecturas_invalidas_seguridad"


class StartReason(Enum):
    LOW_HUMIDITY = "humedad_baja"
    MANUAL_COMMAND = "comando_manual"


@dataclass
class HysteresisDecision:
    should_start: bool = False
    should_stop: bool = False
    start_reason: StartReason | None = None
    stop_reason: StopReason | None = None


class HysteresisEngine:
    """
    Motor de decisión de histéresis. Se le entregan, en cada ciclo, la
    humedad actual y el estado del sistema (parámetros del cultivo,
    tiempo transcurrido, etc.) y devuelve una decisión.

    No mantiene estado propio de "encendido/apagado" (eso lo hace la
    bomba); solo mantiene el estado lógico IDLE/WATERING para saber
    qué umbral aplicar.
    """

    def __init__(self):
        self.state = IrrigationState.IDLE

    def evaluate(
        self,
        humedad_actual: float,
        humedad_minima: float,
        humedad_deseada: float,
        tiempo_regando_segundos: float,
        tiempo_maximo_riego_segundos: int,
        tiempo_desde_ultimo_riego_segundos: float | None,
        tiempo_minimo_entre_riegos_segundos: int,
        weather_delay: bool = False,
    ) -> HysteresisDecision:
        """
        Evalúa un ciclo de decisión.

        weather_delay: si es True, la predicción meteorológica indica
        que probablemente lloverá pronto y se debe retrasar el inicio
        de un nuevo riego (no afecta a un riego ya en curso).
        """
        decision = HysteresisDecision()

        if self.state == IrrigationState.IDLE:
            if humedad_actual > humedad_minima:
                return decision  # suelo aún suficientemente húmedo, no hacer nada

            # Humedad en o por debajo del umbral de activación.
            if weather_delay:
                return decision  # se pospone el inicio por pronóstico de lluvia

            if tiempo_desde_ultimo_riego_segundos is not None and (
                tiempo_desde_ultimo_riego_segundos < tiempo_minimo_entre_riegos_segundos
            ):
                return decision  # protección de ciclos: aún no pasa el tiempo mínimo

            decision.should_start = True
            decision.start_reason = StartReason.LOW_HUMIDITY
            self.state = IrrigationState.WATERING
            return decision

        # state == WATERING
        if tiempo_regando_segundos >= tiempo_maximo_riego_segundos:
            decision.should_stop = True
            decision.stop_reason = StopReason.MAX_TIME_REACHED
            self.state = IrrigationState.IDLE
            return decision

        if humedad_actual >= humedad_deseada:
            decision.should_stop = True
            decision.stop_reason = StopReason.TARGET_HUMIDITY_REACHED
            self.state = IrrigationState.IDLE
            return decision

        return decision  # sigue regando, ningún umbral alcanzado todavía

    def force_idle(self):
        """Usado cuando se detiene el riego manualmente o por seguridad."""
        self.state = IrrigationState.IDLE
