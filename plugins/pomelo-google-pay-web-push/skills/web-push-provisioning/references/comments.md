# Cómo documentar el código de la integración

Objetivo: que quien lea el código entienda el flujo de push provisioning sin leer la documentación de Google. El estilo es el del [ejemplo del repo](https://github.com/pomelo-la/examples-mobile-tokenization/tree/develop/example-web-push-google-wallet): comentarios en español, JSDoc en cada pieza y un bloque `Docs:` con el link oficial.

## Contenido

- Reglas
- Cabecera de archivo
- Funciones y tipos
- Pasos de `onSessionCreated`
- Placeholders
- Qué no comentar

## Reglas

- Idioma del proyecto; si no se sabe, español.
- Explicá el **por qué**, no repitas el código (`// llama a fetch` no sirve).
- Una sola vez por concepto: si la regla del `TextEncoder` está documentada en su función, el resto del código no la repite.
- Sin menciones a proveedores internos de tokenización: todo pasa por Pomelo.

## Cabecera de archivo

Qué rol cumple en el flujo, dónde corre (navegador o servidor) y quién lo invoca.

```ts
// Lado backend del emisor en el flujo de Web Push Provisioning.
//
// Este módulo corre solo en el servidor: llama a Pomelo con las credenciales OAuth del emisor,
// que nunca deben llegar al navegador. El sitio lo invoca desde `onSessionCreated`, una vez que
// Google creó la sesión de provisioning y sabe qué se va a hacer (tokenizar, guardar la tarjeta
// o ambas) y, si corresponde, qué dispositivo va a recibir el token.
```

## Funciones y tipos

JSDoc con qué hace, por qué, y `Docs:` cuando hay un link oficial.

```ts
/**
 * Convierte la OPC en base64 que devuelve Pomelo al formato que espera Google.
 *
 * Google NO espera los bytes decodificados de la OPC. Espera un `Uint8Array` cuyos elementos sean
 * los códigos ASCII del propio string base64. Por eso se codifica el string como texto y no se
 * usa `atob`.
 *
 * Docs:
 * https://developers.google.com/pay/issuers/apis/push-provisioning/web/frontend-javascript-api#quick_start
 */
function base64ToUint8Array(base64: string): Uint8Array {
  return new TextEncoder().encode(base64);
}
```

```ts
/**
 * Qué OPC(s) tiene que generar Pomelo, según lo que Google confirmó en `onSessionCreated`:
 * - `TSP_OPC`: solo la TSP OPC, para tokenizar. Requiere `deviceId` y `walletAccountId`.
 * - `GOOGLE_OPC`: solo la Google OPC, para guardar la tarjeta en la cuenta de Google.
 * - `ALL`: ambas.
 */
export type ProvisioningTarget = "TSP_OPC" | "GOOGLE_OPC" | "ALL";
```

## Pasos de `onSessionCreated`

Numerados, un comentario por paso, con el motivo de las reglas no obvias.

```ts
onSessionCreated: async (payload) => {
  // 1. Google puede degradar lo que pedimos (por ejemplo, si el usuario no tiene un dispositivo
  //    compatible). Se decide con los settings finales, no con los que enviamos en openAppWindow.
  const shouldTokenize = payload.tokenSetting === 1;
  const shouldSaveCard = payload.cardSetting === 1;

  // 2. Según los settings finales, se le pide a Pomelo la TSP OPC, la Google OPC o ambas.
  const provisioningTarget = getProvisioningTarget(shouldTokenize, shouldSaveCard);

  // 3. Se pide la OPC en el backend: las credenciales de Pomelo no pueden estar en el navegador.
  const opcs = await requestOpcs(provisioningTarget, payload);

  // 4. Se arman solo las credenciales que corresponden y se las entrega a Google.
  window.googlepay.pushPaymentCredentials(credentials);
},
```

## Placeholders

```ts
// TODO(emisor): reemplazar por una consulta que devuelva la tarjeta solo si pertenece al usuario
// autenticado. Hoy cualquiera que conozca el `cardId` de demo podría pedir OPCs.
```

## Qué no comentar

- Conceptos del framework (rutas, hooks, server actions...).
- Lo que ya dice el nombre de la función o el tipo.
- Historial de cambios o referencias a esta conversación.
