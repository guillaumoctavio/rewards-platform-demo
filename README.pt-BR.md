# rewards-platform-demo

![CI](https://github.com/guillaumoctavio/rewards-platform-demo/actions/workflows/ci.yml/badge.svg)

[English](README.md) · **Português (BR)**

Demo de microsserviços orientados a eventos: compra → recompensa → entrega. Cada serviço é independente (seu próprio `package.json`, sua própria tabela) e eles só se comunicam por eventos no Kafka (Redpanda).

```text
purchase.created ──▶ [rewards-service] ──▶ reward.issued ──▶ [fulfillment-service]
      ▲                                          │
 [purchases-service]                        (guarda a "entrega")
```

- **purchases-service**: recebe uma compra por REST e publica `purchase.created`.
- **rewards-service**: consome `purchase.created`, aplica a regra `amount > 50` e publica `reward.issued` ou `reward.denied`.
- **fulfillment-service**: consome `reward.issued` e "entrega" a recompensa (expõe um GET para consultá-la).

## Como rodar

```bash
docker compose up --build

curl -X POST localhost:3001/purchases -d '{"customerId":"c1","amount":80}' -H 'Content-Type: application/json'
# veja os logs do rewards-service e do fulfillment-service: eles reagem em cascata
curl localhost:3003/deliveries/c1
```

## Testes

```bash
cd purchases-service && npm test    # ou rewards-service / fulfillment-service
```

O `fulfillment-service` também tem um teste de integração contra um Postgres real:

```bash
docker compose up -d postgres
cd fulfillment-service && npm run test:integration
```

## Kubernetes / ArgoCD

A pasta `k8s/` contém os manifests: um Deployment (e um Service, nos serviços HTTP) por serviço, um Secret de exemplo e uma Application do ArgoCD. Não é preciso ter um cluster rodando para revisá-los.

## Decisões de design

- **Eventos duplicados:** o Kafka entrega pelo menos uma vez. Cada insert dos consumers é idempotente (`UNIQUE(purchase_id)` + `ON CONFLICT DO NOTHING`), e uma mensagem que não altera nada não é republicada. Reprocessar um `purchase.created` não cria uma segunda recompensa nem uma segunda entrega.
- **Retries e mensagens ruins:** o kafkajs refaz handlers que falham, com backoff. Mensagens que não fazem parse são logadas e descartadas para não derrubar o consumer. Ainda não há dead-letter topic, então uma mensagem que continua falhando bloqueia sua partição.
- **Lacuna conhecida:** a compra é gravada antes do evento ser publicado. Se o Kafka estiver fora nesse momento, a compra existe sem o evento. Em produção eu usaria o padrão outbox transacional: gravar o evento numa tabela `outbox` na mesma transação e um relay publica os eventos.
- **Adições para produção:** um dead-letter topic com alertas, métricas de consumer lag e taxa de erro (Prometheus/Grafana), um schema registry para os contratos de eventos e migrations versionadas em vez de `CREATE TABLE IF NOT EXISTS` no startup.

---

Demo simplificada inspirada em uma plataforma de produção orientada a eventos que construí e operei para os maiores bancos do Brasil (50+ microsserviços, 500K+ transações/dia, Kafka + Kubernetes/ArgoCD).
