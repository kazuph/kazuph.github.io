#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: render_asset.sh <tikz|matplotlib|svg> <input> <output.webp>" >&2
  exit 1
fi

format="$1"
input="$2"
output="$3"
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

case "$output" in
  /*) output_abs="$output" ;;
  *) output_abs="$(pwd)/$output" ;;
esac

case "$format" in
  tikz)
    cp "$input" "$workdir/input.tex"
    (
      cd "$workdir"
      xelatex -interaction=nonstopmode input.tex >/dev/null
      pdftoppm -png -r 220 input.pdf rendered >/dev/null
      cwebp -q 90 rendered-1.png -o "$output_abs" >/dev/null
    )
    ;;
  matplotlib)
    python3 "$input" "$workdir/rendered.png"
    cwebp -q 90 "$workdir/rendered.png" -o "$output_abs" >/dev/null
    ;;
  svg)
    rsvg-convert -w 1200 "$input" -o "$workdir/rendered.png"
    cwebp -q 90 "$workdir/rendered.png" -o "$output_abs" >/dev/null
    ;;
  *)
    echo "unknown format: $format" >&2
    exit 1
    ;;
esac
