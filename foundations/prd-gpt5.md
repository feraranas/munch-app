Product Requirement Document (PRD)

Product Name: (TBD – e.g., “SplitBill QR”)
Version: 0.1 Draft
Owner: [You]

**1. Problem Statement**

In restaurants, splitting the bill among multiple customers is often slow and error-prone. Customers must manually check the paper receipt, identify their items, and calculate their share. This leads to confusion, delays, and sometimes mistakes. Waitstaff also spend extra time clarifying and collecting individual payments, which reduces table turnover efficiency.

There is no seamless way today to connect the restaurant’s POS system with a customer-facing mobile interface to streamline splitting and payment.

**2. Objectives & Goals**

- Allow customers to view the live receipt on their phones via QR.
- Enable individual selection of dishes to calculate each person’s share.
- Prevent duplicate payment through real-time synchronization (row locking).
- Support individual payments (multiple methods).
- Notify waitress automatically when the bill is fully paid.
- Reset the QR/check session for reuse after payment.

**3. Users & Roles**

- Customer (Diner): Scans QR, views check, selects items, pays their share.
- Waitress (Staff): Enters order into POS, monitors payment status, receives notifications.
- Restaurant Admin (future role): Manages POS integration, tracks reports.

**4. Scope**

*In-Scope (MVP):*

- QR generation and reuse per order/check.
- Live receipt syncing from POS → customer phones.
- Real-time dish selection with locking mechanism.
- Individual payment handling (via connected bank account or card).
- Push notification to waitress once full bill is paid.
- Order record storage (unique ID, date, order details, waitress ID).

*Out-of-Scope (for MVP):*

- Menu browsing/ordering (already handled by waitress & POS).
- Loyalty points or customer accounts.
- Split tips across diners automatically (initially manual entry).
- Offline mode (requires connectivity).

**5. Use Cases / User Stories**

*1. View Receipt:*

- As a customer, I want to scan the QR and see the live check so I know the total and items ordered.

*2. Claim Items:*

- As a customer, I want to select the dishes I ordered so the system can calculate my share.

*3. Prevent Duplicate Payment:*
- As a customer, I want the items I selected to lock for others, so no one else pays for them by mistake.

*4. Add Tip:*
- As a customer, I want to add a tip to my payment so I can complete my share fairly.

*5. Make Payment:*
- As a customer, I want to pay via card/bank account directly from the app.

*6. Confirm Payment Status:*
- As a waitress, I want to be notified when the bill is fully paid so I can close the order.

*7. Reset QR:*
- As the system, I want to reset the QR after full payment so it can be reused for the next group.

**6. Functional Requirements**

*POS Integration:*

- System must pull order details (dishes, qty, price) when waitress enters them.

*QR Check Session:*

- Each check generates a unique QR code tied to a session ID.
- QR session resets after bill is fully paid.*

*Real-Time Updates:*

- When a customer selects an item, it must lock for others in real-time.
- When a payment is made, the remaining balance updates for all customers.

*Payment Flow:*

- Customer can choose amount (items + tip).
- Payment gateway integration to process payments.
- Partial payments allowed until total is covered.

*Notifications:*

- Waitress gets a push notification once full payment is confirmed.

*Order Storage:*

- Save each order with metadata (ID, date, items, waitress ID, payment status).

**7. Non-Functional Requirements**

- *Security*: Payment data must be encrypted (PCI DSS compliance).
- *Performance*: Updates (locks/payments) must reflect for all customers in <1 second.
- *Scalability*: Support tables of up to 20+ customers viewing the check concurrently.
- *Reliability*: Must handle dropped connections gracefully (rejoin QR session).
- *Usability*: QR scan → open browser/app instantly, no account creation required for MVP

**8. Success Metrics**

- Average time to close a bill reduced by X%.
- Percentage of customers successfully using QR check-out.
- Error rate of duplicate/incorrect payments = 0%.
- Customer satisfaction (post-checkout survey).
- Increased table turnover efficiency.

**Path to MVP - 10 iterations**

*Iteration 1 – Foundation*

- Set up project repo, CI/CD, basic app skeleton (web/mobile).
- Implement QR code generation (static, hardcoded order ID).
- Simple landing page when scanning QR.

*Iteration 2 – Basic Check Rendering*

- POS mock API: serve dummy order (JSON with items, qty, prices).
- Display check in customer’s browser after scanning QR.
- Store order ID + items in DB.
- Develop the frontend with Mobile First principles.

*Iteration 3 – Real-Time Session*

