# MK Pizza & Ice Bar POS

Premium offline-first restaurant POS/control center for **MK Pizza & Ice Bar**, Abbas Chowk, Collage Road, Bhakkar.

## Current release

- Role-based customer, waiter, rider, kitchen, cashier, admin and owner displays.
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
- **AI Voice Copilot** for natural-language product creation, controlled price updates, voice-to-cart sales, order lookup, cash/change calculation and receipt printing.
- **AI Security Monitor** for suspicious operational conditions, safe automatic corrections and audit logging.

## AI Voice Copilot

The AI understands commands such as:

- `Add Chicken Fajita Pizza: Small 550, Medium 1050, Large 1350, XL 1950.`
- `Make a new sale: 1 Large Pizza, 2 Special Shawarma, 4 Zinger Burger Special, 5 Hotwings.`
- `Collect cash for order 104, customer gives 2000.`

Voice sales are converted into the existing POS cart so the operator can review and place the order. Product creation and management price changes are executed server-side with role checks, audit records and protection against large unexpected price jumps. Low-confidence AI interpretations are not executed automatically.

Cash handling is software-assisted: the AI identifies an order by order number/QR/token or customer information, calculates the exact change, asks for confirmation, marks the order paid and opens a printable receipt. A physical cash drawer still requires supported hardware integration; the AI never claims to physically receive or return banknotes.

## AI security

Management can run an AI security scan to detect low-risk operational anomalies such as negative prices, duplicate SKUs and stuck kitchen orders. Safe negative prices are corrected to zero and every automatic correction is audited. Higher-risk changes remain blocked until explicitly confirmed.

## Privacy

Login screens no longer display example usernames, passwords or PINs. Credential hints are hidden from the visible POS UI and public documentation. Configure real credentials through environment variables such as `OWNER_PIN`, `ADMIN_PIN` and `JWT_SECRET` before production deployment.

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

## AI environment

Set `OPENAI_API_KEY` on the POS/server machine. Optional model overrides:

- `OPENAI_COMMAND_MODEL` for voice/transaction interpretation.
- `OPENAI_VISION_MODEL` for menu-image AI.
- `JWT_SECRET`, `OWNER_PIN` and `ADMIN_PIN` for production authentication.

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

Authorization is enforced on the server, not only by the UI. Customers can only see their own orders; waiters and riders are scoped to their assigned work; management APIs require admin/owner roles. Production credentials must be supplied through environment variables and must never be committed to source control.
