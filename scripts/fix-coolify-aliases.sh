#!/usr/bin/env bash
# Restore Docker network aliases for E-Watu Coolify apps (separate apps + nginx gateway).
# Run on the Coolify host as root (or a user in the docker group).
#
# Usage:
#   ./scripts/fix-coolify-aliases.sh              # fix aliases + verify
#   ./scripts/fix-coolify-aliases.sh --list        # show containers / SERVICE_NAME
#   ./scripts/fix-coolify-aliases.sh --dry-run     # show what would be done
#   NETWORK_ID=... ./scripts/fix-coolify-aliases.sh
#
# Idempotent: safe to run after every Coolify redeploy.

set -euo pipefail

NETWORK_ID="${NETWORK_ID:-19d454d29fa3bb02f01092420262c6ce4d27d829dfb733515b6a212b96541a81}"
DRY_RUN=0
LIST_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --list) LIST_ONLY=1 ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
  esac
done

# Coolify resource UUID → expected nginx DNS alias (from Coolify app UUIDs).
# Ports documented for humans; alias names must match gateway envsubst defaults.
declare -A UUID_TO_ALIAS=(
  [g8y94697174pnq5y74kuk8g7]=identity-service      # :3011
  [kum2k8dhhx0u89i1d5hyuzti]=platform-service      # :3012
  [qtz7boj03rdadslcvyvhhbt5]=recruitment-service   # :3013
  [on8dsbzq0f4v4klokrpkps0i]=notification-service  # :3015
  [ui656enqdq551nex1njjlf0c]=payroll-service       # :3016
  [sqmksm1z7duyhfirtqy0d4qn]=document-service      # :3018
  [foxvyku0dimv89c61t2l61uf]=gateway               # nginx :80
  # x5s2bomef3af8u56dzncc3cq — second nginx/web app (no SERVICE_NAME); not an API upstream
  # talent-pool UUID — set when that app is deployed (auto-resolved via SERVICE_NAME)
)

# All UUID prefixes we care about (known + TBD)
UUID_PREFIXES=(
  g8y94697174pnq5y74kuk8g7
  qtz7boj03rdadslcvyvhhbt5
  on8dsbzq0f4v4klokrpkps0i
  ui656enqdq551nex1njjlf0c
  sqmksm1z7duyhfirtqy0d4qn
  kum2k8dhhx0u89i1d5hyuzti
  x5s2bomef3af8u56dzncc3cq
  foxvyku0dimv89c61t2l61uf
)

declare -A ALIAS_TO_PORT=(
  [identity-service]=3011
  [platform-service]=3012
  [recruitment-service]=3013
  [talent-pool-service]=3014
  [notification-service]=3015
  [payroll-service]=3016
  [document-service]=3018
  [lending-service]=3021
)

find_container() {
  local uuid_prefix="$1"
  docker ps --format '{{.Names}}' | grep -E "^${uuid_prefix}" | head -n1 || true
}

container_service_name() {
  local container="$1"
  # Prefer SERVICE_NAME env (set in every Nest Dockerfile)
  local name
  name="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$container" \
    | sed -n 's/^SERVICE_NAME=//p' | head -n1 || true)"
  if [[ -n "$name" ]]; then
    echo "$name"
    return 0
  fi
  # Gateway / nginx image → no SERVICE_NAME
  local image
  image="$(docker inspect -f '{{.Config.Image}}' "$container" 2>/dev/null || true)"
  if [[ "$image" == *nginx* ]] || [[ "$image" == *foxvyku0dimv89c61t2l61uf* ]]; then
    echo "gateway"
    return 0
  fi
  return 1
}

resolve_alias() {
  local uuid_prefix="$1"
  local container="$2"
  if [[ -n "${UUID_TO_ALIAS[$uuid_prefix]:-}" ]]; then
    echo "${UUID_TO_ALIAS[$uuid_prefix]}"
    return 0
  fi
  container_service_name "$container"
}

list_containers() {
  echo "E-Watu Coolify containers:"
  printf '%-28s %-22s %-28s %s\n' "UUID_PREFIX" "ALIAS" "CONTAINER" "STATUS"
  for uuid in "${UUID_PREFIXES[@]}"; do
    local c alias status
    c="$(find_container "$uuid")"
    if [[ -z "$c" ]]; then
      printf '%-28s %-22s %-28s %s\n' "$uuid" "${UUID_TO_ALIAS[$uuid]:-?}" "(not running)" "-"
      continue
    fi
    alias="$(resolve_alias "$uuid" "$c" 2>/dev/null || echo "?")"
    status="$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo "?")"
    printf '%-28s %-22s %-28s %s\n' "$uuid" "$alias" "$c" "$status"
  done
  echo
  echo "All matching docker ps rows:"
  docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | grep -E "$(IFS='|'; echo "${UUID_PREFIXES[*]}")" || true
}

