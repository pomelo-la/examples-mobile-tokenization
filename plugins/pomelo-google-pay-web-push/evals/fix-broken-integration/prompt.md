---
tags: [fix]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill]
---

Tenemos integrado "Agregar a Google Pay" en nuestra web con tarjetas de Pomelo, pero no anda bien: a muchos usuarios no se les abre la ventana de Google, a otros la ventana se queda cargando para siempre, y cuando llega a abrir, Google rechaza la tarjeta.

El frontend está en `public/index.html` (script inline) y el backend en `server.js`. Revisá la integración y corregila editando solo esos dos archivos.
