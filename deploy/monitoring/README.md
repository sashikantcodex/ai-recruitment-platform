# ATS monitoring stack notes
#
# Local:
#   docker compose -f docker-compose.yml -f compose.monitoring.yml up -d
#   Prometheus: http://localhost:9090
#   Grafana:    http://localhost:3001 (admin/admin by default)
#   Elasticsearch: http://localhost:9200
#
# Kubernetes (AWS EKS):
#   Apply deploy/k8s/*.yaml after building/pushing images to your registry.
#   Wire a Prometheus Operator ServiceMonitor to ats-api / ats-ai health endpoints
#   or expose /metrics later for richer instrumentation.
#
# ELK:
#   Ship API/AI container logs via Filebeat/Fluent Bit to Elasticsearch.
#   Current compose overlay starts Elasticsearch only as a local log sink scaffold.
