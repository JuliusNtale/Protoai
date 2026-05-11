# Observability Stack

Start Loki + Promtail + Grafana:

```bash
docker compose -f docker-compose.observability.yml up -d
```

Access Grafana at `http://<server-ip>:3001` with:

- user: `admin`
- password: `admin`

Add Loki datasource URL:

`http://loki:3100`

Then query logs with labels from `job="docker"`.
