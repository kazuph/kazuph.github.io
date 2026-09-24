#!/bin/bash
# Official final measurement: recreate the competitor's server container (DB re-init) and run the benchmark once.
# Does not count toward the competitor's 10 bench runs.
#   ./judge.sh <competitor-dir> [<log-file>]
set -euo pipefail
ENV_DIR="$(cd "$(dirname "$0")" && pwd)"
D="$(cd "$1" && pwd)"
NAME="isu-$(basename "$(dirname "$D")")-$(basename "$D")"
log="${2:-$D/judge-final.log}"
ISUCON_ENV="$ENV_DIR" "$D/isu" up > /dev/null
ip=$(container inspect "$NAME" | jq -r '.[0].status.networks[0].ipv4Address' | cut -d/ -f1)
gw=$(echo "$ip" | awk -F. '{print $1"."$2"."$3".1"}')
echo "judge $(basename "$(dirname "$D")") commit=$(git -C "$D" rev-parse --short HEAD) target=$ip started=$(date '+%F %T')" | tee "$log"
(cd "$ENV_DIR/isucon14/bench" && "$ENV_DIR/bench-bin" run --target "http://$ip" --payment-url "http://$gw:12345" -t 60) >> "$log" 2>&1
grep -oE 'pass=[a-z]+ スコア=[0-9-]+ .*' "$log" | tail -1
container stop "$NAME" > /dev/null
