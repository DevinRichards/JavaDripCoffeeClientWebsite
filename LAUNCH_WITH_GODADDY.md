# Java Drip Coffee Launch With GoDaddy

This app should be deployed as one production Node service because the Express backend serves both:

- the built Vite website from `Java Drip/frontend/dist`
- the API routes under `/api`

The recommended path is Render + GoDaddy DNS. GoDaddy owns the domain/DNS records. Render hosts the live Node app, persistent SQLite database, HTTPS certificate, and custom domain routing.

## 1. Deploy The App On Render

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint**.
3. Connect the GitHub repo and select the root `render.yaml`.
4. Render will create one web service named `java-drip-coffee`.
5. The service uses a persistent disk mounted at `/var/data`.
6. The SQLite database path is set to `/var/data/javadrip.db` through `SQLITE_DB_PATH`.

Render build command:

```bash
npm install && npm --prefix "./Java Drip/backend" install && npm --prefix "./Java Drip/frontend" install && npm run build
```

Render start command:

```bash
npm start
```

Health check path:

```text
/api/health
```

## 2. Fill Render Environment Variables

Set these before the first production deploy finishes.

```bash
NODE_ENV=production
TRUST_PROXY=true
SQLITE_DB_PATH=/var/data/javadrip.db
FRONTEND_URL=https://your-domain.com

ADMIN_BOOTSTRAP_EMAIL=staff@javadrip.coffee
ADMIN_BOOTSTRAP_PASSWORD=<production-staff-password>

CLERK_PUBLISHABLE_KEY=<clerk-publishable-key>
CLERK_SECRET_KEY=<clerk-secret-key>
VITE_CLERK_PUBLISHABLE_KEY=<same-clerk-publishable-key>

EMAIL_HOST=<smtp-host>
EMAIL_PORT=<smtp-port>
EMAIL_USER=<smtp-user>
EMAIL_PASS=<smtp-password>
EMAIL_TO=javadripcoffee@gmail.com
ORDER_NOTIFICATION_EMAIL=javadripcoffee@gmail.com

SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=<square-access-token>
SQUARE_LOCATION_ID=<square-location-id>
SQUARE_WEBHOOK_SIGNATURE_KEY=<square-webhook-signature-key>
SQUARE_WEBHOOK_NOTIFICATION_URL=https://your-domain.com/api/payments/square/webhook
SQUARE_API_VERSION=2025-09-24
```

Keep Square in `sandbox` until the client confirms a successful test payment. Switch to `production` only after the production Square access token, location id, and webhook signature key are in place.

## 3. Add The Custom Domain In Render

1. Open the Render service.
2. Go to **Settings > Custom Domains**.
3. Add the preferred production domain.
4. If the final domain should be `your-domain.com`, add the root domain. Render will also add/redirect `www`.
5. Copy the Render service subdomain, which looks like:

```text
java-drip-coffee.onrender.com
```

## 4. Update GoDaddy DNS

In GoDaddy, open the domain and go to **DNS / Manage DNS**.

Remove conflicting records first:

- Remove existing `A` records for `@` that point to parked GoDaddy hosting or an old site.
- Remove existing `CNAME` or forwarding records for `www`.
- Remove any `AAAA` records for the root domain or `www` while using Render.

Add these records:

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| `A` | `@` | `216.24.57.1` | `600` or default |
| `CNAME` | `www` | `java-drip-coffee.onrender.com` | `600` or default |

Replace `java-drip-coffee.onrender.com` with the exact Render subdomain shown in the Render dashboard.

## 5. Verify The Domain

Back in Render:

1. Return to **Settings > Custom Domains**.
2. Click **Verify**.
3. Wait for Render to issue HTTPS certificates.
4. Visit both:

```text
https://your-domain.com
https://www.your-domain.com
```

One should be primary and the other should redirect automatically.

## 6. Update External Services After DNS Works

Clerk:

- Add `https://your-domain.com` to allowed origins/redirect URLs.
- Add `https://www.your-domain.com` too if the site will accept `www`.

Square:

- Set the webhook notification URL to:

```text
https://your-domain.com/api/payments/square/webhook
```

Email:

- Confirm contact form email and pickup-order notification email deliver to `javadripcoffee@gmail.com`.

## 7. Launch QA

After the domain resolves, run:

```bash
curl -s https://your-domain.com/api/health
```

Then manually verify:

- homepage loads over HTTPS
- menu loads
- pickup order can be submitted
- admin can sign in
- admin sees the order notification banner
- admin can confirm/cancel an order
- customer profile sign-in works through Clerk
- Square sandbox checkout works if online payments are enabled
- contact form sends to `javadripcoffee@gmail.com`
