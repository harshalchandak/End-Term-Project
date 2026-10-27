# Cartwise — MERN E-commerce Platform

Cartwise is a working full-stack online store built for the end-term project. It includes a React storefront, an Express REST API, MongoDB persistence, shopper and administrator roles, and a local demo mode.

## Run the application

The application is implemented as a React/Vite storefront and an Express/MongoDB API. The storefront runs in interactive browser demo mode without MongoDB; the API persists users, catalogue, carts, inventory, and orders when MongoDB is configured.

### Prerequisites

- Node.js 20 or newer and npm
- MongoDB 6+ for persistent API mode (local or managed)

### Install and start

```bash
npm install
npm run dev
```

Run the focused server-side checks with `npm test` and create the production client bundle with `npm run build`.

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The API runs at [http://127.0.0.1:4000](http://127.0.0.1:4000).

With no MongoDB configured, browse products, add to cart, apply `HELLO200`, check out, and manage demo orders/products in browser storage. Demo shopper: create any account from **Account**. Demo administrator: open **Store admin** and sign in as `admin@cartwise.shop` / `admin123`. These credentials are for local demo mode only and must not be used outside it.

To enable the persistent MERN API, copy `.env.example` to `server/.env`, set `MONGODB_URI` and a long random `JWT_SECRET`, then restart the server. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before the first launch to create an administrator account. The API seeds the sample catalogue when its products collection is empty. Never use the demo administrator password outside local demo mode.

For a local MongoDB install, create the data directory and start MongoDB first (for example, `mkdir -p .mongodb-data` followed by `mongod --dbpath ./.mongodb-data --bind_ip 127.0.0.1`). Set `MONGODB_URI=mongodb://127.0.0.1:27017/cartwise` in `server/.env`. Keep local database data and environment files out of version control.

Optional client API override: `VITE_API_URL` (defaults to `http://127.0.0.1:4000/api/v1`). For a deployed client, configure `CLIENT_ORIGIN` on the API to its exact origin.

### Included workflows

- Catalogue browsing, category filtering, text search, sorting, price range, product details, and quick add.
- Shopper registration/login, persistent cart API, checkout with server-side price and stock validation, and order history.
- Admin product creation/archive, stock setting and restocking, low-stock summary, order status progression, and sales summary.
- Interactive demo mode with local persistence when no API is available.

### API notes

The API is versioned under `/api/v1`; `GET /api/v1/health` reports database connectivity. Use the endpoints listed in the architecture section below. API authentication uses bearer JWTs; the frontend's demo account is browser-only. Sandbox payment is a payment-method placeholder, not a real payment processor. Before public deployment, provide an administrator through environment variables, set production secrets/origins, and connect a real payment provider only with verified callbacks.

### Current delivery status

- [x] React storefront and responsive product catalogue
- [x] Cart, coupon, checkout, confirmation, and order history
- [x] Admin catalogue/order workflows and summaries
- [x] Express REST API, MongoDB models, auth/roles, seed catalogue, guarded stock decrement
- [x] Demo mode and local persistence
- [x] Focused unit tests for checkout totals, delivery threshold, coupon handling, and valid order status transitions
- [ ] Production deployment, managed MongoDB configuration, and demo video

### Verification performed

- `npm test`: 5 passed, 0 failed.
- `npm run build`: production client bundle created successfully.
- `node --check server/src/index.js`: API syntax check passed.
- Local MongoDB workflow: shopper registration, persisted cart, order creation, and order history verified.
- Authorization check: admin summary is available to an administrator and returns `403` to a shopper.
- Inventory check: admin stock update affected the low-stock summary; the original quantity was restored.

### Demo walkthrough (3–5 minutes)

1. Introduce the everyday-goods store and browse the catalogue; show category filtering, search, sorting, and product details.
2. Add an item to the bag, apply `HELLO200`, and show the total recalculation.
3. Sign in as the sample shopper, place a Cash on Delivery order, then open order history to show the saved order.
4. Sign in as the administrator, show the sales/order/low-stock summary, restock or add a product, and advance an order status.
5. Briefly explain that the API validates prices and stock and checks roles before admin actions.

## Project at a Glance

| Item | Plan |
|---|---|
| Project name | Cartwise |
| Product | Responsive online store for curated everyday products |
| Target users | Shoppers who want to discover, compare, and purchase products; store administrators who manage the catalogue and orders |
| Application type | Full-stack web application |
| Primary stack | MongoDB, Express.js, React, Node.js (MERN) |
| Core roles | Shopper, administrator |

## Problem Statement

Small and growing retailers need an online store where customers can find products, make informed choices, and complete purchases. A catalogue-only site is not enough: shoppers need a reliable cart and checkout, while store operators need a clear way to manage stock and fulfil orders.

## Product Solution

Cartwise is a full-stack e-commerce application that connects product discovery to order fulfilment. It supports searchable product listings, persistent customer accounts and carts, validated checkout, order tracking, and a protected administration area for catalogue, inventory, and order management.

The project will prioritize a complete purchase lifecycle and reliable inventory updates over a long list of disconnected features.

## Users and Permissions

### Shopper

- Browse and search the product catalogue.
- Filter and sort products, then inspect product details and availability.
- Register, sign in, and manage a profile and saved addresses.
- Add products to a persistent cart and update quantities.
- Place an order, view confirmation, and review order history and status.

### Administrator

- Create, update, publish, and archive products.
- Set prices and stock quantities, and review low-stock items.
- View orders and advance them through fulfilment statuses.
- See basic sales and order summaries.

Authorization must be enforced by the API as well as reflected in the interface. A shopper must never be able to access administrative operations by changing a URL or request.

## Core Workflows

The first release will complete these four end-to-end workflows:

1. **Discover a product:** browse catalogue → search/filter/sort → open product → see price, description, images, and stock availability.
2. **Manage a cart:** add item → validate product and stock → persist cart → change quantity or remove item → show recalculated totals.
3. **Place and follow an order:** validate address and cart → recheck price and inventory on the server → create order and reserve/decrement stock atomically → show confirmation → view order history and status.
4. **Operate the store:** administrator signs in → edits catalogue and stock → reviews incoming orders → updates fulfilment status → shopper sees the latest status.

## Functional Scope

### Shopper experience

- Home page with featured and newly added products.
- Product listing with text search, category and price filters, sorting, and pagination.
- Product detail page with image gallery, description, price, stock state, and add-to-cart action.
- Account registration and login; profile and address management.
- Persistent cart for signed-in users. Guest cart may be held locally and merged on sign-in in a later iteration.
- Checkout with address selection, order review, and payment method selection.
- Order confirmation, order history, and order detail/status view.
- Clear loading, empty, validation, success, and error states.

### Store administration

- Role-protected admin dashboard.
- Product and category management, including image URL or storage reference, price, and inventory.
- Order queue with status transitions such as `Placed`, `Processing`, `Shipped`, `Delivered`, and `Cancelled`.
- Basic operational summary: order count, gross sales, and low-stock products.

### Payment scope

For the initial release, support **Cash on Delivery** and a clearly labelled **test/sandbox payment integration** if time permits. Do not collect or store raw card details. A real payment provider should be added only with server-side verification of its webhook/callback and idempotent order handling.

## Non-Functional Requirements

- Responsive layout for mobile, tablet, and desktop.
- Server-side validation for all important inputs and state transitions.
- Secure password hashing, protected sessions/tokens, and role-based authorization.
- Prices, discounts (if added), totals, and stock checks calculated or verified on the server.
- Order creation and inventory changes must avoid overselling under concurrent checkouts.
- Useful error messages that do not leak internal stack traces or secrets.
- Configuration through environment variables; no credentials committed to Git.
- Maintainable separation between UI, API routes, business logic, and data access.

## High-Level Architecture

```text
┌──────────────────────────────┐
│ React client                 │
│ Pages, components, routing,  │
│ form state, API client       │
└──────────────┬───────────────┘
               │ HTTPS / JSON REST API
┌──────────────▼───────────────┐
│ Node.js + Express API        │
│ Authentication, validation, │
│ authorization, workflows    │
└───────┬──────────┬───────────┘
        │          │
┌───────▼──────┐ ┌─▼──────────────────┐
│ MongoDB      │ │ External services   │
│ users,       │ │ optional payments,  │
│ products,    │ │ product image store │
│ carts, orders│ │                     │
└──────────────┘ └────────────────────┘
```

### Suggested repository layout

```text
cartwise/
├── client/                 # React application
│   └── src/
│       ├── app/             # Router, providers, app configuration
│       ├── components/      # Shared UI components
│       ├── features/        # Products, cart, account, checkout, orders, admin
│       ├── pages/
│       └── lib/             # API client and shared utilities
├── server/                 # Express application
│   └── src/
│       ├── config/          # Database and environment configuration
│       ├── middleware/      # Authentication, authorization, validation, errors
│       ├── modules/         # Routes, controllers, services, models by domain
│       └── app.js
├── docs/                   # Architecture notes and API examples
├── .env.example
└── README.md
```

## Data Model (MongoDB)

| Collection | Main fields | Notes |
|---|---|---|
| `users` | `name`, `email`, `passwordHash`, `role`, `addresses`, timestamps | Unique normalized email; role is `shopper` or `admin` |
| `products` | `name`, `slug`, `description`, `category`, `images`, `price`, `stock`, `isActive`, timestamps | Price stored as integer minor units (for example, paise) to avoid floating-point rounding |
| `carts` | `userId`, `items[{ productId, quantity }]`, timestamps | One active cart per shopper; prices are refreshed from products when totals are calculated |
| `orders` | `userId`, `items[{ productId, name, unitPrice, quantity }]`, `shippingAddress`, `subtotal`, `total`, `paymentMethod`, `paymentStatus`, `status`, timestamps | Item name and price are snapshots so order history remains accurate after catalogue edits |

Product stock is the source of truth. The checkout service must verify stock and product availability at order time. Where the deployment supports MongoDB transactions, order creation and stock updates should run in a transaction; otherwise use a guarded atomic stock update and compensating failure handling.

## API Outline

Base path: `/api/v1`

| Area | Example endpoints | Access |
|---|---|---|
| Authentication | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | Public or signed-in as appropriate |
| Products | `GET /products`, `GET /products/:slug`, `POST /products`, `PATCH /products/:id`, `DELETE /products/:id` | Read public; writes admin |
| Cart | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:productId`, `DELETE /cart/items/:productId` | Shopper |
| Orders | `POST /orders`, `GET /orders/mine`, `GET /orders/:id` | Shopper; owner check |
| Admin orders | `GET /admin/orders`, `PATCH /admin/orders/:id/status`, `GET /admin/summary` | Admin |

List endpoints should support bounded pagination and validated query parameters. API responses should use consistent error shapes and appropriate HTTP status codes.

## Technology Choices

- **MongoDB + Mongoose:** document storage for products, accounts, carts, and order snapshots.
- **Express.js + Node.js:** REST API and server-side workflow logic.
- **React:** component-based storefront and admin interface.
- **React Router:** client-side navigation and route guards for usability; API authorization remains authoritative.
- **State management:** React Context or Redux Toolkit for shared session/cart state, selected based on implementation complexity.
- **Validation:** schema validation on both client and server; server validation is authoritative.
- **Authentication:** secure HTTP-only cookie session or short-lived access token with a secure refresh strategy. Select one approach and document it before implementation.
- **Testing:** focused unit and integration checks for checkout, authorization, inventory, and order status transitions.
- **Deployment:** deploy client and API to an accessible web host and use a managed MongoDB deployment; configure secrets through the host's environment settings.

## Security and Reliability

- Hash passwords with a modern password hashing algorithm; never store or log plaintext passwords.
- Use HTTPS in production, secure HTTP-only cookies when cookie authentication is selected, and CSRF protection where applicable.
- Apply least-privilege role checks on every admin API route and ownership checks on user order routes.
- Validate and normalize input; allowlist sort fields and cap page sizes.
- Rate-limit authentication endpoints and use generic login failure messages.
- Add secure headers, appropriate CORS rules, and request body size limits.
- Keep secrets in environment variables and commit only `.env.example` with placeholder values.
- Recalculate totals and verify stock on the server; never trust client-submitted prices or roles.
- Make payment callbacks and order status updates idempotent where external payment is added.
- Log operational errors without exposing tokens, passwords, payment data, or unnecessary personal data.

## UX and Failure States

The interface should tell the user what happened and what to do next. Cover at least:

- Empty catalogue/search results and an empty cart.
- Invalid form input, duplicate registration, and expired/invalid session.
- Product removed or price/stock changed while the cart was open.
- Insufficient stock during checkout, with a clear route back to update the cart.
- Failed order creation or payment, without displaying a false success state.
- Missing product/order pages and forbidden admin access.
- Loading indicators for catalogue, cart, checkout, and order status updates.

## Delivery Plan

1. **Define and scaffold:** confirm product categories and visual direction; create client/server structure, environment example, database connection, and shared error conventions.
2. **Catalogue and accounts:** implement product browsing/search/filtering, registration/login, password handling, and role checks.
3. **Cart and checkout:** persist carts, validate stock and totals, implement order creation, and add inventory-safe checkout behavior.
4. **Orders and administration:** implement order history/status and admin product, stock, and order workflows.
5. **Polish and ship:** handle edge states, accessibility and responsive layout; add focused checks; deploy; write setup/API documentation; record a 3–5 minute demo.

## Completion Criteria

- A shopper can find a product, add it to a cart, complete a valid order, and later see that order and its current status.
- Invalid or stale cart data cannot create an order at an incorrect price or beyond available stock.
- An administrator can manage products, stock, and order status; a shopper cannot call those operations.
- Core workflows provide understandable loading, success, empty, and failure feedback.
- Data persists in MongoDB across sessions and deployments.
- The deployed application and source repository are accessible to evaluators.
- Documentation covers purpose, users, features, stack, architecture, setup, environment variables, and deployment.
- Git history records development in meaningful steps; the demo shows the actual product workflows.

## README and Submission Checklist

Before final submission, add the actual values below and verify public access:

- [ ] GitHub repository URL
- [ ] Deployed application URL
- [ ] Demo video URL (recommended 3–5 minutes)
- [ ] Final setup steps and required environment variables
- [ ] Screenshots or a short walkthrough, if useful
- [ ] No secrets in source control or public deployment logs
- [ ] Evaluator can complete the main workflows using documented access
- [ ] Complete the official submission form listed in `END_TERM_PROJECT_GUIDELINES (1).md` before its stated deadline

## Open Decisions Before Implementation

- Which product category and brand identity will make the catalogue coherent?
- Which deployment platform and managed MongoDB provider will be used?
- Will the first release use Cash on Delivery only, or include a payment sandbox?
- Will product images use seeded external URLs initially or a managed image storage service?
