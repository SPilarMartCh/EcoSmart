# EcoSmart — Sistema de riego inteligente

Sistema de riego inteligente controlado por Raspberry Pi, con aplicación
web (Fases 2-3). Este repositorio contiene actualmente la **Fase 1:
Raspberry Pi y sistema de riego local**.

## Estado del proyecto

- ✅ **Fase 1 — Raspberry Pi y sistema de riego** (agente Python, SQLite local)
- ✅ **Fase 2 — Backend** (Supabase/Postgres, en vez de Node+Express+MongoDB — ver decisión abajo)
- ✅ **Fase 3 — Aplicación web** (`BD proy/ecosmart-fields-main/`, React + Vite + TanStack, conectada de verdad a Supabase)
- ⬜ Fase 4 — Integración end-to-end con hardware físico y Supabase Auth real

**Cómo quedaron conectadas las tres partes:** tanto la app web como el agente de la
Raspberry Pi leen/escriben las mismas tablas de un mismo proyecto Supabase,
usando el mismo `device_id` (`ecosmart-pi-01` por defecto). La app web usa
`@supabase/supabase-js` desde el navegador con la clave pública ("anon key",
protegida por Row Level Security); la Raspberry Pi usa la API REST de
Supabase (PostgREST) vía `requests`. El login de la app sigue siendo de
demostración (sin Supabase Auth activo todavía), así que no hay una tabla
por usuario: todo se filtra por dispositivo.

👉 **Guía completa de puesta en marcha (Supabase + web + Raspberry): [`SETUP.md`](./SETUP.md)**

## Fase 1 — Qué incluye

- Lectura de humedad del suelo vía ADS1115 (sensor capacitivo).
- Lectura de temperatura vía DS18B20 (opcional, tolera su ausencia).
- Control de bomba vía relé + GPIO, con protección de tiempo máximo.
- Motor de histéresis para riego automático (ver explicación abajo).
- Riego manual con apagado automático de seguridad.
- Protección contra lecturas inválidas y contra ciclos de riego excesivos.
- Base de datos local SQLite (persistencia incluso sin Internet).
- Simulador completo (sensores + bomba + clima) para probar sin hardware.
- Cola de sincronización preparada para la Fase 2 (aún sin backend real).

## Cómo probarlo (sin hardware) — modo simulador

```bash
cd raspberry
cp .env.example .env          # dejar HARDWARE_MODE=simulator
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Ejecuta los 5 escenarios de prueba obligatorios
python3 -m simulator.scenarios

# O ejecuta el agente completo en loop continuo (Ctrl+C para detener)
python3 main.py
```

## Cómo usarlo con hardware real (en la Raspberry Pi)

```bash
cd raspberry
cp .env.example .env
nano .env                      # cambiar HARDWARE_MODE=real, revisar pines

# Habilitar I2C y 1-Wire en la Pi (una sola vez):
sudo raspi-config              # Interface Options -> I2C: enable
                                # Interface Options -> 1-Wire: enable

python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-hardware.txt

python3 main.py
```

## Cómo funciona la histéresis (resumen)

El cultivo define dos umbrales distintos:

- `humedad_minima` → umbral de **activación** (enciende la bomba).
- `humedad_deseada` → umbral de **desactivación** (apaga la bomba).

Ejemplo con Tomate (40% / 60%): si la humedad baja a 40% se enciende
la bomba, y sigue encendida aunque suba a 45%, 50%, 55%... Solo se
apaga al llegar a 60% (o al superar el tiempo máximo de riego, lo que
ocurra primero). Esto evita que la bomba se encienda y apague
repetidamente cuando la humedad oscila cerca de un único límite.
Detalle completo en `raspberry/irrigation/hysteresis.py`.

## Estructura del proyecto

```
ecosmart/
├── raspberry/
│   ├── sensors/            # soil_sensor.py, temperature_sensor.py
│   ├── actuators/          # pump.py (relé + GPIO + watchdog de seguridad)
│   ├── irrigation/         # hysteresis.py, controller.py
│   ├── sync/                # sync_manager.py (sincroniza de verdad con Supabase)
│   ├── database/            # db.py, schema.sql (SQLite local)
│   ├── simulator/           # simulator.py, scenarios.py
│   ├── config/               # settings.py
│   ├── main.py
│   ├── requirements.txt
│   ├── requirements-hardware.txt
│   └── .env.example
├── BD proy/
│   └── ecosmart-fields-main/   # App web (React + Vite + TanStack + Supabase)
│       ├── src/lib/supabaseClient.ts
│       ├── src/lib/api.ts       # hooks de datos reales (reemplaza mock-data)
│       ├── src/lib/types.ts
│       ├── src/routes/           # páginas del dashboard
│       ├── supabase/
│       │   ├── seed-demo-data.sql
│       │   └── rls-demo-policies.sql
│       └── .env.example
├── docs/
├── SETUP.md                 # guía de puesta en marcha completa
├── .gitignore
└── README.md
```

## Próximos pasos

Con Fase 1-3 conectadas, lo que falta para producción real es: activar
Supabase Auth (login real por usuario), reemplazar las políticas RLS de
demo por unas basadas en `auth.uid()`, y probar el flujo completo con
hardware físico conectado a la Raspberry Pi.
