# ⚡ Allo Inventory — E-Commerce Reservation System

Welcome to **Allo Inventory**! This is a simple, high-performance web application designed to manage product inventory and secure item checkouts across multiple warehouses. 

It is built with a premium dark-themed design (inspired by Linear and Supabase dashboards) and features real-time e-commerce reservation checkout timers, fast page loading, and safety measures to prevent overselling.

---

## 🌟 Key Features

- **🛍️ Complete Product Catalog**: View products across multiple warehouses with dynamic stock levels and realistic, high-quality images.
- **⏱️ 10-Minute Cart Holds**: Holds items for users during checkout with a live, graphical countdown timer. If they don't buy in 10 minutes, the stock automatically returns to the warehouse.
- **🛡️ Concurrency Safety**: Uses atomic database transactions to make sure it is physically impossible to sell the same item to two people at the exact same time.
- **🚀 Ultra-Fast Caching**: Uses Upstash Redis to cache product lists (60s) and individual items (30s) so they load in milliseconds, and instantly clears the cache when stock changes!
- **🚥 API Protection**: Built-in Edge rate-limiting (up to 60 requests/minute) to stop bots and scrapers from overloading your API.
- **🔧 One-Click Setup Script**: Features a single command (`npm run setup`) that checks your Node version, tests database and Redis connections, sets up your tables, and seeds initial data.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Edge Middleware)
- **Database**: [Neon DB](https://neon.tech/) (Serverless PostgreSQL)
- **ORM**: [Prisma v7](https://www.prisma.io/) (using the modern, fast WASM Client)
- **Cache & Rate Limit**: [Upstash Redis](https://upstash.com/) (REST-based Serverless Redis)
- **Validation**: [Zod](https://zod.dev/) (Strict type safety)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)

---

## 📋 Prerequisites

Before you start, make sure you have:
1. **Node.js** installed (version `18.0.0` or higher)
2. **npm** installed (version `9.0.0` or higher)
3. A free account on **[Neon DB](https://neon.tech)** (for PostgreSQL)
4. A free account on **[Upstash](https://upstash.com)** (for Serverless Redis)

---

## 🚀 Easy Step-by-Step Credentials Guide

Follow these simple steps to get all the keys needed for your `.env` file.

### 1. How to get your Neon DB connection strings

Neon is a serverless database. It gives you two connection strings: **pooled** (for running the app) and **direct** (for migrations).

1. Sign up/log in at **[console.neon.tech/signup](https://console.neon.tech/signup)**.
2. Click **Create Project**, name it `allo-inventory`, and select the region closest to you.
3. You will arrive at the **Dashboard**. Locate the **Connection Details** box.
4. **Get your Pooled Connection String (`DATABASE_URL`)**:
   - Choose **Prisma** in the dropdown select box.
   - Keep **Connection Pooling** toggled **ON**.
   - Copy the connection URL string. It will look like this:
     ```text
     postgresql://neondb_owner:YOUR_PASSWORD@ep-winter-sun-aqul7vuc-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
     ```
5. **Get your Direct Connection String (`DIRECT_URL`)**:
   - Keep **Prisma** selected in the dropdown.
   - Toggle **Connection Pooling** **OFF**.
   - Copy this new connection URL string. It will look like this:
     ```text
     postgresql://neondb_owner:YOUR_PASSWORD@ep-winter-sun-aqul7vuc.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require
     ```

---

### 2. How to get your Upstash Redis REST URL & Token

Upstash Redis is a serverless Redis database that works beautifully over HTTP.

1. Sign up/log in at **[console.upstash.com](https://console.upstash.com)**.
2. Under the **Redis** tab, click **Create Database**.
3. Name your database (e.g., `allo-redis`), select **Redis**, choose the region closest to your Neon DB, and click **Create**.
4. Scroll down to the **REST API** section of your database dashboard.
5. Click the **.env** tab to view your credentials.
6. Copy the **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`** values:
   - *Example REST URL:* `https://holy-crawdad-135444.upstash.io`
   - *Example REST Token:* `gQAAAAAAAhEUAAIgcDI2YTAx...`

---

## 💻 Local Development Setup

Setting up your environment locally is fully automated! Just follow these steps:

### Step 1: Install Packages
Open your terminal inside the project directory and run:
```bash
npm install
```

### Step 2: Configure your `.env` File
Create a new file named `.env` in the root of your project directory (or copy `.env.example`):
```bash
cp .env.example .env
```
Open your newly created `.env` file and paste your credentials:
```env
# 1. Neon DB connection strings
DATABASE_URL="postgresql://neondb_owner:...&pgbouncer=true"
DIRECT_URL="postgresql://neondb_owner:..."

# 2. Upstash Redis credentials
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# 3. Security (Enter any random secret string)
CRON_SECRET="make-up-a-secure-random-alphanumeric-string"
```

### Step 3: Run the Auto-Setup Tool
We built a smart startup script that verifies everything is working, validates your schema, sets up the database tables, and seeds the database with initial products and images:
```bash
npm run setup
```

### Step 4: Start the Dev Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser! You will see the beautiful SaaS dashboard fully populated with premium e-commerce items and photos.

---

## ⚡ Vercel Deployment Guide

Deploying to Vercel is extremely easy!

### Step 1: Import into Vercel
1. Go to **[vercel.com/new](https://vercel.com/new)** and import your Git repository.
2. Under **Environment Variables**, add the exact same keys from your `.env` file:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `CRON_SECRET`
3. Click **Deploy**. Vercel will build the Next.js routes, compile static pages, and establish Serverless functions instantly.

### Step 2: Verify the Expiry Cron Job
Vercel reads the `vercel.json` file in our root and automatically registers a background cron job to release expired checkouts.
To confirm:
1. Go to your Vercel Project Dashboard.
2. Click **Settings** -> **Cron Jobs**.
3. You will see `/api/cron/expire-reservations` configured to trigger every **5 minutes**!
4. Ensure the `CRON_SECRET` is defined in Vercel to secure this endpoint from unauthorized requests.

---

## 🧠 Architecture Highlights

- **Edge Rate Limiting**: The `middleware.ts` runs at the network edge to block request floods, extracting client IPs from standard headers and returning an HTTP `429 Too Many Requests` when exhausted.
- **Cache Invalidation**: Reads are served instantly from Redis. Stock transactions (reserving, purchase, release, or cron expiry) trigger instant, automated Redis invalidations to keep item listings always accurate.
- **Fail-Open Local Development**: If Redis credentials are left blank in local `.env`, the system automatically fails-open gracefully, allowing you to develop offline without caching/limiting errors.
