from __future__ import annotations

from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent.parent / "benchmark_sources" / "gemini35flash-vs-gpt54-diagram-benchmark"


def main() -> None:
    for model in ("gpt54", "gemini35flash", "opus48", "fable5", "gpt55"):
        src_dir = ROOT / model
        out_dir = PUBLIC / model
        out_dir.mkdir(parents=True, exist_ok=True)
        for path in src_dir.iterdir():
            if path.is_file() and path.suffix in {".tex", ".py", ".svg"}:
                shutil.copy2(path, out_dir / path.name)


if __name__ == "__main__":
    main()
