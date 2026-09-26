# Plan: repo demo de microservicios orientados a eventos

Objetivo: un repo público, chico y autocontenido que respalde visualmente el bullet más fuerte del CV de Dev (microservicios Node.js, Kafka, Kubernetes/ArgoCD, 5 bancos, 500K+ tx/día). No es código productivo, es una demo que un entrevistador pueda clonar y entender en 5 minutos.

**Narrativa elegida:** un flujo de "compra → recompensa → entrega", simplificación del programa de beneficios del Banco do Brasil que ya está en tu CV. Así el repo y la entrevista se cuentan solos.

```
purchase.created ──▶ [rewards-service] ──▶ reward.issued ──▶ [fulfillment-service]
      ▲                                          │
 [purchases-service]                       (log / guarda "entrega")
```

- **purchases-service**: API REST, crea una compra, publica evento `purchase.created`.
- **rewards-service**: consume `purchase.created`, aplica una regla simple (compra > $50 = elegible), publica `reward.issued` o `reward.denied`.
- **fulfillment-service**: consume `reward.issued`, "entrega" la recompensa (guarda en su propia tabla, expone un GET para consultarla).

Cada servicio es independiente: su propio `package.json`, su propia base de datos (o tabla), se comunican solo por eventos. Eso es lo que demuestra la arquitectura.

---

## 0. Prerequisitos

- [ ] Node.js LTS instalado (`node -v`)
- [ ] Docker + Docker Compose instalados (`docker compose version`)
- [ ] Cuenta de GitHub con SSH configurado (ya la tenés)

## 1. Scaffold del repo

```bash
mkdir rewards-platform-demo && cd rewards-platform-demo
git init
mkdir -p purchases-service rewards-service fulfillment-service k8s .github/workflows
```

`.gitignore` en la raíz:
```
node_modules/
.env
*.log
dist/
```

## 2. Infraestructura local: `docker-compose.yml`

Usá **Redpanda** en vez de Kafka + Zookeeper — es compatible con el protocolo Kafka (mismo cliente, mismos conceptos, mismas librerías) pero un solo contenedor, arranca en segundos. Para la demo es más lazy y sigue siendo 100% cierto decir "Kafka-compatible event streaming" en el README.

```yaml
# docker-compose.yml
services:
  redpanda:
    image: redpandadata/redpanda:latest
    command: redpanda start --smp 1 --overprovisioned --node-id 0 --kafka-addr PLAINTEXT://0.0.0.0:9092 --advertise-kafka-addr PLAINTEXT://redpanda:9092
    ports: ["9092:9092"]

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: demo
      POSTGRES_DB: rewards_demo
    ports: ["5432:5432"]

  purchases-service:
    build: ./purchases-service
    ports: ["3001:3000"]
    depends_on: [redpanda, postgres]
    environment:
      KAFKA_BROKER: redpanda:9092
      DATABASE_URL: postgres://postgres:demo@postgres:5432/rewards_demo

  rewards-service:
    build: ./rewards-service
    depends_on: [redpanda, postgres]
    environment:
      KAFKA_BROKER: redpanda:9092
      DATABASE_URL: postgres://postgres:demo@postgres:5432/rewards_demo

  fulfillment-service:
    build: ./fulfillment-service
    ports: ["3003:3000"]
    depends_on: [redpanda, postgres]
    environment:
      KAFKA_BROKER: redpanda:9092
      DATABASE_URL: postgres://postgres:demo@postgres:5432/rewards_demo
```

## 3. Setup común de cada servicio

En cada carpeta (`purchases-service`, `rewards-service`, `fulfillment-service`):

```bash
cd purchases-service
npm init -y
npm install express kafkajs pg
npm install -D jest supertest
```

Estructura sugerida por servicio:
```
purchases-service/
  src/
    index.js          # arranca Express + conexión Kafka
    routes.js          # endpoints REST
    producer.js         # publica eventos
    consumer.js          # (si aplica) consume eventos
    db.js              # conexión Postgres
  tests/
    routes.test.js
  Dockerfile
  package.json
```

