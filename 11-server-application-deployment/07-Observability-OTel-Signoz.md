# Observability — OpenTelemetry & Signoz
## Bonus — Seeing What Your Deployed App Is Actually Doing

> Previous: [06-CICD-GitHub-Actions.md](06-CICD-GitHub-Actions.md)

---

## 📌 Executive Summary

- Once your app is deployed and traffic is real, "does it work?" stops being enough — you need **observability**: logs, metrics, and traces about what's actually happening in production.
- **OTel (OpenTelemetry)** is a vendor-neutral standard/toolkit for collecting this data (traces, metrics, logs) from your application.
- **Signoz** is an open-source observability platform (like an open-source Datadog/New Relic) that can ingest OTel data and give you dashboards, traces, and alerts.
- You *can* instrument your own app's code directly with the OTel SDK — but the common DevOps pattern instead is a **sidecar**: a separate container running alongside your app that collects telemetry (health, metrics, traces) largely without your application code needing to know or care.

---

## 🧠 Core Analogy

Your app is a factory worker. Instrumenting your own code with OTel manually is like handing the worker a clipboard and asking them to log their own every move — it works, but it's extra effort baked into their actual job. The **sidecar pattern** instead posts a silent observer next to the worker (a second container next to your app's container) that watches and reports independently — the worker just does their job, unaware their surroundings are being monitored and reported elsewhere.

---

## 🔭 1. What OpenTelemetry Actually Standardizes

OTel defines a common format for three kinds of signals:

| Signal | What it captures |
|---|---|
| **Traces** | The path of a single request across services/functions — "this request took 400ms, 350ms of which was one slow DB call" |
| **Metrics** | Numeric measurements over time — request count, error rate, CPU/memory |
| **Logs** | Discrete events/messages your app emits |

The point of a *standard* is that any OTel-compatible backend (Signoz, Jaeger, Grafana, Datadog, etc.) can ingest the same data — you're not locked into one vendor's proprietary agent.

---

## 🧭 2. Signoz

**Signoz** is an open-source, self-hostable observability platform: it ingests OTel data and gives you a UI for traces, metrics dashboards, and alerting — a self-hosted alternative to commercial APM tools. You run it as its own set of containers (it ships its own Docker Compose setup), typically alongside your app stack.

---

## 🧵 3. Two Ways to Get Telemetry Out of Your App

1. **Instrument manually** — add the OTel SDK to your app's code, wrap routes/DB calls in spans yourself. Full control, but it's code you write and maintain.
2. **Sidecar pattern (the common DevOps approach)** — run an **OpenTelemetry Collector** container next to your app container (same Docker network/pod), configured to auto-collect what it can (HTTP metrics, container health, resource usage) and forward it to Signoz. Your actual application code stays mostly untouched.

```yaml
# excerpt — adding a sidecar collector next to the app
services:
  api:
    build: .
    networks: [appnet]
    # ... existing config

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    networks: [appnet]
    depends_on: [api]

networks:
  appnet:
```

The collector reads its own config file describing what to scrape and where to forward it (Signoz's ingestion endpoint) — your `api` service doesn't reference the collector at all in this minimal setup; the collector observes it from alongside.

> This is why it's called a **sidecar**: it rides along next to your main container, doing a job (observability) that's related but separate, without your main application needing to be aware of it.

---

## ✅ Takeaways

- **Observability** (traces/metrics/logs) becomes necessary once your app is actually deployed and serving real traffic — you need to see what's slow or breaking, not just whether it's "up."
- **OpenTelemetry (OTel)** is the vendor-neutral standard for collecting this data; **Signoz** is an open-source platform to visualize and alert on it.
- You can instrument your own code with the OTel SDK, but the common pattern is a **sidecar**: a separate collector container observing your app's container from alongside, keeping this concern out of your application code — the same separation-of-concerns instinct as putting SSL termination in Caddy/Traefik instead of your app ([Level 4](04-Level-4-Reverse-Proxy-Caddy-SSL.md)).
