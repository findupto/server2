# MK Pizza & Ice Bar POS

Offline-first restaurant POS/control center for MK Pizza & Ice Bar.

## Included now
- One web application with role-aware displays: admin, waiter, kitchen, cashier, rider and customer-ready role architecture.
- Products, categories, SKUs, prices and deals.
- Cart and order creation.
- Order lifecycle: pending → authorized → preparing → ready → paid/closed, plus delivery states.
- Waiter order ownership and permitted status changes.
- Kitchen queue and status controls.
- Rider delivery-only filtering and delivery status.
- Customer purchase-history endpoint.
- Audit trail for admin.
- SQLite local database with WAL mode.
- Sync event API for connecting local/offline clients to a central POS server.
- Electron Windows desktop shell for the same POS UI.

## Run locally on Windows
Use **Node.js 22 LTS** for this project. Node 24 is not currently supported because the local database uses the native `better-sqlite3` module.

1. Install Node.js 22 LTS.
2. Close the current Command Prompt and open a new one.
3. In the project folder run:

```bat
rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
npm install
npm start
```

4. Open `http://localhost:4173`.

If your npm installation reports that package install scripts are blocked, allow the install scripts and run `npm install` again. `better-sqlite3` and Electron need their native/downloaded components during installation.

For a local development setup, the seeded role PIN defaults are available in the server configuration; for production, replace them with environment variables and a strong `JWT_SECRET` before deployment.

## Test the Windows desktop shell
After a successful `npm install`:

```bat
npm run desktop
```

This launches the same POS inside Electron without creating an installer.

## Windows EXE
After testing locally:

```bat
npm run dist
```

The Windows installer is written to `dist\\`.

## Network / cloud architecture
The desktop POS is the local source of truth when running at the store. A cloud-hosted copy of this Node service can be used as the internet endpoint. Clients connect over HTTPS to the cloud endpoint, while the store desktop keeps SQLite locally. The `/api/sync` endpoints provide the event exchange layer for offline work.

For production, use HTTPS, a long random JWT secret, firewall rules, regular SQLite backups, and a proper cloud database/queue if multiple stores will synchronize concurrently.

## Planned expansion points
Customer accounts/public ordering, inventory/recipes/BOM, purchasing, production yield, wastage, expenses/accounts, CSV import/export, coupons, table map, push notifications, receipt printing, barcode support, kitchen timers, Android/Capacitor packaging, and multi-store conflict resolution can be added on top of the current schema and role/security boundary.
