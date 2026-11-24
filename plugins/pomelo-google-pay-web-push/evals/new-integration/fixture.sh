#!/usr/bin/env bash
# App Express mínima de un emisor que ya usa la API de Pomelo para leer la tarjeta.
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

cat > .env.example <<'EOF'
POMELO_BASE_URL=https://api.pomelo.la
POMELO_CLIENT_ID=
POMELO_CLIENT_SECRET=
POMELO_AUDIENCE=
EOF

cat > server.js <<'EOF'
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Sesión simulada: en producción el usuario sale del login del banco.
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

async function getPomeloCard(cardId) {
  const token = await getPomeloAccessToken();
  const response = await fetch(`${process.env.POMELO_BASE_URL}/cards/v1/${cardId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Pomelo get card failed: ${response.status}`);
  const { data } = await response.json();
  return data; // { id, provider: "VISA" | "MASTERCARD", last_four, name_on_card, ... }
}

app.get("/api/card", requireAuth, async (req, res) => {
  const card = await getPomeloCard(req.user.cardId);
  res.json({
    id: card.id,
    provider: card.provider,
    lastFour: card.last_four,
    nameOnCard: card.name_on_card,
  });
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
  </head>
  <body>
    <h1>Mi tarjeta</h1>
    <section id="card">
      <p id="card-name"></p>
      <p id="card-number"></p>
    </section>

    <script>
      async function loadCard() {
        const response = await fetch("/api/card");
        const card = await response.json();
        document.getElementById("card-name").textContent = card.nameOnCard;
        document.getElementById("card-number").textContent = `•••• ${card.lastFour}`;
      }

      loadCard();
    </script>
  </body>
</html>
EOF