apply_alias() {
  local uuid_prefix="$1"
  local container
  container="$(find_container "$uuid_prefix")"
  if [[ -z "$container" ]]; then
    echo "WARN: no running container for ${uuid_prefix} — skip"
    return 0
  fi

  local alias_name
  if ! alias_name="$(resolve_alias "$uuid_prefix" "$container")"; then
    echo "WARN: cannot resolve alias for ${container} — skip (set SERVICE_NAME or UUID_TO_ALIAS)"
    return 0
  fi

  # Gateway does not need an upstream alias for itself
  if [[ "$alias_name" == "gateway" ]]; then
    echo "SKIP gateway ${container} (no upstream alias needed)"
    # Still ensure it is on the shared network
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "  dry-run: ensure ${container} on network"
      return 0
    fi
    if ! docker network inspect "$NETWORK_ID" --format '{{range .Containers}}{{.Name}}{{println}}{{end}}' \
      | grep -qx "$container"; then
      docker network connect "$NETWORK_ID" "$container" 2>/dev/null \
        || docker network connect "$NETWORK_ID" "$container"
    fi
    return 0
  fi

  echo "→ ${container}"
  echo "   alias=${alias_name}  network=${NETWORK_ID:0:12}…"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "   dry-run: disconnect + connect --alias ${alias_name}"
    return 0
  fi

  # Idempotent reconnect with alias (disconnect ignores "not connected")
  docker network disconnect "$NETWORK_ID" "$container" 2>/dev/null || true
  if ! docker network connect --alias "$alias_name" "$NETWORK_ID" "$container"; then
    echo "ERROR: failed to connect ${container} with alias ${alias_name}"
    return 1
  fi
  echo "OK  ${alias_name} → ${container}"
}

verify_from_gateway() {
  local gateway
  gateway="$(find_container foxvyku0dimv89c61t2l61uf)"
  if [[ -z "$gateway" ]]; then
    echo "WARN: gateway container not running — skip verify"
    return 0
  fi

  echo
  echo "=== Verify DNS from gateway (${gateway}) ==="
  local aliases=(
    identity-service
    platform-service
    recruitment-service
    talent-pool-service
    notification-service
    payroll-service
    document-service
  )

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "(dry-run) would nslookup + wget health checks"
    return 0
  fi

  # Ensure gateway is on the network
  docker network disconnect "$NETWORK_ID" "$gateway" 2>/dev/null || true
  docker network connect "$NETWORK_ID" "$gateway" 2>/dev/null || true

  local ok=0 fail=0
  for a in "${aliases[@]}"; do
    local port="${ALIAS_TO_PORT[$a]}"
    if docker exec "$gateway" nslookup "$a" >/dev/null 2>&1 \
      || docker exec "$gateway" getent hosts "$a" >/dev/null 2>&1 \
      || docker exec "$gateway" wget -qO- --timeout=3 "http://${a}:${port}/" >/dev/null 2>&1; then
      # Prefer an actual HTTP probe where possible
      local health_url=""
      case "$a" in
        identity-service) health_url="http://${a}:${port}/api/v1/identity/health" ;;
        *) health_url="http://${a}:${port}/" ;;
      esac
      local body
      body="$(docker exec "$gateway" wget -qO- --timeout=5 "$health_url" 2>/dev/null || true)"
      if [[ -n "$body" ]] || docker exec "$gateway" getent hosts "$a" >/dev/null 2>&1; then
        echo "OK   ${a}:${port}  ${body:0:80}"
        ok=$((ok + 1))
      else
        # DNS may work even if health path 404s
        if docker exec "$gateway" getent hosts "$a" >/dev/null 2>&1; then
          echo "OK   ${a} resolves (HTTP probe empty/404 — check service logs if login still 502)"
          ok=$((ok + 1))
        else
          echo "FAIL ${a} — cannot resolve"
          fail=$((fail + 1))
        fi
      fi
    else
      echo "FAIL ${a} — cannot resolve from gateway"
      fail=$((fail + 1))
    fi
  done

  echo
  echo "=== Identity direct probe ==="
  local id_c
  id_c="$(find_container g8y94697174pnq5y74kuk8g7)"
  if [[ -n "$id_c" ]]; then
    echo "container: $id_c"
    docker exec "$id_c" ls -la /app/dist/main.js 2>&1 || echo "MISSING /app/dist/main.js"
    echo "--- last 25 log lines ---"
    docker logs "$id_c" 2>&1 | tail -25 || true
    echo "--- local health ---"
    docker exec "$id_c" wget -qO- --timeout=5 http://127.0.0.1:3011/api/v1/identity/health 2>&1 || echo "identity local health failed"
  else
    echo "identity-service container NOT RUNNING — this alone causes 502"
  fi

  echo
  echo "verify summary: ok=${ok} fail=${fail}"
  [[ "$fail" -eq 0 ]]
}

# ── main ─────────────────────────────────────────────────────────────────────
if [[ "$LIST_ONLY" -eq 1 ]]; then
  list_containers
  exit 0
fi

if ! command -v docker >/dev/null; then
  echo "ERROR: docker not found"
  exit 1
fi

if ! docker network inspect "$NETWORK_ID" >/dev/null 2>&1; then
  echo "ERROR: Docker network ${NETWORK_ID} not found."
  echo "List: docker network ls"
  exit 1
fi

echo "Fixing Coolify aliases on network ${NETWORK_ID}"
[[ "$DRY_RUN" -eq 1 ]] && echo "(dry-run mode)"
echo

failed=0
for uuid in "${UUID_PREFIXES[@]}"; do
  apply_alias "$uuid" || failed=1
done

echo
list_containers

verify_from_gateway || failed=1

echo
echo "External check (from this host if curl works):"
echo "  curl -sS https://api.staging.hcsolutions-rw.site/api/v1/identity/health"
echo "  curl -sS -X POST https://api.staging.hcsolutions-rw.site/api/v1/auth/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"admin@ewatu.dev\",\"password\":\"DevPassword12!\"}'"

exit "$failed"
