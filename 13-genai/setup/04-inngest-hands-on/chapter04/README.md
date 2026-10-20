# Chapter 04 — Scheduled & Cron Workflows with Timezones

> **Goal**: Schedule recurring background jobs (Daily Sales Reports, Abandoned Cart Scanners) using standard cron syntax, timezone pinning (`TZ=America/New_York`), and dual event triggers.

---

## 🎯 What You Will Learn
1. How to schedule serverless cron jobs without managing long-running `node-cron` or OS crontab servers.
2. Specifying timezones directly inside the cron string:
   ```typescript
   { cron: "TZ=America/New_York 0 9 * * *" } // Every day at 9:00 AM NY time
   ```
3. **Dual Triggers**: Allowing a function to run **both on a cron schedule AND on a manual event**:
   ```typescript
   [
     { cron: "0 */2 * * *" },
     { event: "admin/trigger.cart-recovery" }
   ]
   ```
   This allows developers and CI/CD pipelines to trigger cron jobs on demand for testing without waiting for hours!

---

## 🚀 How to Run

### Step 1: Start Inngest Dev Server (Terminal 1)
```bash
npm run inngest:dev
```

### Step 2: Start Chapter 4 Express Server (Terminal 2)
```bash
npm run dev:ch4
```

---

## 🧪 Testing the Scheduled Workflows On-Demand

You don't need to wait for 9:00 AM or 2 hours to test your cron jobs! Use the manual trigger test endpoints:

### 1. Trigger the Daily Sales Report
```bash
curl -X POST http://localhost:3000/trigger/daily-sales
```
* **Step Breakdown**:
  * `step.run("query-sales-metrics")`: Aggregates 24h revenue ($24,950).
  * `step.run("generate-summary-pdf")`: Compiles the executive PDF.
  * `step.run("send-email-to-leadership")`: Sends email to CEO & CFO.

### 2. Trigger the Abandoned Cart Recovery Scanner
```bash
curl -X POST http://localhost:3000/trigger/cart-recovery
```
* **Step Breakdown**:
  * `step.run("scan-abandoned-carts")`: Queries users idle for > 2 hours.
  * `step.run("send-recovery-emails")`: Generates and dispatches `RECOVER10` discount promo codes.
