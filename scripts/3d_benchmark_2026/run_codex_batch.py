from __future__ import annotations

import argparse
import os
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROMPTS = ROOT / "prompts"
OUT = ROOT.parent.parent / "benchmark_sources" / "3d-model-benchmark" / "gpt55"
MODEL = "gpt-5.5"


def strip_fences(text: str) -> str:
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            continue
        lines.append(line)
    return "\n".join(lines).strip() + "\n"


BASE_URL = os.environ.get("BENCH_BASE_URL", "http://127.0.0.1:8941")


def validate_output(content: str) -> None:
    lowered = content.lower()
    if "<html" not in lowered or "</html>" not in lowered:
        raise ValueError("incomplete html output")
    if "canvas" not in lowered and "three" not in lowered and "webgl" not in lowered:
        raise ValueError("no 3d renderer found in output")


def validate_render(stem: str, content: str) -> None:
    """Headless render check, analogous to the xelatex/py_compile checks in the 2D suite."""
    tmp = OUT / f".tmp-{stem}.html"
    tmp.write_text(content, encoding="utf-8")
    rel = tmp.relative_to(ROOT.parent.parent)
    try:
        subprocess.run(
            ["node", str(ROOT / "render_check.mjs"), f"{BASE_URL}/{rel}"],
            check=True,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.CalledProcessError as exc:
        raise ValueError(f"render check failed: {exc.stderr.strip()[:300]}") from exc
    finally:
        tmp.unlink(missing_ok=True)


def run_codex(prompt: str) -> str:
    with tempfile.TemporaryDirectory() as tmpdir:
        last_message = Path(tmpdir) / "last_message.txt"
        subprocess.run(
            [
                "codex",
                "exec",
                "-m",
                MODEL,
                "-s",
                "read-only",
                "--skip-git-repo-check",
                "--ephemeral",
                "--color",
                "never",
                "--output-last-message",
                str(last_message),
                "-C",
                tmpdir,
                prompt,
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=1500,
        )
        return last_message.read_text(encoding="utf-8")


def generate_one(prompt_path: Path, retries: int = 3) -> None:
    prompt = prompt_path.read_text(encoding="utf-8")
    target = OUT / f"{prompt_path.stem}.html"
    last_error: Exception | None = None

    for _attempt in range(1, retries + 1):
        try:
            content = strip_fences(run_codex(prompt))
            validate_output(content)
            validate_render(prompt_path.stem, content)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            print(f"[retry] {prompt_path.name}: {exc}")
            continue
        target.write_text(content, encoding="utf-8")
        print(f"[ok] {target.name} ({len(content)} bytes)")
        return

    raise RuntimeError(f"failed to generate valid output for {prompt_path.name}: {last_error}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*", help="prompt stems to generate")
    parser.add_argument("--workers", type=int, default=5)
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    prompt_paths = sorted(PROMPTS.glob("*.txt"))
    if args.only:
        prompt_paths = [p for p in prompt_paths if p.stem in args.only]

    failures = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(generate_one, p): p for p in prompt_paths}
        for future in as_completed(futures):
            prompt_path = futures[future]
            try:
                future.result()
            except Exception as exc:  # noqa: BLE001
                failures.append((prompt_path.name, str(exc)))
                print(f"[fail] {prompt_path.name}: {exc}")

    if failures:
        raise SystemExit(f"{len(failures)} prompts failed: {failures}")
    print("all done")


if __name__ == "__main__":
    main()
