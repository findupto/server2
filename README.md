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

## Run locally
1. Install Node.js 20+.
2. `npm install`
3. Set `JWT_SECRET` and the role PIN environment variables before first start: `OWNER_PIN`, `ADMIN_PIN`, `WAITER_PIN`, `KITCHEN_PIN`, `CASHIER_PIN`, `RIDER_PIN`.
4. `npm start`
5. Open `http://localhost:4173`.

The supplied role PINs should be placed into those environment variables locally; they are intentionally not committed to the repository.

## Windows EXE
Run `npm install`, then `npm run dist`. The Electron builder creates a Windows installer using the same server and web application.

## Network / cloud architecture
The desktop POS is the local source of truth when running at the store. A cloud-hosted copy of this Node service can be used as the internet endpoint. Clients connect over HTTPS to the cloud endpoint, while the store desktop keeps SQLite locally. The `/api/sync` and `/api/sync` POST endpoints provide the event exchange layer for offline work.

For production, use HTTPS, a long random JWT secret, firewall rules, regular SQLite backups, and a proper cloud database/queue if multiple stores will synchronize concurrently.

## Planned expansion points
Inventory/recipes/BOM, purchasing, production yield, wastage, expenses/accounts, CSV import/export, coupons, table map, richer customer accounts, push notifications, receipt printing, barcode support, kitchen timers, and multi-store conflict resolution can be added on top of the current schema and role/security boundary.
