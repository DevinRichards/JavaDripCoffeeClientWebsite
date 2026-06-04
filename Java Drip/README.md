# Java Drip Coffee Website

Java Drip Coffee is a full-stack marketing and pickup-ordering site built with:

- `React + Vite` on the frontend
- `Node.js + Express + SQLite` on the backend
- `Clerk` for customer sign-in
- a local staff admin panel for menu and pickup-order management

The current production shape of the app is:

- customers browse the menu and submit **pickup requests**
- staff confirm pickup timing from the **admin panel**
- customers pay online through **Square-hosted checkout** before the store confirms pickup timing
- delivery still links out to **DoorDash**
- menu content is managed in the site admin, not synced live from Clover
- production deployment is prepared through the root `render.yaml`, with GoDaddy DNS steps documented in `../LAUNCH_WITH_GODADDY.md`

## Workspace Structure

```text
Java Drip/
├── backend/
│   ├── server.js
│   ├── db/
│   ├── routes/
│   ├── services/
│   └── data/javadrip.db
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── content/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── seo/
│   └── scripts/prerender.mjs
└── ../scripts/
    ├── dev.js
    ├── stop-dev.js
    ├── qa-smoke.cjs
    ├── qa-customer-flow.cjs
    ├── qa-admin-flow.cjs
    ├── qa-admin-notifications.cjs
    ├── qa-visual.cjs
    └── backup-db.cjs
```

## Development

From the workspace root:

```bash
npm install
cd "Java Drip/backend" && npm install
cd ../frontend && npm install
cd ../..
npm run dev
```

That starts:

- frontend at `http://localhost:5181`
- backend at `http://localhost:3201`

Helpful root commands:

```bash
npm run dev
npm run stop-dev
npm run restart-dev
npm run build
npm run qa:smoke
npm run qa:customer-flow
npm run qa:admin-flow
npm run qa:admin-notifications
npm run qa:visual
npm run backup:db
```

## Current Public Routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage |
| `/menu` | Menu browsing and pickup-builder entry |
| `/gallery` | Photo/video gallery and social section |
| `/locations` | Store details and hours |
| `/about` | Brand story |
| `/contact` | Contact form |
| `/signin` | Customer sign-in |
| `/profile` | Signed-in customer profile and order history |
| `/checkout` | Pickup request checkout |
| `/order/:id` | Pickup request confirmation/status |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/admin/signin` | Staff sign-in |
| `/admin` | Redirects staff to the active admin workspace |
| `/admin/orders` | Staff pickup queue |
| `/admin/menu` | Staff menu management |
| `/admin/gallery` | Staff gallery media and category management |

## Current Backend API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/menu` | Public menu data |
| `GET` | `/api/locations` | Pickup locations |
| `GET` | `/api/gallery` | Public active gallery categories and media |
| `POST` | `/api/orders` | Submit pickup request |
| `GET` | `/api/orders/:id?token=...` | View a pickup order with token or signed-in owner access |
| `GET` | `/api/payments/config` | Payment configuration status |
| `POST` | `/api/payments/square/checkout` | Create Square-hosted checkout link for a pickup order |
| `POST` | `/api/payments/square/webhook` | Square payment webhook receiver |
| `POST` | `/api/contact` | Contact form submission |
| `GET` | `/api/customer/session` | Signed-in customer profile + order history |
| `POST` | `/api/admin/login` | Staff login |
| `GET` | `/api/admin/session` | Staff session check |
| `GET` | `/api/admin/status` | Staff auth readiness |
| `GET` | `/api/admin/menu` | Admin menu payload |
| `POST` | `/api/admin/categories` | Create menu category |
| `PUT` | `/api/admin/categories/:id` | Update category |
| `POST` | `/api/admin/items` | Create menu item |
| `PUT` | `/api/admin/items/:id` | Update menu item |
| `GET` | `/api/admin/orders` | Staff pickup queue |
| `POST` | `/api/admin/orders/:id/confirm` | Confirm pickup request |
| `POST` | `/api/admin/orders/:id/cancel` | Cancel pickup request |
| `GET` | `/api/admin/gallery` | Staff gallery media payload |
| `POST` | `/api/admin/gallery/categories` | Create gallery category |
| `DELETE` | `/api/admin/gallery/categories/:id` | Delete gallery category and move items to Photos |
| `POST` | `/api/admin/gallery` | Create gallery photo/video |
| `PUT` | `/api/admin/gallery/:id` | Update gallery photo/video |
| `DELETE` | `/api/admin/gallery/:id` | Delete gallery photo/video |

