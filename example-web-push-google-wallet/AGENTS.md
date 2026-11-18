# AGENTS.md

Example Next.js app demonstrating Google Pay Web Push Provisioning for Pomelo cards.

## Project Structure

- `app/` - Next.js App Router pages (uses Next.js 16 with breaking changes, check `node_modules/next/dist/docs/` for current API)
- `components/` - React components (AddToGooglePayButton, PaymentCard)
- `lib/google/` - Google Pay integration (types, config, provisioning hook)
- `lib/pomelo/` - Pomelo API client (auth, cards, push provisioning, user data)
- `public/integration-1.6.min.js` - Google's Web Push Provisioning library (loaded via `next/script` with `beforeInteractive` strategy)
- `google-wallet-uwp/` - Google Pay documentation (reference only, not tracked in git)

## Commands

```bash
npm run dev        # Start dev server with Turbopack
npm run build      # Production build
npm run lint       # ESLint (excludes public/**/*.min.js)
npx tsc --noEmit   # Type check
```

## Environment Variables

Required in `.env`:
- `POMELO_BASE_URL`, `POMELO_AUDIENCE`, `POMELO_CLIENT_ID`, `POMELO_CLIENT_SECRET` - Pomelo OAuth
- `POMELO_CARD_ID` - Card ID to display and provision
- `NEXT_PUBLIC_GOOGLE_PAY_INTEGRATOR_ID` - Google Pay Merchant ID (build-time, exposed to client)

See `.env.example` for template.

## Key Implementation Details

**Google Pay Flow** (`lib/google/use-google-pay-provisioning.ts`):
1. User clicks "Add to Google Pay" button
2. `window.googlepay.openAppWindow()` opens Google Pay window (must be called immediately in click handler to avoid popup blocker)
3. `onSessionCreated` callback fetches OPCs from Pomelo backend via server action
4. `pushPaymentCredentials()` sends credentials to Google
5. Callbacks handle success/failure/cancel

**Pomelo OPC Endpoints** (`lib/pomelo/push-provisioning.ts`):
- VISA: `/token-provisioning/v2/visa/google-pay`
- MASTERCARD: `/token-provisioning/v2/mastercard/google-pay`
- Same body for both networks. `provisioning_target` is derived from the FINAL `tokenSetting`/`cardSetting` in `onSessionCreated`: `ALL` (both), `TSP_OPC` (token only, requires `device_id` + `wallet_account_id`), `GOOGLE_OPC` (FPAN only, requires `server_session_id`)
- If the OPC request fails, the flow is cancelled with `closeAppWindow()` (Google calls no callback after that)

**Next.js 16 Breaking Changes**:
- Uses `cacheComponents` and `partialPrefetching` experimental features
- Layout props use new `LayoutProps<"/">` type
- Check `node_modules/next/dist/docs/01-app/` before using Next.js APIs

**TypeScript**:
- Path alias `@/*` maps to `./*`
- `window.googlepay` namespace typed via `declare global` in `lib/google/google-pay-types.ts`
- Strict mode enabled

**Styling**:
- Tailwind CSS 4 with `@tailwindcss/turbopack` loader
- shadcn/ui components with `cn()` utility from `lib/utils.ts`

## Common Gotchas

- Google Pay button image **must** have `rel="opener"` attribute to prevent E008 errors (TypeScript requires type assertion: `{...({ rel: "opener" } as { rel: string })}`)
- Use `next/image` with `unoptimized` for Google's button image (already optimized by Google)
- `pay.google.com` domain must be in `next.config.ts` `images.remotePatterns`
- Pomelo OAuth tokens are cached in-memory with 60s expiry buffer (`lib/pomelo/auth.ts`)
- `.env.example` is tracked in git (`.gitignore` has `!.env.example` exception)
