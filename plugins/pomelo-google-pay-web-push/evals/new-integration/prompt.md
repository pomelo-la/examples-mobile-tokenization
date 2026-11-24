---
tags: [integration]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill]
---

Somos un banco que emite tarjetas con Pomelo. Queremos que desde nuestra web los clientes puedan agregar su tarjeta a Google Pay (web push provisioning).

Ya descargamos la librería de Google en `public/integration.min.js` y nuestro integratorId es `BANCO_DEMO_1`. El backend está en `server.js` (ya usa la API de Pomelo para leer la tarjeta) y la página de la tarjeta en `public/index.html` (HTML con el script inline).

Implementalo editando solo esos dos archivos, sin crear archivos nuevos.
