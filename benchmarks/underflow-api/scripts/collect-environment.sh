#!/usr/bin/env bash
set -euo pipefail

required=(GIT_SHA IMAGE_DIGEST AWS_REGION RESULTS_DIR TF_ROOT)
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || { echo "$name is required" >&2; exit 2; }
done

for command in jq terraform node; do
  command -v "$command" >/dev/null || { echo "$command is required" >&2; exit 2; }
done

mkdir -p "$RESULTS_DIR"
if [[ -z "${K6_VERSION:-}" ]]; then
  if command -v k6 >/dev/null; then
    K6_VERSION="$(k6 version | head -n1)"
  elif command -v docker >/dev/null; then
    K6_VERSION="$(docker run --rm grafana/k6:latest version | head -n1)"
  else
    echo "k6 or Docker is required" >&2
    exit 2
  fi
fi

jq -n \
  --arg gitSha "$GIT_SHA" \
  --arg imageDigest "$IMAGE_DIGEST" \
  --arg timestamp "$(date -u +%FT%TZ)" \
  --arg region "$AWS_REGION" \
  --argjson availabilityZones "$(terraform -chdir="$TF_ROOT" output -json availability_zones)" \
  --arg nodeVersion "$(node --version)" \
  --arg k6Version "$K6_VERSION" \
  '{
    gitSha: $gitSha,
    imageDigest: $imageDigest,
    testTimestamp: $timestamp,
    awsRegion: $region,
    availabilityZones: $availabilityZones,
    infrastructure: {
      ecs: {cpu: 512, memoryMiB: 1024, desiredCount: 1},
      rds: {
        class: "db.t4g.micro",
        engine: "postgres",
        engineVersion: "16.13",
        storageGiB: 20,
        multiAz: false,
        publiclyAccessible: false
      }
    },
    nodeVersion: $nodeVersion,
    k6Version: $k6Version,
    dataset: "underflow-api-benchmark-v1",
    profiles: {
      smoke: {vus: 2, duration: "30s"},
      normalLoad: {stages: [["1m",25],["3m",25],["1m",50],["5m",50],["2m",100],["5m",100],["1m",0]]},
      stress: {stages: [["2m",100],["3m",100],["1m",150],["3m",150],["1m",200],["3m",200],["1m",0]]}
    }
  }' > "$RESULTS_DIR/environment.json"

jq -e . "$RESULTS_DIR/environment.json" >/dev/null
echo "Saved environment metadata to $RESULTS_DIR/environment.json"
