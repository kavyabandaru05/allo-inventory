# ⚡ Allo Inventory — High-Performance E-Commerce Reservation System

Allo Inventory is a production-grade, serverless-first full-stack inventory reservation system designed for multi-warehouse e-commerce operations. Built on a premium, minimal SaaS aesthetic inspired by linear and Supabase dashboards, it provides atomic stock allocation, two-phase reservation checkouts, serverless database pooling, and intelligent edge caching.

---

## ✨ Features

- **🛍️ Complete Product Catalog**: Displays products across multiple warehouses with dynamic stock levels.
- **⏱️ Two-Phase Checkout Flow**: Holds inventory in a `PENDING` state for a strict 10-minute window with a live graphical countdown timer, automatic polling updates, and one-click confirm/release actions.
- **🛡️ Atomic Stock Control**: Utilizes Prisma database transactions to guarantee double-book prevention even under high concurrency.
- **🚀 Advanced Edge Caching**: Incorporates serverless Upstash Redis to cache product lists (60s) and individual items (30s) with micro-second read latency, automatically invalidated on inventory transactions.
- **🚥 Intelligent Rate Limiting**: Implements sliding-window rate limiters enforced at the Edge middleware (60 req/min for general API, 10 req/min for checkouts) to guard against bot exhaustion.
- **🔧 Self-Healing Startup Script**: Features a pre-flight CLI setup tool (`npm run setup`) that checks Node, tests database and cache connections, synchronizes schemas, and automatically seeds data.
- **📦 Fully Vercel Ready**: Preconfigured with background serverless Cron jobs and optimized for edge rendering.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions, Edge Middleware)
- **Database**: [Neon DB](https://neon.tech/) (Serverless PostgreSQL with connection pooling)
- **ORM**: [Prisma v7](https://www.prisma.io/) (utilizing Native WASM driver adapters for fast cold starts)
- **Cache & Limits**: [Upstash Redis](https://upstash.com/) (REST-based, Edge-native Redis)
- **Validation**: [Zod](https://zod.dev/) (Strict type-safe runtime validations)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + CSS Custom Variables (Harmonious dark-mode UI tokens)

---

## 📋 Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- Free accounts on **[Neon DB](https://neon.tech)** and **[Upstash](https://upstash.com)**

---

## 🚀 Step-by-Step Credentials & Platform Setup

### 1. Database Configuration (Neon DB)

Neon provides a fully managed serverless PostgreSQL database that scales to zero.

1. Navigate to **[console.neon.tech/signup](https://console.neon.tech/signup)** and register a free account.
2. Click **Create Project**. Name your project (e.g., `allo-inventory`), select your database engine version (PostgreSQL 16+ is recommended), and choose the AWS region closest to your planned Vercel serverless deployment.
3. Once created, you will be redirected to the **Dashboard**. Look at the **Connection Details** card.
4. **Get your Pooled Connection String (`DATABASE_URL`)**:
   - Ensure the database is selected (usually `neondb`).
   - Choose **Prisma** from the dropdown menu (which formats the connection URL nicely).
   - Keep **Connection Pooling** toggled **ON**. 
   - Copy the string. It will look like:
     `postgresql://[user]:[password]@[project-id]-pooler.[region].aws.neon.tech/neondb?sslmode=require&pgbouncer=true`
5. **Get your Direct Connection String (`DIRECT_URL`)**:
   - Toggle **Connection Pooling** **OFF**.
   - Copy this string. It is used directly by Prisma for running migrations and schema syncing. It will look like:
     `postgresql://[user]:[password]@[project-id].[region].aws.neon.tech/neondb?sslmode=require`

---

### 2. Cache & Rate Limiting Configuration (Upstash Redis)

Upstash offers serverless, HTTP-based Redis databases that run natively at the Edge.

1. Navigate to **[console.upstash.com](https://console.upstash.com)** and sign in.
2. Click **Create Database**.
3. Name your database (e.g., `allo-redis`), select **Redis**, and pick the region closest to your database and hosting server.
4. Keep the default selections (SSL enabled) and click **Create**.
5. Once your database is provisioned, scroll down to the **REST API** section of the dashboard details.
6. Click on the **.env** tab to view your credentials.
7. Copy the **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`** values.
   - *Example REST URL:* `https://[db-name].upstash.io`
   - *Example REST Token:* `AXa...`

---

## 💻 Local Development Setup

Follow these steps to run the application locally:

### 1. Clone & Install Dependencies
```bash
# Install packages
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```
Open `.env` and fill in the Neon DB connections, Upstash Redis keys, and add a custom `CRON_SECRET` string:
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
CRON_SECRET="super-secret-random-alphanumeric-string"
```

### 3. Run Self-Healing Setup Script
Run our custom start validation tool. This automatically tests connections, checks variables, validates schemas, pushes structures, and populates seed data:
```bash
npm run setup
```

### 4. Start the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to experience the dashboard.

---

## ⚡ Vercel Deployment Guide

Deploying to Vercel is seamless and leverages Edge routing out-of-the-box.

### 1. Import Repository
1. Push your local codebase to a GitHub, GitLab, or Bitbucket repository.
2. Go to **[vercel.com/new](https://vercel.com/new)** and import your repository.

### 2. Add Environment Variables
Configure the exact environment variables matching your `.env` file under the **Environment Variables** section during configuration:
- `DATABASE_URL`
- `DIRECT_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `CRON_SECRET`

### 3. Deploy
Click **Deploy**. Vercel will build the Next.js routes, compile static pages, and establish Serverless functions.

### 4. Background Expiry Cron Configuration
Vercel will read the `vercel.json` file in our root and automatically register a cron job calling the `/api/cron/expire-reservations` route.
To verify:
1. Go to your Vercel Project Dashboard.
2. Click the **Settings** tab and navigate to **Cron Jobs**.
3. You will see `/api/cron/expire-reservations` configured to trigger every **5 minutes**.
4. To secure this route, configure the `CRON_SECRET` on Vercel. The cron header will pass `Authorization: Bearer <CRON_SECRET>` automatically.

---

## 🧱 Architecture Details

### Caching Strategy
- **Products Catalog**: The product listing route `/api/products` is cached with a **60-second TTL** under Redis key `allo:products:all`.
- **Product Detail**: Individual product detail route `/api/products/[id]` is cached with a **30-second TTL** under key `allo:products:item:[id]`.
- **Database-Driven Invalidation**: Any stock modification (creating a new product, reserving stock, confirming purchase, releasing hold, or cron-expiring reservations) will instantly issue a Redis deletion pattern to dump stale cache keys, guaranteeing customers never see stale inventory states.

### Concurrency Protection
Reservations undergo an atomic check-and-hold process using strict **Prisma PostgreSQL Transactions** (`prisma.$transaction`). Stock is checked, hold status verified, and reserved quantities decremented in a single, block-level isolated transaction. Double-bookings are mathematically impossible.
