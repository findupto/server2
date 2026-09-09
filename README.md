# MK Pizza & Ice Bar POS

Premium offline-first restaurant POS/control center for **MK Pizza & Ice Bar**, Abbas Chowk, Collage Road, Bhakkar.

## Current release

- Role-based customer, waiter, rider, kitchen, cashier, admin and owner displays.
- Menu/product CRUD with categories, SKU, unit, price, description and activation/deactivation.
- Bulk CSV import/export for products and variants.
- Product variants such as Small/Medium/Large/XL with variant-specific prices and SKUs.
- Deals/combos, customers, takeaway/dine-in/delivery/online orders, kitchen authorization and queue, cashier payment/closing, rider workflow.
- 20-table status map, inventory, recipes/BOM, purchases, suppliers, production, wastage, expenses, approvals, analytics, audit and sync APIs.
- SQLite WAL persistence, PWA shell and Electron Windows desktop shell.
- Universal AI POS Agent: natural chat, continuous browser voice, camera/vision inspection, multi-step instructions and role-aware execution across products, prices, sales, tables, orders, kitchen, riders, customers, inventory, expenses and staff messaging.
- AI Security Monitor for suspicious operational conditions and safe automatic corrections.
- Voice Table Ordering for customer self-order scenarios.

## Production customer/staff layer

The project now includes an additive `production-upgrades.js` layer for the parts that were missing from a production-grade customer/staff experience:

- Customer account/profile API with editable name, phone, address and notes.
- Complete customer order history with order items and lifecycle timeline.
- Per-order tracking endpoint with the latest rider location.
- Saved customer delivery addresses and favorites.
- Loyalty account/ledger storage ready for points automation.
- Notification inbox for every user/customer with read/unread state.
- Android push-token registration and Firebase Cloud Messaging HTTP v1 delivery when FCM credentials are configured.
- WebSocket `/ws` event channel plus notification polling fallback.
- Rider live GPS location capture tied to an active delivery.
- Staff task system for waiter, kitchen, cashier and rider operational work.
- Automatic order lifecycle event capture using SQLite triggers, so legacy order routes also produce tracking history.
- Production health endpoint at `/api/v2/health`.

## How the customer works

1. Customer installs the Android/PWA app and creates a customer account.
2. The account remains the same across supported devices when connected to the same production server.
3. The customer sees the menu, variants, deals and cart, then submits takeaway, dine-in, delivery or online orders.
4. Every order is attached to the customer account, so the customer can retrieve history, items, status timeline and delivery location.
5. Status changes generate in-app notifications and, when Firebase is configured, Android push notifications.
6. Saved addresses, favorites and loyalty points are available through the production customer APIs.

## Staff workflows

### Waiter

- Create/handle dine-in orders and table service.
- See orders assigned to the waiter.
- Authorize pending orders.
- Receive workflow notifications for new orders and staff tasks.

### Kitchen

- See the kitchen queue and timeline.
- Move authorized orders to preparing and then ready.
- Receive automatic notifications when an order is authorized.
- Use AI commands for stock checks, order lookups and operational instructions, subject to server-side role permissions.

### Rider

- See assigned delivery orders.
- Dispatch a ready order, move it to out-for-delivery and mark it delivered.
- Start live GPS sharing from the delivery screen.
- Customer tracking can use the latest rider location.
- Receive delivery workflow notifications.

### Cashier

- See ready/delivered orders awaiting payment.
- Record payment method and close paid orders.
- Receive payment-ready workflow notifications.

### Admin / Owner

- Full management, inventory, staff, analytics, expenses, approvals and audit access.
- Create staff tasks and inspect operational history.
- Use AI for multi-step POS commands while server-side permissions and audit controls remain authoritative.

## Notification model

Order lifecycle events are automatically captured:

`pending → authorized → preparing → ready → out_for_delivery → delivered → closed`

The notification layer can notify the correct audience at each step. Notifications are persisted in SQLite, displayed in the app inbox, synchronized over WebSocket when available, and can be delivered through FCM to Android devices when production credentials are configured.

## AI automation

The AI command center accepts complete instructions rather than requiring one command at a time. It can understand quantities, variants, tables, order references, staff roles and multi-step sequences, then execute approved actions through the server with role checks and audit logging.

Examples:

- `Create Chicken Fajita Pizza with Small 550, Medium 1050, Large 1350 and XL 1950.`
- `Make sale: 1 Large Pizza, 2 Special Shawarma, 4 Zinger Burger Special and 5 Hotwings. Table 7. Send it to kitchen.`
- `Show the latest orders for customer Ali, assign the delivery to Rider Ahmed and tell the rider the order is ready.`
- `Check inventory for cheese and tell kitchen if stock is low.`

Voice mode supports continuous browser recognition and spoken responses. The existing AI layer also supports camera/vision inspection. Ambiguous or low-confidence actions can require confirmation; server-side permissions remain authoritative.

## Production environment

Required/important values:

- `OPENAI_API_KEY` for AI features.
- `JWT_SECRET` — use a long random production secret; never keep the development fallback.
- `OWNER_PIN` and `ADMIN_PIN` — replace development credentials before deployment.
- `DB_PATH` — point to the production SQLite file when SQLite is used.
- `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` — optional Firebase Cloud Messaging credentials for Android push delivery.

For multi-location/high-concurrency production, move the shared operational database and job/event queue to a managed server database/queue rather than exposing a SQLite file directly. Keep HTTPS enabled and maintain automated backups and restore tests.

## Android build

The project uses Capacitor. After installing dependencies, run the Android sync/build flow so the Capacitor push-notifications plugin is included in the Play Store build.

## Remaining hardening before public rollout

- Configure Firebase/FCM production credentials and verify push delivery on real Android devices.
- Configure HTTPS, backups and restore drills.
- Run automated API/UI tests and concurrency tests against the production deployment.
- Replace all development PINs/secrets.
- Add payment-terminal, printer and cash-drawer integrations for the exact hardware used by the restaurant.
- For true multi-location operation, use a shared production database and queue rather than local SQLite replication.
