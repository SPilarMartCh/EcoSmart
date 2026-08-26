# EcoSmart Fields

> **Actualización:** este frontend ya está conectado a un proyecto Supabase real (no
> usa datos simulados en JavaScript). Ver [`../../SETUP.md`](../../SETUP.md) para la
> guía de puesta en marcha completa. El prompt original de Lovable se conserva abajo
> como referencia histórica del diseño.

Create the first version of a web application called EcoSmart, an intelligent irrigation and smart farming dashboard. Visual inspiration: natural agricultural photography, deep navy navigation, green landscape, rounded shapes, clean modern typography. For the authenticated dashboard use a light, clean, professional SaaS dashboard rather than putting a photo behind all the data.

Project goal: build the frontend and initial data model for a smart irrigation system that will eventually connect to an ESP32 and soil-moisture/temperature sensors. There are NO real sensors connected yet, so use clearly labeled simulated/demo data for now. Do not pretend the hardware is connected.

Build these screens and interactions:
1. Landing page at / with EcoSmart branding, hero message in Spanish: “Soluciones inteligentes para el campo moderno”, short explanation, benefits, and CTA buttons “Iniciar sesión” and “Ver demostración”.
2. Login/register UI (demo-only initially; prepare the structure for Supabase Auth later).
3. Main dashboard at /dashboard with a sidebar navigation and responsive layout. Navigation: Dashboard, Mis cultivos, Riego, Monitoreo, Clima, Historial, Sensores, Configuración.
4. Dashboard cards: Humedad del suelo (63%), Temperatura (24.5 °C), Humedad ambiental (72%), Bomba (OFF), system status (Demo / Simulado), and Internet connection status. Add a humidity history line chart using demo data and a weather recommendation card showing rain probability and whether irrigation is recommended.
5. Irrigation control page: automatic/manual modes, simulated pump state, manual start/stop, duration selector, current moisture, minimum moisture, target moisture, and a clear hysteresis explanation. Use example logic: start irrigation at <=45% and stop at >=65%. Show that this is configuration/demo logic, not actual hardware control.
6. Crops page: cards/table for crops with example “Tomate”, “Lechuga”, and “Chile”. Allow opening a crop configuration form with humidity minimum, target, maximum, temperature range, automatic irrigation toggle, and irrigation duration.
7. Monitoring page: sensor cards and charts for soil moisture, temperature, ambient humidity, plus a recent readings table. Include a “Datos simulados” badge.
8. Weather page: forecast cards and a recommendation such as “No se recomienda regar” when rain probability is high. Make it clear weather data is simulated for now.
9. History page: irrigation events with date/time, mode, duration, starting/ending humidity, and reason; include a filter.
10. Sensors page: sensor list, status, current value, calibration UI with dry/wet reference values, and calibration history. Include a simulated sensor connection status.
11. Settings page: user profile, notification preferences, automatic irrigation settings, and system settings.

Design direction: Spanish UI, polished university-project/prototype quality, modern agricultural IoT SaaS. Use deep navy, natural greens, white/off-white backgrounds, rounded cards, subtle shadows, accessible contrast, Lucide icons, and responsive behavior for desktop and mobile. Add small status badges and clear visual hierarchy. Avoid excessive gradients. Make the dashboard visually impressive but practical.

Architecture: TypeScript + React + Tailwind + shadcn/ui. Keep components modular and data-driven. Create a small mock data layer so later we can replace demo data with Supabase/ESP32 data without rewriting the UI. Do not implement real ESP32 communication yet. Do not require an external API for the demo. Prepare the project for a PostgreSQL/Supabase database later with entities conceptually matching: users, crops, sensors, readings, irrigation_events, irrigation_config, sensor_calibrations, weather_forecasts.

Make the first version complete enough to click through all major sections.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4748f0a8-c050-4054-8b64-60b5c1ee9906).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
