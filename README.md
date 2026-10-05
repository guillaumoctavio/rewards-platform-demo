# rewards-platform-demo

![CI](https://github.com/guillaumoctavio/rewards-platform-demo/actions/workflows/ci.yml/badge.svg)

**English** · [Português (BR)](README.pt-BR.md)

An event-driven microservices demo: purchase → reward → delivery. Each service is independent (its own `package.json`, its own table) and they only communicate through events on Kafka (Redpanda).

```text
purchase.created ──▶ [rewards-service] ──▶ reward.issued ──▶ [fulfillment-service]
      ▲                                          │
 [purchases-service]                       (stores the "delivery")
```

- **purchases-service**: accepts a purchase over REST and publishes `purchase.created`.
- **rewards-service**: consumes `purchase.created`, applies the rule `amount > 50`, and publishes `reward.issued` or `reward.denied`.
- **fulfillment-service**: consumes `reward.issued` and "delivers" the reward (exposes a GET endpoint to query it).

## Running it

```bash
docker compose up --build

curl -X POST localhost:3001/purchases -d '{"customerId":"c1","amount":80}' -H 'Content-Type: application/json'
# check the rewards-service and fulfillment-service logs: they react in cascade
curl localhost:3003/deliveries/c1
```

## Tests

```bash
cd purchases-service && npm test    # or rewards-service / fulfillment-service
```

`fulfillment-service` also has an integration test against a real Postgres:

```bash
docker compose up -d postgres
cd fulfillment-service && npm run test:integration
```

## Kubernetes / ArgoCD

`k8s/` contains the manifests: a Deployment (and Service, for the HTTP services) per service, an example Secret, and an ArgoCD Application. You don't need a running cluster to review them.

---

Simplified demo inspired by a production event-driven platform I built and operated for Brazil's largest banks (50+ microservices, 500K+ transactions/day, Kafka + Kubernetes/ArgoCD).
