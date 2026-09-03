from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent.parent
SOURCE_ROOT = ROOT / "benchmark_sources" / "3d-model-benchmark"
IMAGE_ROOT = ROOT / "images" / "posts" / "3d-model-benchmark"


@dataclass(frozen=True)
class Model:
    key: str
    label: str
    note: str


CASES = (
    ("trackball-split-keyboard", "トラックボール付き分割キーボード", "形状、キー配置、トラックボール、追加UIをどこまで作り込むか"),
    ("watch-movement", "機械式時計のムーブメント", "歯車、脱進機、テンプの構成と動きをどう表現するか"),
    ("cat", "猫", "プリミティブの組み合わせで有機形状と生き物らしい動きを作れるか"),
    ("robot-arm-7axis", "7軸ロボットアーム", "J1からJ7の階層構造、関節操作、グリッパを実装できるか"),
    ("espresso-machine", "エスプレッソマシン断面図", "外装と内部部品、断面・分解表示、抽出経路を説明できるか"),
)

GEMINI_MODELS = (
    Model("gemini35flash", "Gemini 3.5 Flash", "2026年6月10日の既存生成物を再利用"),
    Model("gemini36flash", "Gemini 3.6 Flash High", "Antigravity CLIでHigh版を指定して新規生成"),
    Model("gemini37flash", "Gemini 3.7 Flash High", "Antigravity CLIでHigh版を指定して新規生成"),
    Model("gemini38flash", "Gemini 3.8 Flash", "Antigravity CLIの画面でHigh表示を確認して新規生成"),
)

FABLE_MODELS = (
    Model("fable5", "Claude Fable 5", "2026年6月10日の既存生成物を再利用"),
    Model("fable51", "Claude Fable 5.1", "共通プロンプトだけを入力して新規生成"),
)

UI_COUNTS = {
    "gemini35flash": ((3, 0), (2, 0), (0, 0), (3, 7), (5, 0)),
    "gemini36flash": ((0, 0), (1, 0), (0, 0), (0, 7), (3, 0)),
    "gemini37flash": ((2, 0), (1, 0), (0, 0), (2, 8), (3, 0)),
    "gemini38flash": ((2, 0), (2, 0), (0, 0), (3, 8), (4, 0)),
    "fable5": ((8, 0), (2, 0), (1, 0), (3, 7), (4, 0)),
    "fable51": ((5, 2), (2, 1), (0, 0), (2, 8), (3, 1)),
}


def source_metrics(model: Model) -> tuple[int, int]:
    files = sorted((SOURCE_ROOT / model.key).glob("*.html"))
    return sum(path.stat().st_size for path in files), sum(
        len(path.read_text(encoding="utf-8", errors="replace").splitlines()) for path in files
    )


def require_artifacts(models: tuple[Model, ...]) -> None:
    missing = []
    for model in models:
        for slug, _title, _focus in CASES:
            for path in (
                SOURCE_ROOT / model.key / f"{slug}.html",
                IMAGE_ROOT / model.key / f"{slug}.webp",
            ):
                if not path.is_file():
                    missing.append(path.relative_to(ROOT))
    if missing:
        raise SystemExit("missing artifacts:\n" + "\n".join(map(str, missing)))


def card(model: Model, slug: str, title: str) -> str:
    local = f"/benchmark_sources/3d-model-benchmark/{model.key}/{slug}.html"
    source = f"https://github.com/kazuph/kazuph.github.io/blob/master{local}"
    image = f"/images/posts/3d-model-benchmark/{model.key}/{slug}.webp"
    return f'''<div class="v3d" data-src="{local}">
  <div class="v3d-head"><span>{model.label}</span><span class="v3d-links"><a href="{local}" target="_blank" rel="noopener">別タブ</a><a href="{source}" target="_blank" rel="noopener">source</a></span></div>
  <div class="v3d-stage"><img src="{image}" alt="{model.label}が生成した{title}の3Dモデル" loading="lazy"><button type="button" class="v3d-play"><span>▶ 3Dを起動</span></button></div>
</div>'''


