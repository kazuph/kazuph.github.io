from __future__ import annotations

import argparse
from pathlib import Path
import py_compile
import subprocess
import tempfile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent
PROMPTS = ROOT / "prompts"
OUT = ROOT / "gemini35flash"
AGY = Path.home() / ".local/bin/agy"


def strip_fences(text: str) -> str:
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            continue
        if stripped.startswith("Error: timed out waiting for response"):
            continue
        lines.append(line)
    return "\n".join(lines).strip() + "\n"


def target_for(prompt_path: Path) -> Path:
    name = prompt_path.stem
    if name.endswith("-svg"):
        return OUT / f"{name[:-4]}.svg"
    if name.endswith("-matplotlib"):
        return OUT / f"{name[:-11]}.py"
    if name.endswith("-tikz"):
        return OUT / f"{name[:-5]}.tex"
    raise ValueError(f"unexpected prompt name: {name}")


def validate_output(target: Path, content: str) -> None:
    if target.suffix == ".svg":
        ET.fromstring(content)
        return
    if target.suffix == ".py":
        with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)
        try:
            py_compile.compile(str(tmp_path), doraise=True)
        finally:
            tmp_path.unlink(missing_ok=True)
        return
    if target.suffix == ".tex":
        if "\\begin{document}" not in content or "\\end{document}" not in content:
            raise ValueError("incomplete tex output")
        with tempfile.TemporaryDirectory() as tmpdir:
            tex_path = Path(tmpdir) / "candidate.tex"
            tex_path.write_text(content, encoding="utf-8")
            subprocess.run(
                [
                    "xelatex",
                    "-interaction=nonstopmode",
                    "-halt-on-error",
                    "-output-directory",
                    tmpdir,
                    str(tex_path),
                ],
                check=True,
                capture_output=True,
                text=True,
            )
        return
    raise ValueError(f"unsupported target suffix: {target.suffix}")


def generate_one(prompt_path: Path, retries: int = 3) -> None:
    prompt = prompt_path.read_text(encoding="utf-8")
    target = target_for(prompt_path)
    last_error: Exception | None = None

    for _attempt in range(1, retries + 1):
        completed = subprocess.run(
            [str(AGY), "-p", prompt, "--print-timeout", "300s"],
            check=True,
            capture_output=True,
            text=True,
        )
        content = strip_fences(completed.stdout)
        try:
            validate_output(target, content)
        except Exception as exc:
            last_error = exc
            continue

        target.write_text(content, encoding="utf-8")
        return

    raise RuntimeError(f"failed to generate valid output for {prompt_path.name}: {last_error}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("prompts", nargs="*", help="prompt file names or absolute paths")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if args.prompts:
        prompt_paths = []
        for item in args.prompts:
            candidate = Path(item)
            if not candidate.is_absolute():
                candidate = PROMPTS / item
            prompt_paths.append(candidate)
    else:
        prompt_paths = sorted(PROMPTS.glob("*.txt"))

    for prompt_path in prompt_paths:
        generate_one(prompt_path)


if __name__ == "__main__":
    main()
