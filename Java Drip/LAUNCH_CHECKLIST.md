# Java Drip Coffee Launch Checklist

This checklist reflects the app as it exists today:

- website-managed menu
- in-site pickup order flow
- staff confirmation through the admin panel
- Square online payment required for pickup orders
- DoorDash delivery handoff
- staff-managed photo/video gallery

## Contract Completion TODO

- [x] Full branded Java Drip Coffee website
- [x] Digital menu with admin-managed items, pricing, add-ons, and categories
- [x] Pickup ordering flow through the website
- [x] DoorDash delivery handoff
- [x] Social media integration with official Instagram, Facebook, and TikTok profiles
- [x] Staff-managed photo gallery
- [x] Staff-managed video gallery for short clips
- [ ] Production Square checkout configured and tested with the client account
- [ ] Production email notifications configured and tested
- [ ] Persistent production storage verified for admin edits and gallery uploads
- [ ] Final live customer/admin QA pass completed on the production URL
- [ ] Client approval/sign-off

## 1. Production Environment

- [ ] Deploy the app using the root `render.yaml` or an equivalent Node host with persistent storage
- [ ] Set the final production frontend domain in `backend/.env` or the host environment
  - `FRONTEND_URL=https://your-domain.com`
- [ ] Set `NODE_ENV=production`
- [ ] Set `TRUST_PROXY=true` if production is behind a real reverse proxy or platform load balancer
- [ ] Set `SQLITE_DB_PATH` to a persistent disk path in production
  - Render default from `render.yaml`: `SQLITE_DB_PATH=/var/data/javadrip.db`
- [x] Confirm the frontend build is current:

```bash
npm run build
```

## 2. Customer Authentication

- [ ] Add Clerk frontend key in `frontend/.env.local` or production env:
  - `VITE_CLERK_PUBLISHABLE_KEY`