def article_css(columns: int) -> str:
    return f'''<style>
.site-main > .inner:has(.v3d-wide) {{ max-width: 1800px; padding-inline: 12px; }}
.content-layout:has(.v3d-wide) {{ grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; }}
.v3d-grid {{ display: grid; grid-template-columns: repeat({columns}, minmax(0, 1fr)); gap: 12px; margin: 1.2rem 0 2rem; }}
.v3d {{ min-width: 0; border: 1px solid #d9d2c4; border-radius: 10px; overflow: hidden; background: #11141b; display: flex; flex-direction: column; }}
.v3d.active {{ grid-column: 1 / -1; }}
.v3d-head {{ display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 10px; background: #1b2029; color: #e8edf5; font: 0.78rem/1.35 ui-monospace, "SF Mono", Menlo, monospace; }}
.v3d-head > span:first-child {{ min-width: 0; overflow-wrap: anywhere; }}
.v3d-links {{ display: flex; gap: 10px; white-space: nowrap; }}
.v3d-head a {{ color: #62d6e8; text-decoration: underline; text-underline-offset: 0.16em; }}
.v3d-stage {{ position: relative; aspect-ratio: 4 / 3; background: #11141b; }}
.v3d-stage img {{ box-sizing: border-box; width: 100%; height: 100%; object-fit: cover; display: block; margin: 0; }}
.v3d-stage iframe {{ position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }}
.v3d-play {{ position: absolute; inset: 0; width: 100%; height: 100%; background: rgba(8,10,14,.35); border: 0; color: #fff; font: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; }}
.v3d-play span {{ background: rgba(12,16,24,.85); border: 1px solid #62d6e8; border-radius: 999px; padding: 8px 18px; }}
.v3d.active .v3d-play {{ display: none; }}
.v3d-close {{ background: transparent; border: 1px solid #62d6e8; border-radius: 6px; color: #62d6e8; font: inherit; padding: 2px 8px; cursor: pointer; white-space: nowrap; }}
.bench-note {{ background: #fff8d7; border: 1px solid #e7d27a; border-radius: 8px; padding: 12px 16px; line-height: 1.75; margin: 1.2rem 0; }}
.bench-table {{ box-sizing: border-box; width: 100%; max-width: 100%; table-layout: fixed; }}
.bench-table th, .bench-table td {{ vertical-align: top; overflow-wrap: anywhere; }}
@media (max-width: 1100px) {{ .v3d-grid {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }} }}
@media (max-width: 720px) {{
  .site-main > .inner:has(.v3d-wide) {{ padding-inline: 4px; }}
  .content-layout:has(.v3d-wide) {{ grid-template-columns: 1fr; gap: 8px; }}
  .v3d-grid {{ grid-template-columns: 1fr; }}
}}
</style>'''


def ui_table(models: tuple[Model, ...]) -> str:
    headers = "".join(f"<th>{model.label}</th>" for model in models)
    rows = []
    for index, (_slug, title, _focus) in enumerate(CASES):
        cells = []
        for model in models:
            buttons, sliders = UI_COUNTS[model.key][index]
            parts = [f"ボタン{buttons}"]
            if sliders:
                parts.append(f"スライダー{sliders}")
            cells.append(f"<td>{'、'.join(parts)}</td>")
        rows.append(f"<tr><td>{title}</td>{''.join(cells)}</tr>")
    return f'<table class="bench-table"><thead><tr><th>題材</th>{headers}</tr></thead><tbody>{"".join(rows)}</tbody></table>'


SCRIPT = '''<script>
(function () {
  var actives = [];
  function deactivate(card) {
    var iframe = card.querySelector('iframe');
    if (iframe) iframe.remove();
    var close = card.querySelector('.v3d-close');
    if (close) close.remove();
    card.classList.remove('active');
    actives = actives.filter(function (item) { return item !== card; });
  }
  document.querySelectorAll('.v3d-play').forEach(function (button) {
    button.addEventListener('click', function () {
      var card = button.closest('.v3d');
      while (actives.length >= 3) deactivate(actives[0]);
      var iframe = document.createElement('iframe');
      iframe.src = card.dataset.src;
      iframe.title = card.querySelector('.v3d-head > span').textContent + ' の3Dモデル';
      card.querySelector('.v3d-stage').appendChild(iframe);
      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'v3d-close';
      close.textContent = '✕ 閉じる';
      close.addEventListener('click', function () { deactivate(card); });
      card.querySelector('.v3d-head').appendChild(close);
      card.classList.add('active');
      actives.push(card);
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
})();
</script>'''