## Core Features

- full branded marketing site
- digital menu with categories, pricing, images, and descriptions
- pickup item builder with add-ons
- pickup request flow with tax/fee estimates
- Square-hosted online payment scaffolding for pickup orders
- pickup time selection with `ASAP` or valid 15-minute future slots
- tokenized order confirmation links
- customer account sign-in and order history
- staff admin panel for:
  - menu CRUD
  - image upload
  - category editing
  - pickup order confirmation
- gallery page with staff-managed photo/video uploads
- gallery category management
- embedded social section
- DoorDash delivery link-out

## Environment Variables

### Frontend

Create `frontend/.env.local`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=replace_with_clerk_publishable_key
```

### Backend

Create `backend/.env`:

```bash
PORT=3201
FRONTEND_URL=http://localhost:5181
NODE_ENV=development
TRUST_PROXY=false

CLERK_PUBLISHABLE_KEY=replace_with_clerk_publishable_key
CLERK_SECRET_KEY=replace_with_clerk_secret_key

ADMIN_SESSION_SECRET=replace_with_long_random_secret
ADMIN_BOOTSTRAP_EMAIL=staff@javadrip.coffee
ADMIN_BOOTSTRAP_PASSWORD=<replace_with_strong_password>

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=javadripcoffee@gmail.com
EMAIL_PASS=<replace_with_smtp_password>
EMAIL_TO=javadripcoffee@gmail.com
ORDER_NOTIFICATION_EMAIL=javadripcoffee@gmail.com

# Optional Square online pickup payments
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_WEBHOOK_NOTIFICATION_URL=https://your-domain.com/api/payments/square/webhook
SQUARE_API_VERSION=2025-09-24
```

Pickup checkout requires Square online payment. If the Square variables are not set, checkout stays disabled until online payment is configured.

## Database Notes

SQLite lives at:

```text
backend/data/javadrip.db
```

It stores:

- menu categories
- menu items
- staff users
- customer profiles
- pickup orders
- Square payment link metadata
- order line items
- contact submissions
- gallery categories
- gallery photo/video media

## Smoke Testing

Run:

```bash
npm run qa:smoke
npm run qa:customer-flow
npm run qa:admin-flow
npm run qa:admin-notifications
npm run qa:visual
```

The smoke suite checks:

- health
- menu
- locations
- admin status
- contact validation
- pickup order creation
- tokenized order fetch

The customer flow QA checks:

- customer profile creation from a Clerk user id
- customer profile upsert without duplicate records
- legacy guest pickup history linking by email
- signed-in pickup history linking by Clerk user id

The admin flow QA checks:

- staff login
- category creation
- item creation
- item update
- archive / restore
- guest pickup order creation
- admin queue visibility
- order confirmation
- tokenized customer confirmation view

The admin notification QA checks:

- staff session hydration
- live admin orders page polling
- new pickup request creation while admin is open
- in-panel `New Pickup Alert` banner visibility

The visual QA suite checks 12 public/staff routes at desktop, tablet, and mobile widths. It saves screenshots and a JSON report to:

```text
../qa-screenshots/
```

It fails on:

- horizontal overflow
- broken rendered images
- raw Material Symbols icon text leaking into the UI
- missing route anchor text
- unhandled page errors

## Backups

Create a timestamped SQLite backup from the workspace root:

```bash
npm run backup:db
```

Backups are written to:

```text
Java Drip/backend/backups/
```

## Notes

- The app no longer runs live Clover sync; the old Clover export/import path remains as historical inventory tooling only.
- Rewards are intentionally out of the current customer-facing experience.
- Delivery is currently completed on DoorDash, not inside the site.
