#!/bin/bash
# Prepare the ISUCON14 environment on Apple container and create competitor directories.
#   ./setup.sh                 : prepare only (clone isucon14, build frontend + benchmarker + server image)
#   ./setup.sh <dir> [<dir>…]  : prepare, then create a fresh competitor directory for each <dir>
# Requirements: macOS + Apple container (`container system start`), git, go, node + pnpm, jq.
set -euo pipefail
ENV_DIR="$(cd "$(dirname "$0")" && pwd)"
ISUCON14_REPO=https://github.com/isucon/isucon14.git
ISUCON14_COMMIT=53f8b627e040c30ebec600457c6c97da008b84b0   # commit used in the benchmark (2026-09-23)
SRC="$ENV_DIR/isucon14"

if [ ! -d "$SRC/.git" ]; then
  git clone "$ISUCON14_REPO" "$SRC"
  git -C "$SRC" checkout -q "$ISUCON14_COMMIT"
fi
if [ ! -f "$SRC/frontend/build/client/index.html" ]; then
  # pnpm 11+ fails the install unless dependency build scripts are explicitly allowed.
  # Allow only the two packages the ISUCON14 frontend needs. The file is not part of
  # upstream isucon14, so always overwrite it (a failed install leaves a placeholder behind).
  printf 'allowBuilds:\n  esbuild: true\n  "@swc/core": true\n' > "$SRC/frontend/pnpm-workspace.yaml"
  (cd "$SRC/frontend" && pnpm install --frozen-lockfile && pnpm run build)
fi
if [ ! -x "$ENV_DIR/bench-bin" ]; then
  (cd "$SRC/bench" && go build -o "$ENV_DIR/bench-bin" .)
fi
container image inspect isucon14-server:latest >/dev/null 2>&1 \
  || container build -t isucon14-server:latest "$ENV_DIR/server"

for dir in "$@"; do
  mkdir -p "$dir"
  dir="$(cd "$dir" && pwd)"
  if [ -e "$dir/webapp" ]; then echo "skip (already exists): $dir/webapp" >&2; continue; fi
  mkdir -p "$dir/webapp" "$dir/docs"
  cp -R "$SRC/webapp/go" "$SRC/webapp/sql" "$dir/webapp/"
  cp -R "$SRC/frontend/build/client" "$dir/webapp/public"
  cp "$SRC/docs/manual.md" "$SRC/docs/ISURIDE.md" "$SRC/docs/client-application-simulator-image.png" "$dir/docs/"
  cp "$ENV_DIR/isu" "$dir/isu"
  printf 'isuride\nbench-results/\n' > "$dir/.gitignore"
  git -C "$dir" init -q
  git -C "$dir" add -A
  git -C "$dir" -c user.name=bench -c user.email=bench@local commit -qm "initial ISUCON14 webapp"
  echo "competitor ready: $dir  (run: ISUCON_ENV=$ENV_DIR $dir/isu up)"
done
