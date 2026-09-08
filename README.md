# MK Pizza & Ice Bar POS

Premium offline-first restaurant POS/control center for **MK Pizza & Ice Bar**, Abbas Chowk, Collage Road, Bhakkar.

## Current release

- Role-based customer, waiter, rider, kitchen, cashier, admin and owner displays.
- Owner account: **Malik / 0099**. Admin: **admin / 1122**. Waiter, kitchen, cashier and rider: **1234**.
- Menu/product CRUD with categories, SKU, unit, price, description and activation/deactivation.
- Bulk CSV import/export for products and variants.
- Product variants such as Small/Medium/Large/XL with variant-specific prices and SKUs.
- Deals/combos with component product/variant quantities for traceable demand and stock planning.
- Customer signup/login, customer history and staff-side customer management.
- Orders for takeaway, dine-in, delivery and online flows.
- Authorization gate before kitchen preparation.
- Kitchen queue/timeline states and cashier payment/closing.
- Rider delivery workflow and rider history/detail access.
- 20-table status map.
- Inventory items, stock adjustments, purchases/receiving, suppliers and stock movement ledger.
- Recipe/BOM consumption tied to the Preparing transition, with insufficient-stock protection.
- Production/yield/loss records and wastage transactions.
- Sales analytics, product/variant performance, sales by order type and expense/profit totals.
- Expenses, approvals and audit trail.
- Settings API and sync-event API for connected clients.
- SQLite WAL local persistence and browser offline queue.
- Installable PWA shell and Electron Windows desktop shell.

## Windows setup

Use **Node.js 22 LTS**. Node 24 is intentionally outside the supported engine range because `better-sqlite3` is a native module.

```bat
rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
npm install
npm start
```

Open `http://localhost:4173`.

For Electron desktop testing:

```bat
npm run desktop
```

For the Windows installer:

```bat
npm run dist
```

The installer is written to `dist\\`.

## Offline and network operation

The browser/PWA can keep the menu shell and locally queued orders available when the network drops. Queued order writes are replayed when connectivity returns. The server also exposes sync-event endpoints for a central deployment.

For true multi-location production deployment, host the Node service behind HTTPS and use a shared production database/queue. Do not expose a store SQLite file directly to the internet. Keep regular backups and set a strong `JWT_SECRET` and role PINs through environment variables.

## Inventory lifecycle

A normal stock-controlled order follows:

`Order → Authorized → Preparing → Recipe/BOM consumption → Ready → Payment → Closed`

Production records raw input, usable output, loss and yield. Recipes consume the resulting inventory according to the configured BOM. Wastage and purchasing create their own stock movements so the ledger remains traceable.

## CSV menu format

Exported CSV contains:

`type,id,product_id,name,category,sku,price,unit,active,description`

Use `type=product` for menu products and `type=variant` with the parent `product_id` for variants. Import is upsert-based, so stable IDs/SKUs can be used for repeat bulk updates.

## Security

Authorization is enforced on the server, not only by the UI. Customers can only see their own orders; waiters and riders are scoped to their assigned work; management APIs require admin/owner roles. Before public deployment, replace the default credentials and JWT secret.