- Introduce WebSocket or pub/sub for live sessions.
- Show number of active viewers on check screen.
- If a new item is added in POS mock, auto-refresh on phones.

*Iteration 4 – Item Claiming (Locking)*

- Customers can tap/select an item they ordered.
- Item becomes visually locked/disabled for others.
- Basic concurrency handling: first-come-first-serve lock.

*Iteration 5 – Share Calculation*

- Running subtotal calculation for each customer’s selection.
- Show “My Total” vs “Remaining Balance.”
- Reset lock if a customer unselects item.

*Iteration 6 – Tip Handling*

- Add tip input field on customer total.
- Show updated total including tip.
- Sync with live session (others see remaining balance update).

*Iteration 7 – Payment Integration (Sandbox)*

- Integrate with test payment gateway (e.g., Stripe test env).
- Process single-user payment and confirm in DB.
- Update UI with “Paid” vs “Remaining Balance.”

*Iteration 8 – Multi-Payer Flow*

- Allow multiple partial payments until check = fully covered.
- Lock invoice row after payment processed.
- Display progress bar: % of bill paid.

*Iteration 9 – Staff Notification*

- Push notification or waitress dashboard to show:
- Order status (open, partially paid, paid in full).
- Timestamp of final payment.
- Staff can mark check as “closed.”

*Iteration 10 – Production Hardening (MVP Ready)*

- Reset QR session automatically after full payment.
- Add waitress ID + metadata to order history.
- Security pass: HTTPS, token-based session validation.
- Deploy MVP pilot in real restaurant with live POS feed.

**Iteration-to-Role Mapping** (Let’s map the 10 MVP iterations to SDLC roles (Frontend, Backend, DevOps, QA). This will help you plan resourcing and responsibility handoff.)

*Iteration 1 – Foundation*

- Frontend: Setup base web app (React/Next.js or similar).
- Backend: Scaffold API service (Node/Go/Python).
- DevOps: CI/CD pipelines, staging environment, DB setup.
- QA: Smoke tests (deployment works, app loads).

*Iteration 2 – Basic Check Rendering*

- Frontend: Display dummy receipt from API.
- Backend: POS mock API, store order in DB.
- DevOps: Seed DB migrations, enable hot-reload deployments.
- QA: Verify order fetch/display, check DB persistence.

*Iteration 3 – Real-Time Session*

- Frontend: WebSocket subscription to live session. Show active viewers.
- Backend: Implement pub/sub channels for sessions.
- DevOps: Add message broker (Redis, Kafka, or socket.io scaling).
- QA: Validate multiple browsers see updates instantly.

*Iteration 4 – Item Claiming (Locking)*

- Frontend: Item selection/lock UI.
- Backend: Locking mechanism (optimistic or DB row lock).
- DevOps: Monitor concurrency performance (load test with 10–20 users).
- QA: Test race conditions (two users select same dish at same time).

*Iteration 5 – Share Calculation*

- Frontend: Running total, remaining balance UI.
- Backend: Calculation logic (per-user, per-session).
- DevOps: Metrics/logging for calculation flow.
- QA: Validate edge cases (0 items, unselect all).

*Iteration 6 – Tip Handling*

- Frontend: Tip input + live updated total.
- Backend: Add tip field to per-user session.
- DevOps: Update schema (migration for tip handling).
- QA: Verify tip syncs correctly across multiple devices.

*Iteration 7 – Payment Integration (Sandbox)*

- Frontend: Payment UI with gateway redirect.
- Backend: Integrate payment SDK (Stripe/Adyen).
- DevOps: Secure secrets in vault, enable webhook callbacks.
- QA: End-to-end flow (simulate payments in sandbox).

*Iteration 8 – Multi-Payer Flow*

- Frontend: Show partial payments & progress bar.
- Backend: Split bill tracking, lock rows post-payment.
- DevOps: Payment reconciliation job (cron, retries).
- QA: Test 3–5 simultaneous payers; verify no double-pay.

*Iteration 9 – Staff Notification*

- Frontend: Waitress dashboard or push notification screen.
- Backend: Order status endpoint + push service.
- DevOps: Push infra (Firebase APNs/FCM or Web Push).
- QA: Validate notifications trigger only on full payment.

*Iteration 10 – Production Hardening*

- Frontend: Reset QR UX (new session ID).
- Backend: Persist metadata (order ID, date, waitress ID).
- DevOps: SSL, security hardening, monitoring (Prometheus/Grafana).
- QA: End-to-end regression, load test, pilot deployment feedback.





