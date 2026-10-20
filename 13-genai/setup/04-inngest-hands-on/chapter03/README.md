# Chapter 03 — Event-Driven Architecture & The Fan-Out Pattern

> **Goal**: Master Event-Driven Architecture (EDA) and the **Fan-Out Pattern** where **one single event** (`user/signup.completed`) triggers **multiple independent background functions** simultaneously.

---

## 🎯 What You Will Learn
1. **The Monolithic Async Bottleneck**:
   In traditional apps, user signup sequentially sends an email, creates a Stripe customer, provisions storage, and tracks analytics. If analytics fails, the user gets a 500 error!
2. **The Fan-Out Pattern**:
   Instead of doing everything in one giant request, your API creates the user record, emits `user/signup.completed`, and returns HTTP 201 immediately in **under 20ms**.
3. Inngest automatically fans out the event to 3 independent background functions in parallel:
   * `sendWelcomeEmail`: Prepares plan-based templates and sends emails.
   * `setupUserPreferences`: Provisions default settings, notifications, and storage buckets.
   * `trackSignupAnalytics`: Logs event telemetry to data warehouses.

```
                         POST /api/signup
                                │
                                ▼
                       Create User in DB
                                │
                                ▼
                 Emit: "user/signup.completed"
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
[ sendWelcomeEmail ]   [ setupPreferences ]   [ trackAnalytics ]
(Retries independently) (Retries independently)(Retries independently)
```

---

## 🚀 How to Run

### Step 1: Start Inngest Dev Server (Terminal 1)
```bash
npm run inngest:dev
```

### Step 2: Start Chapter 3 Express Server (Terminal 2)
```bash
npm run dev:ch3
```

---

## 🧪 Testing the Signup Fan-Out

Submit a new user signup:
```bash
curl -X POST http://localhost:3000/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "saif@example.com",
    "name": "Saif",
    "password": "supersecretpassword",
    "plan": "enterprise"
  }'
```

* **Observation**:
  1. Your curl command returns **instant 201 Created** (`message: "User created successfully!..."`).
  2. Open **http://localhost:8288**: watch 3 functions fire **simultaneously in parallel**, each with its own isolated steps and independent retries!
