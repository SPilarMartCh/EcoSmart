# EcoSmart — Guía de puesta en marcha

Esta guía conecta las tres partes del proyecto: la app web, tu proyecto
Supabase, y el agente de la Raspberry Pi (o su simulador).

## 0. Requisitos

- Node.js 18+ y npm (para la app web).
- Python 3.10+ (para el agente de la Raspberry Pi / simulador).
- Un proyecto en [supabase.com](https://supabase.com) ya creado.

## 1. Base de datos (Supabase)

1. Entra al **SQL Editor** de tu proyecto Supabase.
2. Si es la primera vez y las tablas no existen, créalas primero (columnas
   usadas por este proyecto: `crops`, `sensors`, `readings`,
   `irrigation_events`, `irrigation_config`, `sensor_calibrations`,
   `weather_forecasts`, `system_events`, `profiles`).
3. Corre **`BD proy/ecosmart-fields-main/supabase/seed-demo-data.sql`** para
   cargar datos de ejemplo (3 cultivos, sensores, lecturas, historial de
   riego, pronóstico del clima). Sin esto el dashboard se ve vacío.
4. Si al usar la app ves errores de tipo *"row-level security"* al guardar
   cambios (calibrar un sensor, iniciar riego, editar un cultivo), corre
   también **`supabase/rls-demo-policies.sql`**. Son políticas abiertas
   pensadas solo para esta etapa de demostración (ver advertencia dentro
   del archivo).

## 2. App web

```bash
cd "BD proy/ecosmart-fields-main"
cp .env.example .env      # ya viene prellenado con tus credenciales si usaste este zip
npm install
npm run dev
```

Variables relevantes en `.env`:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — tu proyecto Supabase.
- `VITE_DEVICE_ID` — debe ser idéntico al `DEVICE_ID` del `.env` de la
  Raspberry Pi (por defecto `ecosmart-pi-01` en ambos).

La app ya lee y escribe directamente en Supabase (no hay más datos
simulados en JavaScript). Lo que sigue siendo de demostración es el login:
no hay Supabase Auth activo, así que no existe "iniciar sesión" real ni
una tabla por usuario — todo se filtra por `device_id`.

## 3. Raspberry Pi (o simulador, sin hardware)

```bash
cd raspberry
cp .env.example .env      # ya viene prellenado con tus credenciales si usaste este zip
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# HARDWARE_MODE=simulator por defecto: no necesitas Raspberry física para probar

python3 main.py
```

Variables relevantes en `raspberry/.env`:

- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — el mismo proyecto que la app web.
- `DEVICE_ID` — el mismo valor que `VITE_DEVICE_ID` en la app web.
- `SUPABASE_SYNC_ENABLED=true` — apágalo (`false`) si quieres correr el
  agente sin intentar sincronizar (por ejemplo, sin internet).

Cada ciclo, el agente guarda todo primero en su SQLite local (funciona
aunque no haya internet) y luego, si hay conexión, sube a Supabase lo que
todavía no se ha sincronizado (`readings`, `irrigation_events`,
`system_events`). Si una subida falla, la fila se queda marcada como
pendiente y se reintenta en el siguiente ciclo — no se pierde nada.

## 4. Verifica que todo esté conectado

1. Corre el agente de la Raspberry Pi (paso 3) en modo simulador por unos
   minutos.
2. En el **Table Editor** de Supabase, revisa que `readings` tenga filas
   nuevas con `device_id = 'ecosmart-pi-01'`.
3. Abre la app web (paso 2) → el panel general debería mostrar esas
   lecturas en la gráfica de humedad, sin recargar nada manualmente
   (React Query refresca al navegar entre páginas).
4. Desde **Control de riego** en la app, prueba "Iniciar riego" en modo
   manual → revisa que aparezca un evento nuevo en `irrigation_events`.

## 5. Limitaciones conocidas de esta etapa

- **Sin hardware físico conectado todavía**: el simulador genera datos
  realistas, pero ningún sensor/bomba real está midiendo o regando de
  verdad hasta que corras el agente con `HARDWARE_MODE=real` en una
  Raspberry Pi con los sensores cableados.
- **Login de demostración**: cualquiera con la `anon key` puede leer y
  escribir estas tablas (protegido solo por las políticas RLS de demo).
  Antes de usar esto con datos reales de un cliente, activa Supabase Auth
  y cambia las políticas para filtrar por `auth.uid()`.
- **Un cultivo por evento**: el agente local todavía no mapea múltiples
  cultivos a los UUID de Supabase (sube `crop_id = null`); la app web sí
  soporta varios cultivos, pero el vínculo automático sensor↔cultivo en
  la Raspberry es trabajo de una fase futura.
- **Clima**: `weather_forecasts` se llena a mano (o con el script de
  ejemplo), todavía no hay integración con un servicio meteorológico real.
