#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: render_all.sh <gpt54|gemini35flash>" >&2
  exit 1
fi

model="$1"
root="$(cd "$(dirname "$0")" && pwd)"
src_dir="$root/$model"
out_dir="$(cd "$root/../.." && pwd)/images/posts/gemini35flash-vs-gpt54-diagram-benchmark"

mkdir -p "$out_dir"

for svg in "$src_dir"/*.svg; do
  [ -e "$svg" ] || continue
  base="$(basename "$svg" .svg)"
  /bin/bash --noprofile --norc "$root/render_asset.sh" svg "$svg" "$out_dir/${model}-${base}-svg.webp"
done

for py in "$src_dir"/*.py; do
  [ -e "$py" ] || continue
  base="$(basename "$py" .py)"
  /bin/bash --noprofile --norc "$root/render_asset.sh" matplotlib "$py" "$out_dir/${model}-${base}-matplotlib.webp"
done

for tex in "$src_dir"/*.tex; do
  [ -e "$tex" ] || continue
  base="$(basename "$tex" .tex)"
  /bin/bash --noprofile --norc "$root/render_asset.sh" tikz "$tex" "$out_dir/${model}-${base}-tikz.webp"
done
