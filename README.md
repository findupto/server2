# MK Pizza & Ice Bar POS

Premium offline-first restaurant POS/control center for **MK Pizza & Ice Bar**, Abbas Chowk, Collage Road, Bhakkar.

## Current release — 2.4.0

- Role-based customer, waiter, rider, kitchen, cashier, admin and owner displays.
- Menu/product CRUD, variants, deals, customers and takeaway/dine-in/delivery/online orders.
- Inventory, recipes/BOM, purchases, suppliers, production, wastage, expenses, approvals, analytics, audit and sync APIs.
- SQLite WAL persistence, PWA shell and Electron Windows desktop shell.
- Customer profiles/history/tracking, addresses, favorites, loyalty storage, notifications, WebSocket events, Android FCM support and rider GPS.
- Universal AI POS Agent with natural-language correction, multi-turn context, role-aware execution, browser voice and camera/vision.
- Enterprise multilingual AI: auto detection and response preferences for English, Urdu, Punjabi, Saraiki, Roman variants and mixed-language commands, with model-dependent support for additional languages.
- Enterprise AI intelligence APIs for sales forecasting, procurement/reorder recommendations, menu margin intelligence, anomaly signals, operational reports and health/food-safety/waste insights.
- Enterprise operations APIs for reservations, product modifiers, delivery zones and branch registry.
- Enterprise backup service for SQLite backup creation, SHA-256 verification and integrity-checked restore staging; live replacement remains a controlled maintenance operation.
- Enterprise health, event, evaluation and metrics foundations.
- CI syntax/smoke-test pipeline on pushes and pull requests.

## AI behavior

The AI layer is designed to understand meaning rather than exact keywords. It can normalize spelling errors, missing words, speech-to-text mistakes, accents, slang, shorthand, numbers written as words, Roman Urdu/Punjabi/Saraiki, code-switching and longer multi-step requests. Consequential ambiguity is surfaced for clarification/confirmation instead of silently guessing. POS facts are taken from live database context rather than invented.

Language support is not a claim that every human language or dialect will work perfectly: quality depends on the configured model, audio transcription, script and input quality. The enterprise layer gives first-class handling to English, Urdu, Punjabi and Saraiki and gracefully allows other model-supported languages.

## Enterprise AI endpoints

- `/api/ai/premium` — natural-language understanding and safe POS execution.
- `/api/ai/language` — language detection, correction, Romanization and translation.
- `/api/ai/forecast` — moving-average demand/revenue guidance.
- `/api/ai/procurement` — recipe-aware replenishment recommendations.
- `/api/ai/menu-intelligence` — estimated recipe cost and menu margin analysis.
- `/api/ai/anomalies` — refund, discount and wastage anomaly signals.
- `/api/ai/report` — recorded-data operational reports.
- `/api/ai/insights` — consolidated operational intelligence.
- `/api/health/intelligence` and `/api/health/ai-insights` — conservative food/health/waste intelligence.

AI recommendations are advisory unless an existing server-side action is explicitly executed and authorized. Nutrition and food-safety outputs are operational guidance, not medical diagnosis or legal compliance certification.

## Enterprise POS endpoints

- Reservations: `/api/enterprise/reservations`
- Product modifiers: `/api/enterprise/modifiers`
- Delivery zones: `/api/enterprise/delivery-zones`
- Branch registry: `/api/enterprise/branches`
- SQLite backups: `/api/enterprise/backups`

Payment terminals, receipt/KDS printers, cash drawers, barcode scanners and customer displays use deployment-specific hardware/provider integrations. The core POS must never pretend a real device or payment succeeded when no provider confirmed it.

## Security and reliability

Production values must be configured through deployment secrets: `OPENAI_API_KEY`, a strong `JWT_SECRET`, replaced `OWNER_PIN`/`ADMIN_PIN`, `DB_PATH`, and optional FCM credentials. Backups can be created and integrity checked through the enterprise backup service. Restore is deliberately staged rather than an API-level live database replacement.

The CI workflow runs `npm install` and `npm test`; the smoke suite verifies JavaScript syntax for the core and enterprise modules. This repository does not contain a lockfile, so CI intentionally uses `npm install`.

For multi-location/high-concurrency production, use a managed shared database and queue instead of exposing or replicating a SQLite file. For public rollout, still perform real device, payment, printer, concurrency, disaster-recovery and security tests against the actual deployment and hardware.
