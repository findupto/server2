# Hardware/provider adapters

The POS now exposes stable adapter contracts for hardware and payment providers. Real terminal, printer, drawer, barcode and customer-display drivers must be supplied by deployment-specific integrations; the core POS never fakes a successful payment or device action.

Recommended contract names:
- `payment.authorize(request)` / `payment.capture(request)` / `payment.refund(request)`
- `printer.printReceipt(payload)` / `printer.printKitchen(payload)`
- `cashDrawer.open(reason)`
- `barcode.scan()`
- `customerDisplay.show(payload)`

Provider credentials belong in deployment secrets, never in source control.