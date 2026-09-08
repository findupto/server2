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
- **Universal AI POS Agent**: natural chat, continuous browser voice, camera/vision inspection, multi-step instructions and role-aware execution across products, prices, sales, tables, orders, kitchen, riders, customers, inventory, expenses and staff messaging.
- **AI Security Monitor** for suspicious operational conditions and safe automatic corrections.
- **Voice Table Ordering** for customer self-order scenarios.

## Ultimate AI

The AI command center accepts complete instructions rather than requiring one command at a time. It can understand quantities, variants, tables, order references, staff roles and multi-step sequences, then execute approved actions through the server with role checks and audit logging.

Examples:

- `Create Chicken Fajita Pizza with Small 550, Medium 1050, Large 1350 and XL 1950.`
- `Make sale: 1 Large Pizza, 2 Special Shawarma, 4 Zinger Burger Special and 5 Hotwings. Table 7. Send it to kitchen.`
- `Show the latest orders for customer Ali, assign the delivery to Rider Ahmed and tell the rider the order is ready.`
- `Check inventory for cheese and tell kitchen if stock is low.`

Voice mode supports continuous recognition with natural spoken responses. Camera mode sends an on-screen POS scene to the vision model for operational inspection. Low-confidence or ambiguous actions are stopped for confirmation; server-side permissions remain authoritative.

The default AI reasoning and vision model is **GPT-5.6 Sol**, with environment-variable overrides. A dedicated realtime speech model is reserved for the next native realtime/WebRTC voice layer.

## AI environment

Set `OPENAI_API_KEY` on the POS/server machine. Optional overrides:

- `OPENAI_COMMAND_MODEL` — defaults to `gpt-5.6-sol`.
- `OPENAI_VISION_MODEL` — defaults to `gpt-5.6-sol`.
- `OPENAI_REALTIME_MODEL` — reserved for realtime voice integration.
- `JWT_SECRET`, `OWNER_PIN` and `ADMIN_PIN` for production authentication.

## Remaining production upgrades

The core POS and AI control layer are substantially implemented. The major remaining production-grade items are: native OpenAI Realtime/WebRTC speech-to-speech instead of browser SpeechRecognition, anonymous QR/NFC guest table sessions, direct kitchen auto-dispatch for confirmed guest voice orders, payment-terminal/cash-drawer/printer hardware integrations, continuous camera monitoring, stronger transaction concurrency/idempotency, automated backups/restore, automated tests and CI, HTTPS deployment, and removal of development fallback credentials/secrets.

For production deployment, use HTTPS, a strong `JWT_SECRET`, real environment credentials, regular backups and a shared production database/queue for multi-location operation. Never expose the SQLite file directly to the internet.