def build_article(*, models: tuple[Model, ...], path: Path, title: str, description: str, intro: str) -> None:
    require_artifacts(models)
    model_names = "、".join(model.label for model in models)
    total = len(models) * len(CASES)
    hero = f"/images/posts/3d-model-benchmark/{models[0].key}/trackball-split-keyboard.webp"
    metrics = "\n".join(
        f"<tr><td>{model.label}</td><td>{source_metrics(model)[0]:,} bytes</td><td>{source_metrics(model)[1]:,}行</td><td>{model.note}</td></tr>"
        for model in models
    )
    controls = ui_table(models)
    sections = []
    for index, (slug, case_title, focus) in enumerate(CASES, 1):
        cards = "\n".join(card(model, slug, case_title) for model in models)
        sections.append(f'''<h2>{index}. {case_title}</h2>
<p>{focus}を比べます。</p>
<div class="v3d-grid">{cards}</div>''')
    path.write_text(f'''---
layout: post
title: "{title}"
date: 2026-09-03
description: "{description}"
image: {hero}
social_image: {hero}
full_ai: true
full_ai_model: gpt-5.6-sol
---

{article_css(len(models))}
<div class="v3d-wide"></div>

<h2>はじめに</h2>
<p>{intro}</p>
<p>同じ5題材を単一HTMLのThree.jsシーンとして生成し、完成したページをそのまま埋め込みました。静止画だけで判断せず、「3Dを起動」から回転、ズーム、各モデルが追加した操作UIを試せます。</p>
<p>この記事は、各モデルによる既存成果物の生成と機械検証、gpt-5.6-solによる記事化までをAIで進めるFull AI方式で作成しています。</p>

<div class="bench-note"><strong>操作方法：</strong>各カードの「▶ 3Dを起動」を押すと埋め込みが起動します。ドラッグで回転、ホイールまたはピンチでズームできます。WebGLコンテキストを使いすぎないよう、同時起動は3件までです。</div>

<h2>比較条件</h2>
<ul>
  <li><strong>モデル：</strong>{model_names}</li>
  <li><strong>題材：</strong>5題材</li>
  <li><strong>掲載3D：</strong>5題材 × {len(models)}モデル = {total}件</li>
  <li><strong>形式：</strong>Three.jsを使う単一HTML。外部の画像、glTFなどのモデルアセットは不使用</li>
  <li><strong>必須操作：</strong>ドラッグ回転、ホイールズーム</li>
  <li><strong>確認日：</strong>2026年9月3日 JST</li>
</ul>

<h2>機械検証</h2>
<p>全{total}件を実ブラウザで開き、WebGL描画、ページエラー、ドラッグ回転、ホイールズームを確認しました。各モデルの5件はすべてレンダリングに成功しています。</p>
<table class="bench-table"><thead><tr><th>モデル</th><th>HTML合計</th><th>行数</th><th>生成物</th></tr></thead><tbody>{metrics}</tbody></table>

<h2>操作UIの数</h2>
<p>自動ドッグフーディングで検出したボタンとレンジスライダーの数です。数が多いほど優れているという指標ではありませんが、共通プロンプトから各モデルがどこまで操作機能を追加したかを確認できます。</p>
{controls}

{''.join(sections)}

<h2>再現方法</h2>
<p>共通プロンプトと検証スクリプトは、<a href="https://github.com/kazuph/kazuph.github.io/tree/master/scripts/3d_benchmark_2026" target="_blank" rel="noopener">scripts/3d_benchmark_2026/</a>にあります。</p>
<pre><code class="language-bash">node scripts/3d_benchmark_2026/dogfood_check.mjs http://127.0.0.1:4000 {' '.join(model.key for model in models)}
</code></pre>

<h2>おわりに</h2>
<p>{model_names}が同じ5題材から作った{total}件を、記事内で直接操作できる形にしました。初期画面だけでなく、視点を回し、各ボタンやスライダーを触ると、モデルごとの作り込みの差を確認できます。</p>
<p>Enjoy, spinning the models!</p>

{SCRIPT}
''', encoding="utf-8")
    print(f"wrote {path}")


def main() -> None:
    build_article(
        models=GEMINI_MODELS,
        path=ROOT / "_posts" / "2026-09-03-gemini35-to-38-flash-3d-model-benchmark.html",
        title="Gemini 3.5 Flashから3.8 Flash インタラクティブ3D生成ベンチマーク",
        description="Gemini 3.5 Flash、3.6 Flash、3.7 Flash、3.8 Flashを、同じ5題材のインタラクティブ3Dモデル20件で比較します。",
        intro="Gemini Flashの3.5から3.8までを、今度は平面図ではなく3D空間で並べます。4世代が同じ題材をどのような形、質感、操作UIへ展開したかを比較します。",
    )
    build_article(
        models=FABLE_MODELS,
        path=ROOT / "_posts" / "2026-09-03-fable5-vs-fable51-3d-model-benchmark.html",
        title="Claude Fable 5 vs Fable 5.1 インタラクティブ3D生成ベンチマーク",
        description="Claude Fable 5とFable 5.1を、同じ5題材のインタラクティブ3Dモデル10件で比較します。",
        intro="Fable 5とFable 5.1の差を、3D生成でも確かめます。バージョン番号は0.1の差ですが、部品数、初期構図、説明UI、操作機能は同じままとは限りません。",
    )


if __name__ == "__main__":
    main()
