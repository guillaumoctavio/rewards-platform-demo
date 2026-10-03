# rewards-platform-demo

![CI](https://github.com/guillaumoctavio/rewards-platform-demo/actions/workflows/ci.yml/badge.svg)

Event-driven microservices demo: compra → recompensa → entrega. Cada servicio es independiente (su propio `package.json`, su propia tabla) y se comunica solo por eventos sobre Kafka (Redpanda).

```
purchase.created ──▶ [rewards-service] ──▶ reward.issued ──▶ [fulfillment-service]
      ▲                                          │
 [purchases-service]                       (guarda la "entrega")
```

- **purchases-service**: recibe una compra por REST y publica `purchase.created`.
- **rewards-service**: consume `purchase.created`, aplica la regla `amount > 50` y publica `reward.issued` o `reward.denied`.
- **fulfillment-service**: consume `reward.issued` y "entrega" la recompensa (expone un GET para consultarla).

## Correrlo

```bash
docker compose up --build

curl -X POST localhost:3001/purchases -d '{"customerId":"c1","amount":80}' -H 'Content-Type: application/json'
# mirar logs de rewards-service y fulfillment-service, reaccionan en cascada
curl localhost:3003/deliveries/c1
```

## Tests

```bash
cd purchases-service && npm test    # o rewards-service / fulfillment-service
```

`fulfillment-service` además tiene un test de integración contra Postgres real:
```bash
docker compose up -d postgres
cd fulfillment-service && npm run test:integration
```

## Kubernetes / ArgoCD

`k8s/` tiene los manifests (Deployment + Service por servicio, Secret de ejemplo, Application de ArgoCD). No hace falta un cluster corriendo para revisarlos.

---

Simplified demo inspired by a production event-driven platform I built and operated for Brazil's largest banks (50+ microservices, 500K+ transactions/day, Kafka + Kubernetes/ArgoCD).