- [ ] Add Clerk backend keys in `backend/.env` or production env:
  - `CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
- [ ] Enable the desired Clerk providers:
  - Google
  - Facebook
  - Apple
- [x] Verify backend customer profile creation/upsert and linked pickup history with `npm run qa:customer-flow`
- [ ] Verify sign-up, sign-in, sign-out, and profile icon behavior on the live site

## 3. Staff Authentication

- [x] Set `ADMIN_SESSION_SECRET`
- [x] Set `ADMIN_BOOTSTRAP_EMAIL`
- [x] Set `ADMIN_BOOTSTRAP_PASSWORD`
- [x] Sign into `/admin/signin`
- [x] Confirm the bootstrap password is changed if needed for long-term production use

## 4. Email Delivery

- [ ] Configure SMTP/transactional email in Render:

```bash
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=javadripcoffee@gmail.com
EMAIL_PASS=
EMAIL_TO=javadripcoffee@gmail.com
ORDER_NOTIFICATION_EMAIL=javadripcoffee@gmail.com
```

- [ ] Submit a pickup request and confirm the store notification email arrives
- [ ] Confirm a pickup order from the admin panel and verify the customer confirmation email arrives
- [x] Admin confirmation now reports if the customer email was skipped or failed

## 5. Square Online Pickup Payments

- [ ] Confirm whether the client wants sandbox testing first or direct production setup
- [ ] Add Square backend variables:

```bash
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_WEBHOOK_NOTIFICATION_URL=https://your-domain.com/api/payments/square/webhook
SQUARE_API_VERSION=2025-09-24
```

- [x] Register the Square webhook URL in the Square Developer Dashboard
- [x] Test creating a Square-hosted checkout link from a pickup order
- [x] Confirm Square webhook reaches the app with `200` responses
- [ ] Confirm Square webhook changes the order from `pending_payment` to `pending_confirmation` with `payment_status=paid`
- [ ] Confirm Square redirects customers back to the website order page after payment
- [ ] Verify admin panel blocks confirming unpaid online orders
- [ ] Switch `SQUARE_ENVIRONMENT=production` only after sandbox testing passes

## 6. Menu + Content Review

- [ ] Review all menu category names
- [ ] Review all item names, prices, and descriptions
- [ ] Review item photos uploaded through the admin panel
- [x] Staff can create and delete gallery categories
- [x] Staff can upload gallery photos
- [x] Staff can upload short gallery videos
- [x] Review gallery page content and social imagery
- [x] Confirm social links are correct:
  - Instagram
  - Facebook
  - TikTok

## 7. Pickup Flow QA

- [x] Add menu items with add-ons
- [x] Submit a pickup request as a guest
- [ ] Submit a pickup request while signed in
- [x] Verify `ASAP` only appears during current store hours
- [x] Verify `Pickup Later` only shows valid 15-minute slots
- [x] Verify orders cannot be submitted after the store is closed for the day
- [x] Verify order confirmation links open correctly
- [ ] Verify signed-in customers can see their linked pickup history in `/profile`

## 8. Admin Flow QA

- [x] Create a new category
- [x] Create a new item
- [x] Update price, description, and image
- [x] Archive and restore an item
- [x] Create, edit, hide, and delete gallery media
- [x] Verify new pickup orders trigger the in-panel admin notification banner
- [x] Confirm a pending pickup request
- [x] Verify the confirmed pickup time appears on the customer order page

## 9. Site QA

- [x] Homepage loads cleanly
- [x] `Fuel the Drift` carousel behaves correctly
- [x] Gallery page loads and social embed renders
- [x] Menu page and pickup builder modal work on mobile
- [x] Contact form validation works
- [x] Legal pages are reviewed
- [x] Automated visual QA passes across desktop, tablet, and mobile:

```bash
npm run qa:visual
```

## 10. Cross-Browser + Device QA

- [x] Chrome desktop
- [x] Safari desktop
- [x] iPhone Safari
- [x] Android Chrome simulated viewport pass

Check:

- [x] layout stability
- [x] modal behavior
- [x] form usability
- [x] button states
- [x] carousel behavior

## 11. Operations

- [ ] Add the custom domain to the production host
- [ ] Update GoDaddy DNS records
  - `A` record for `@` points to the host apex IP
  - `CNAME` for `www` points to the host service domain
- [ ] Remove conflicting GoDaddy parked-site, forwarding, or old hosting records
- [ ] Verify HTTPS certificate issuance
- [ ] Confirm `https://your-domain.com/api/health` returns a healthy response
- [x] Set up a database backup plan for `backend/data/javadrip.db`
- [x] Confirm server restart/deploy process
- [ ] Confirm logs are accessible if pickup emails or order submissions fail

## 12. Final Smoke Test

From the workspace root:

```bash
npm run qa:smoke
npm run qa:customer-flow
npm run qa:admin-flow
npm run qa:admin-notifications
npm run qa:visual
```

Verify:

- [x] smoke test passes
- [x] no blocking warnings remain except intentionally deferred items

## 13. Client Sign-Off

- [ ] Menu approved
- [ ] Gallery/social presentation approved
- [ ] Pickup flow approved
- [ ] Staff admin workflow approved
- [ ] Delivery handoff wording approved
- [ ] Production Square payment test approved
- [ ] Production email notification test approved
- [ ] Render persistent storage verified after redeploy

## Notes From Current QA Pass

- `npm run qa:smoke` is passing.
- `npm run qa:customer-flow` is passing.
- `npm run qa:admin-flow` is passing.
- `npm run qa:admin-notifications` is passing.
- `npm run qa:visual` is passing across 12 routes and 3 viewport sizes, with screenshots saved to `qa-screenshots/`.
- `npm run backup:db` is working and writing timestamped SQLite snapshots to `Java Drip/backend/backups/`.
- Local auth readiness is healthy after setting the required backend session and Clerk variables.
- Remaining unchecked items are either production-environment tasks, email-delivery verification, live Clerk sign-up verification, Square production testing, persistent storage verification, or client approval items.