`Dockerfile` (igual en los 3, cambiando el puerto si aplica):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
CMD ["node", "src/index.js"]
```

## 4. purchases-service

- [ ] `POST /purchases` recibe `{ customerId, amount }`, guarda en Postgres, publica `purchase.created` con `{ purchaseId, customerId, amount }` en el tópico `purchases`.
- [ ] Test con `supertest`: mockeá el producer de Kafka (jest.mock), verificá que el endpoint devuelve 201 y llama a `producer.send` con el payload correcto.
- [ ] `GET /purchases/:id` para consultar una compra (útil para probar manualmente).

## 5. rewards-service

- [ ] Consumer del tópico `purchases`, group id `rewards-service`.
- [ ] Regla de negocio simple y explícita (fácil de explicar en entrevista): `amount > 50` → elegible.
- [ ] Publica `reward.issued` (`{ purchaseId, customerId, rewardType: "cashback_5pct" }`) o `reward.denied` en el tópico `rewards`.
- [ ] Guarda el resultado en su propia tabla (`rewards`) — cada servicio es dueño de sus datos, no comparte la tabla de `purchases-service`. Esto es lo que hace que sea "de verdad" microservicios y no un monolito con Kafka encima.
- [ ] Test unitario de la función de regla de negocio (sin Kafka de por medio, pura función `isEligible(amount)`).

## 6. fulfillment-service

- [ ] Consumer del tópico `rewards`, filtra solo `reward.issued`.
- [ ] "Entrega" la recompensa: guarda en tabla `deliveries` con timestamp.
- [ ] `GET /deliveries/:customerId` para consultar qué recompensas recibió un cliente.
- [ ] Test de integración liviano con Postgres real via Docker (o mock de la capa `db.js` si preferís mantenerlo 100% unitario).

## 7. Probar end-to-end

```bash
docker compose up --build
curl -X POST localhost:3001/purchases -d '{"customerId":"c1","amount":80}' -H 'Content-Type: application/json'
# mirar logs de rewards-service y fulfillment-service, deberían reaccionar en cascada
curl localhost:3003/deliveries/c1
```

- [ ] Confirmar que el flujo completo funciona antes de seguir.

## 8. Kubernetes + ArgoCD (la parte que respalda esa línea del CV)

No hace falta un cluster real corriendo. Alcanza con manifests correctos en el repo — es lo que un entrevistador va a mirar.

`k8s/purchases-service.yaml` (repetir patrón para los otros 2 servicios):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: purchases-service
spec:
  replicas: 2
  selector:
    matchLabels: { app: purchases-service }
  template:
    metadata:
      labels: { app: purchases-service }
    spec:
      containers:
        - name: purchases-service
          image: ghcr.io/<tu-usuario>/purchases-service:latest
          ports: [{ containerPort: 3000 }]
          envFrom:
            - secretRef: { name: rewards-platform-secrets }
---
apiVersion: v1
kind: Service
metadata:
  name: purchases-service
spec:
  selector: { app: purchases-service }
  ports: [{ port: 80, targetPort: 3000 }]
```

`k8s/argocd-application.yaml` (un solo ejemplo, ilustrativo — no hace falta un ArgoCD real corriendo):
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: rewards-platform-demo
spec:
  project: default
  source:
    repoURL: https://github.com/<tu-usuario>/rewards-platform-demo
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: rewards-demo
  syncPolicy:
    automated: { prune: true, selfHeal: true }
```

- [ ] Crear los 3 Deployments + Services.
- [ ] Crear el `argocd-application.yaml` de ejemplo.

## 9. CI con GitHub Actions

`.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [purchases-service, rewards-service, fulfillment-service]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
        working-directory: ${{ matrix.service }}
      - run: npm test
        working-directory: ${{ matrix.service }}
```

- [ ] Confirmar que el badge de CI queda verde en GitHub tras el primer push.

## 10. README (esto es lo que realmente lee un recruiter)

Secciones mínimas:
1. Diagrama del flujo (el ASCII de arriba alcanza, o una imagen simple).
2. Qué problema resuelve cada servicio, en una línea.
3. Cómo correrlo: `docker compose up --build` + los `curl` de prueba.
4. Cómo correr los tests: `npm test` en cada carpeta.
5. Una nota corta: *"Simplified demo inspired by a production event-driven platform I built and operated for Brazil's largest banks (50+ microservices, 500K+ transactions/day, Kafka + Kubernetes/ArgoCD)."* — esto conecta el repo con el CV explícitamente.

- [ ] Escribir el README.
- [ ] Agregar topics en GitHub: `nodejs`, `kafka`, `microservices`, `event-driven`, `docker`, `kubernetes`.
- [ ] Repo público, pushear.
- [ ] Linkear desde el CV / LinkedIn / GitHub profile README.

## Orden recomendado para hacerlo en sesiones cortas

1. Sesión 1: pasos 1-3 (scaffold + docker-compose + setup).
2. Sesión 2: paso 4 (purchases-service completo con test).
3. Sesión 3: pasos 5-6 (rewards + fulfillment).
4. Sesión 4: paso 7 (probar todo junto) + paso 8 (k8s/argocd).
5. Sesión 5: pasos 9-10 (CI + README) + publicar.

Cada sesión deja algo funcionando y commiteado — no hace falta terminar todo de una sentada.
