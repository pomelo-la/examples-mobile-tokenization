#!/usr/bin/env bash
# Emisor con una integración de Web Push Provisioning rota a propósito.
set -euo pipefail

mkdir -p public

cat > package.json <<'EOF'
{
  "name": "banco-demo",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": { "express": "^4.19.2" }
}
EOF

cat > server.js <<'EOF'
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function requireAuth(req, res, next) {
  req.user = { id: "usr-2Vb1xZ", cardId: "crd-3Fq9LmARBs" };
  next();
}

let cachedToken = null;

async function getPomeloAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const response = await fetch(`${process.env.POMELO_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.POMELO_CLIENT_ID,
      client_secret: process.env.POMELO_CLIENT_SECRET,
      audience: process.env.POMELO_AUDIENCE,
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) throw new Error(`Pomelo token failed: ${response.status}`);
  const data = await response.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

app.get("/api/card", requireAuth, (req, res) => {
  res.json({ id: "crd-3Fq9LmARBs", provider: "MASTERCARD", lastFour: "2962", nameOnCard: "ANA GOMEZ" });
});

app.get("/api/me/address", requireAuth, (req, res) => {
  res.json({
    name: "Ana Gómez",
    addressLines: ["Av. Corrientes 1234"],
    localityName: "Buenos Aires",
    administrativeAreaName: "CABA",
    postalCodeNumber: "C1043AAZ",
    countryCode: "AR",
    phone: "+54 11 5555-5555",
  });
});

app.post("/api/google-pay/opcs", requireAuth, async (req, res) => {
  const token = await getPomeloAccessToken();
  const response = await fetch(`${process.env.POMELO_BASE_URL}/token-provisioning/v2/visa/google-pay`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      card_id: req.body.cardId,
      server_session_id: req.body.serverSessionId,
      device_id: req.body.deviceId,
      wallet_account_id: req.body.walletAccountId,
    }),
  });
  const { data } = await response.json();
  res.json(data);
});

app.listen(3000, () => console.log("http://localhost:3000"));
EOF

cat > public/integration.min.js <<'EOF'
// Librería de Google Pay Web Push Provisioning (placeholder del caso de eval).
EOF

cat > public/index.html <<'EOF'
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Banco Demo - Mi tarjeta</title>
    <script src="/integration.min.js"></script>
  </head>
  <body>
    <h1>Mi tarjeta</h1>
    <p id="card-number"></p>

    <button type="button" id="add-to-google-pay">
      <img src="https://pay.google.com/gp/v/a/pushprovisioning/saveButtonImage?hl=es-419" height="46" alt="Agregar a Google Pay" />
    </button>

    <script>
      let card;

      async function loadCard() {
        card = await (await fetch("/api/card")).json();
        document.getElementById("card-number").textContent = `•••• ${card.lastFour}`;
      }

      function toBytes(base64) {
        return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      }

      document.getElementById("add-to-google-pay").addEventListener("click", async () => {
        const address = await (await fetch("/api/me/address")).json();

        window.googlepay.openAppWindow({
          integratorId: "BANCO_DEMO_1",
          tokenSetting: 1,
          cardSetting: 1,
          onSessionCreated: async (payload) => {
            const opcs = await (
              await fetch("/api/google-pay/opcs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  cardId: card.id,
                  serverSessionId: payload.serverSessionId,
                  deviceId: payload.publicDeviceId,
                  walletAccountId: payload.publicWalletId,
                }),
              })
            ).json();

            window.googlepay.pushPaymentCredentials({
              displayName: card.nameOnCard,
              lastDigits: card.lastFour,
              userAddress: address,
              tokenCredentials: {
                cardNetwork: "CARD_NETWORK_MASTERCARD",
                tokenServiceProvider: "TOKEN_PROVIDER_MASTERCARD",
                opaquePaymentCard: toBytes(opcs.opc),
              },
              cardCredentials: {
                googleOpaquePaymentCard: toBytes(opcs.google_opc),
              },
            });
          },
          onSuccess: () => alert("¡Listo!"),
          onFailure: () => alert("Error"),
        });
      });

      loadCard();
    </script>
  </body>
</html>
EOF
