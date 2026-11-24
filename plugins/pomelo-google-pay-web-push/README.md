# Plugin: Google Pay Web Push Provisioning con Pomelo

Plugin de Claude Code con una skill que guía al agente para integrar **Google Pay Web Push Provisioning** con la API de Pomelo en un sitio web existente: el botón "Agregar a Google Pay", el flujo con `window.googlepay`, el endpoint de backend que pide la TSP OPC y la Google OPC, y el manejo de resultados.

La skill se activa sola cuando le pedís al agente algo como _"agregá el botón de Agregar a Google Pay a nuestra web"_ o _"la ventana de Google Pay se queda cargando"_. También se puede invocar con `/pomelo-google-pay-web-push:web-push-provisioning`.

## Instalación

```text
/plugin marketplace add pomelo-la/examples-mobile-tokenization
/plugin install pomelo-google-pay-web-push@pomelo-tokenization
```

El plugin también registra el MCP de Pomelo (`https://api-reference-mcp.pomelo.la/mcp`, definido en `.mcp.json`), que le da al agente acceso a la documentación de la API: buscar endpoints, leer su documentación completa y generar ejemplos de request.

## Estructura

```text
pomelo-google-pay-web-push/
├── .claude-plugin/plugin.json
├── .mcp.json                    # MCP de la API de Pomelo
├── skills/web-push-provisioning/
│   ├── SKILL.md                 # flujo, reglas obligatorias y checklist
│   └── references/
│       ├── backend.md           # API de Pomelo y código de referencia
│       ├── frontend.md          # librería, botón, flujo y tipos
│       └── troubleshooting.md   # códigos de error
└── evals/                       # casos de evaluación
```

## Evals

Las evals miden si la skill lleva al agente a una integración correcta, comparando cada caso **con** y **sin** el plugin.

| Caso | Qué prueba |
| --- | --- |
| `new-integration` | Integración desde cero en una app Express (backend en `server.js`, página en `public/index.html`). |
| `fix-broken-integration` | Corregir una integración con los errores típicos: popup bloqueado, OPC decodificada con `atob`, sin `rel="opener"`, settings pedidos en lugar de finales, sin `closeAppWindow` ni `provisioning_target`. |
| `no-trigger-android` | La skill no se activa para Android nativo. |

Cada caso tiene graders gratuitos (regex sobre los archivos resultantes) y rúbricas evaluadas por un modelo juez.

### Correr las evals

Requiere Claude Code 2.1.269 o superior. Las evals consumen tokens de tu cuenta.

```bash
cd plugins/pomelo-google-pay-web-push
claude plugin eval . --scaffold --allow-tools Write Edit --threshold 0.8 --no-publish
```

- `--scaffold` ejecuta los `fixture.sh` que arman la app de cada caso.
- `--allow-tools Write Edit` deja que el agente edite los archivos.
- `--runs 1` sirve para una pasada rápida mientras se ajusta la skill (por defecto son 3 corridas por caso).
- `--case new-integration` corre un solo caso.

El resultado muestra la columna `WITH` (con el plugin), `W/OUT` (sin el plugin) y `Δ` (lo que aporta la skill). Los detalles quedan en `evals/results/<timestamp>/` (`aggregate-result.json` y `report.html`).

Documentación: [Test plugins with evals](https://code.claude.com/docs/en/plugin-evals).
