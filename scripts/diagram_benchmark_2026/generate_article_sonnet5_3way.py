from __future__ import annotations

from pathlib import Path
from generate_benchmark_sources import CASES


ROOT = Path(__file__).resolve().parent
POST = ROOT.parent.parent / "_posts" / "2026-07-01-sonnet5-vs-opus48-vs-gemini35flash-diagram-benchmark.md"

FORMAT_LABELS = {
    "tikz": "TikZ",
    "matplotlib": "matplotlib",
    "svg": "SVG",
}

MODEL_LABELS = {
    "sonnet5": "Claude Sonnet 5",
    "opus48": "Claude Opus 4.8",
    "gemini35flash": "Gemini 3.5 Flash",
}

# leftmost first: Claude Sonnet 5 is the newly added column (user's own instruction)
MODEL_ORDER = ["sonnet5", "opus48", "gemini35flash"]

OG_IMAGE = "/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/bear-plush-ogp-sonnet5-3way.png"
PUBLIC_SOURCE_BASE = "/benchmark_sources/gemini35flash-vs-gpt54-diagram-benchmark"
PREV_URL = "/blog/2026/05/29/opus48-vs-gemini35flash-vs-gpt54-diagram-benchmark/"
ORIGINAL_URL = "/blog/2026/05/22/gemini35flash-vs-gpt54-diagram-benchmark/"

USER_PROMPT = """/goal 過去にある各LLMの作図バトルの記事を見つけて、それをコピーして最新の記事として作成してください。日付は7/1です。
Sonnet 5=君の成果を一番左にセットし、真ん中をOpus 4.8、右をGemini 3.5 flashの3列にしてください。
新規の作図は君=Sonnet 5だけです。図の数だけSonnet 5を指定したsubagentを使って一気にすべて作図させてください。すべての図を作成できれば完了ですが、
- モデルがSonnet 5以外
- 指定したツールを使わず代替として別のツールを使った
場合は、NGなので、その図は削除する必要があります。subagentが、必ず指定した行動をするように強制するプロンプトを使ってください。
提案に対して代替・劣化した瞬間killしてください。"""


def public_source_path(model: str, case_id: str, fmt: str) -> str:
    ext = {"tikz": "tex", "matplotlib": "py", "svg": "svg"}[fmt]
    return f"{PUBLIC_SOURCE_BASE}/{model}/{case_id}.{ext}"


def source_link(model: str, case_id: str, fmt: str) -> str:
    filename = f"{case_id}.{'tex' if fmt == 'tikz' else 'py' if fmt == 'matplotlib' else 'svg'}"
    return f'<a href="{public_source_path(model, case_id, fmt)}"><code>{filename}</code></a>'


def image_path(model: str, case_id: str, fmt: str) -> str:
    return f"/images/posts/gemini35flash-vs-gpt54-diagram-benchmark/{model}-{case_id}-{fmt}.webp"


def comparison_table(case_id: str, case_title: str, fmt: str) -> str:
    headers = "".join(f"      <th>{MODEL_LABELS[m]}</th>\n" for m in MODEL_ORDER)
    links = "".join(f"      <td>{source_link(m, case_id, fmt)}</td>\n" for m in MODEL_ORDER)
    images = "".join(
        f'      <td><img src="{image_path(m, case_id, fmt)}" '
        f'alt="{MODEL_LABELS[m]}が{FORMAT_LABELS[fmt]}で描いた{case_title}" loading="lazy"></td>\n'
        for m in MODEL_ORDER
    )
    return (
        '<table class="diagram-compare-table">\n'
        "  <thead>\n    <tr>\n" + headers + "    </tr>\n  </thead>\n"
        "  <tbody>\n"
        "    <tr>\n" + links + "    </tr>\n"
        "    <tr>\n" + images + "    </tr>\n"
        "  </tbody>\n"
        "</table>"
    )


def make_case_section(index: int, case: dict[str, object]) -> str:
    cid = case["id"]
    bullets = "\n".join(f"- {b}" for b in case["bullets"])
    parts = [
        f"## {index:02d}. {case['title']}",
        "",
        "### お題",
        "",
        bullets,
        "",
    ]
    for fmt in ("tikz", "matplotlib", "svg"):
        parts.extend(
            [
                f"### {FORMAT_LABELS[fmt]}",
                "",
                comparison_table(cid, str(case["title"]), fmt),
                "",
            ]
        )
    return "\n".join(parts)


def main() -> None:
    mandatory = [case for case in CASES if case["id"] in {
        "bear-plush",
        "elderly-living-room-tv",
        "vr-son-watched-by-mother",
        "hydraulic-piston",
        "robot-arm-7axis",
    }]
    ai_designed = [case for case in CASES if case not in mandatory]
    case_rows = []
    for case in CASES:
        source = "ユーザー指定" if case in mandatory else "AI設計"
        focus = {
            "bear-plush": "かわいさ、左右対称、部品バランス、質感差",
            "elderly-living-room-tv": "生活空間、人物と家具の関係、構図の自然さ",
            "vr-son-watched-by-mother": "2人物の視線、状況説明力、部屋の整理",
            "hydraulic-piston": "断面、部品ラベル、圧力の流れ",
            "robot-arm-7axis": "多関節、軸番号、回転方向、空間把握",
            "kalman-filter": "フィードバック、数式ラベル、信号線",
            "rag-pipeline": "取得と生成の分離、データフロー整理",
            "zero-trust-token-exchange": "境界越え、認証経路、複雑フロー",
            "bloch-sphere": "空間認識、数式、幾何配置",
            "michelson-interferometer": "光路、対称性、部品配置",
        }[case["id"]]
        case_rows.append(f"| {case['title']} | {source} | {focus} |")

    body = f"""---
layout: post
title: "Claude Sonnet 5 vs Claude Opus 4.8 vs Gemini 3.5 Flash 図解生成ベンチマーク"
date: 2026-07-01
description: "図解生成ベンチマークの2026-07-01更新版。新登場の Claude Sonnet 5 を一番左の列に追加し、真ん中に Claude Opus 4.8、右に Gemini 3.5 Flash を並べた3列比較。Sonnet 5 の30個(10題材×3形式)は、1図につき1subagentずつ・model固定・Read/Writeのみという強制プロンプトで生成しています。"
image: {OG_IMAGE}
social_image: {OG_IMAGE}
full_ai: true
full_ai_model: claude-sonnet-5
---

<div class="zenn-message">
  <p><strong>この記事について:</strong> これは <a href="{ORIGINAL_URL}">2026-05-22 の「Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク」</a>と<a href="{PREV_URL}">2026-05-29 の Claude Opus 4.8 追加版</a>の系譜を継ぐ更新版です。今回はマスター(ユーザー)から「一番左の列を Claude Sonnet 5(このセッション自身)の新規作図にし、真ん中を Claude Opus 4.8、右を Gemini 3.5 Flash にした3列で作れ」という指示を受け、GPT-5.4 列を Claude Sonnet 5 列に置き換えました。Opus 4.8 と Gemini 3.5 Flash の列は 2026-05-29 版の資産をそのまま流用し、<strong>新規に作図したのは Sonnet 5 の30個(10題材 × 3形式)だけ</strong>です。</p>
</div>

## 依頼内容

この記事は、以下のプロンプトをマスターから受けて作成しました。

> /goal 過去にある各LLMの作図バトルの記事を見つけて、それをコピーして最新の記事として作成してください。日付は7/1です。
> Sonnet 5=君の成果を一番左にセットし、真ん中をOpus 4.8、右をGemini 3.5 flashの3列にしてください。
> 新規の作図は君=Sonnet 5だけです。図の数だけSonnet 5を指定したsubagentを使って一気にすべて作図させてください。すべての図を作成できれば完了ですが、
> - モデルがSonnet 5以外
> - 指定したツールを使わず代替として別のツールを使った
>
> 場合は、NGなので、その図は削除する必要があります。subagentが、必ず指定した行動をするように強制するプロンプトを使ってください。
> 提案に対して代替・劣化した瞬間killしてください。

この指示に沿って、**Sonnet 5 列の30個は「1図につき1subagent」を model 固定(`sonnet`)で30体スポーンし、それぞれに「Read と Write 以外のツールは使うな、Bashで他のCLI(codex/agy/gemini/copilot等)を呼ぶな、他モデルの既存出力を読むな」と明記した強制プロンプトを渡して生成**させました。Opus 4.8 / Gemini 3.5 Flash の列は過去記事で確認済みの資産をそのまま再利用しています(この2列を新規に描き直すことは指示されていないため)。

## はじめに

このシリーズは、新しいモデルが出るたびに「同じお題・同じプロンプト・同じビルド手順」で図解を描かせて横並び比較する定点観測ベンチマークです。今回の3モデルは左から **Claude Sonnet 5 / Claude Opus 4.8 / Gemini 3.5 Flash** の順で並べています。

- **Claude Sonnet 5**: この作業セッションを主導する Claude Code(オーケストレーター)自身が、`Agent` ツールで題材×形式ぶん(30体)の subagent を model 固定で個別にスポーンし、各subagentが担当プロンプトから直接 source を書き起こしました
- **Claude Opus 4.8**: 2026-05-29版で生成済みの10題材 × 3形式 = 30個をそのまま流用
- **Gemini 3.5 Flash**: `agy` コマンド(Gemini CLI 系のローカルエージェントCLI)の print モードで2026-05-22に生成済みの10題材 × 3形式 = 30個をそのまま流用

この記事は、題材設計、コード生成、比較、記事化までをAIで進める **Full AI** 方式で書いています。

<style>
.diagram-hero img,
.diagram-compare-table img {{
  width: 100%;
  height: auto;
  display: block;
}}

.diagram-hero {{
  margin: 2rem 0;
}}

.diagram-hero figcaption {{
  margin-top: 0.75rem;
  color: #666;
  font-size: 0.95rem;
}}

.diagram-compare-table {{
  width: 100%;
  table-layout: fixed;
}}

.diagram-compare-table th,
.diagram-compare-table td {{
  width: 33.33%;
  vertical-align: top;
  text-align: center;
}}

.diagram-compare-table code {{
  font-size: 0.8rem;
  word-break: break-all;
}}
</style>

<figure class="diagram-hero">
  <img src="{OG_IMAGE}" alt="クマのぬいぐるみの TikZ 結果を、Claude Sonnet 5・Claude Opus 4.8・Gemini 3.5 Flash の3モデルで横並び比較した画像" loading="eager">
  <figcaption>冒頭画像と OGP には、シリーズの顔であるクマのぬいぐるみ題材の TikZ 比較を Sonnet 5 / Opus 4.8 / Gemini 3.5 Flash の3列で並べた画像を使っています。</figcaption>
</figure>

## 比較条件

- **モデル**: Claude Sonnet 5 / Claude Opus 4.8 / Gemini 3.5 Flash
- **形式**: TikZ / matplotlib / SVG
- **題材**: 10題材
- **総数**: 10題材 × 3形式 × 3モデル = **90個**
- **今回の新規生成分**: Claude Sonnet 5 の 10題材 × 3形式 = **30個**(1図1subagent、model固定、Read/Writeのみで生成)
- **流用分**: Claude Opus 4.8(2026-05-29生成)30個 + Gemini 3.5 Flash(2026-05-22生成)30個
- **確認日**: 2026-07-01 JST(Opus 4.8 分は2026-05-29、Gemini 3.5 Flash 分は2026-05-22)

題材のうち 5 つはユーザー指定です。残り 5 つは比較差が出やすいように AI で設計しました。過去の題材は1つも削除していません。

## 題材一覧

| 題材 | 出題元 | 見たい点 |
|---|---|---|
{chr(10).join(case_rows)}

## 形式

| 形式 | 見たい点 | ビルド方法 |
|---|---|---|
| TikZ | 数式や工学図の厳密さ、構文の安定性 | `xelatex -> pdftoppm -> cwebp` |
| matplotlib | 手続き的に図を組み立てる力、部品配置の堅さ | `python -> png -> cwebp` |
| SVG | 生の座標設計とレイアウト感覚 | `rsvg-convert -> png -> cwebp` |

## ベンチマークケースについて

- ユーザー指定ケース: {", ".join(case["title"] for case in mandatory)}
- AI設計ケース: {", ".join(case["title"] for case in ai_designed)}

共通チェック項目は `scripts/diagram_benchmark_2026/manifest.yml` に置いています。お題のプロンプトは `scripts/diagram_benchmark_2026/prompts/` にあります(3モデル共通)。

source 欄は単なるパス文字列ではなく、サイト上でそのまま開ける公開 source へのリンクにしています。

## 実行方法(Sonnet 5 列の強制プロンプト運用)

Sonnet 5 列の30個は、オーケストレーター(この作業セッションのメインエージェント)が `Agent` ツールで題材×形式の組み合わせぶん(10題材 × 3形式 = 30体)の subagent を個別に起動し、それぞれに次を明記したプロンプトを渡して生成させました。

- **モデル固定**: `Agent` 呼び出し側で `model: "sonnet"` を明示指定(subagentの自己申告に頼らず、オーケストレーター側の呼び出しパラメータでモデルを強制)
- **使用ツールの制限**: 「Read でお題プロンプトを読み、Write で source を保存する以外のツールは使うな」と明記
- **代替手段の禁止**: 「Bashは一切使用禁止。`codex exec` / `agy` / `gemini` / `copilot` などの外部CLIやMCPツール(drawio等)、WebFetch/WebSearchで代わりに描かせることを完全禁止。違反が発覚した時点でその成果物は削除する」と明記
- **他モデル出力の参照禁止**: 「既存の opus48 / gemini35flash / gpt54 / gpt55 / fable5 ディレクトリ以下を読んだりコピーしたりするな。ゼロから自分で設計しろ」と明記

```bash
# Sonnet 5 の source を画像へ(1図1subagentで生成した30個)
scripts/diagram_benchmark_2026/render_all.sh sonnet5

# 流用分(Opus 4.8 / Gemini 3.5 Flash)は過去記事の生成物をそのまま使用
scripts/diagram_benchmark_2026/render_all.sh opus48
scripts/diagram_benchmark_2026/render_all.sh gemini35flash
```

### 生成時に起きたこと(記録)

定点観測なので、生成過程でつまずいた点も正直に記録しておきます。

- **subagent の同時起動数上限**: 30体を1メッセージで一気に起動しようとしたところ、環境側のpane同時起動数の上限(概ね15体前後)に達し、後半のsubagentが `respawn pane failed` で起動失敗しました。オーケストレーターは、完了済みsubagentへ `shutdown_request` を送ってpaneを解放しながら、失敗分を数体ずつ再送信する形で30体すべての起動と完了を確認しています
- **Claude Sonnet 5**: ブロッホ球のTikZで、独自マクロ名 `\\tmpX1` / `\\tmpY1`(TeXの制御綴りは英字のみで数字を含められないため `\\tmpX` + 文字 `1` に分割される既知の罠)と、`\\SphR and \\EqMinorR` のようにマクロ直後に `and` キーワードを続けた際にマクロが後続スペースを飲み込んで `3and ...` になる罠の、計2箇所でコンパイルエラーが発生しました。いずれも描画内容には無関係な構文修正(マクロ名の変更、`{{}}` によるスペース保持)をオーケストレーター側で1回ずつ行い、コンパイルを通しています
- 上記以外の29個は、各subagentがRead→(自身の知識で設計)→Writeの一発生成のみでビルドが通りました

## 出力一覧

{chr(10).join(make_case_section(i + 1, case) for i, case in enumerate(CASES))}

## 現時点の見どころ

- かわいいイラスト系では、装飾を盛る方向に出るか、破綻を避けて記号寄りに出るかが見やすいです。Sonnet 5 がどちらに寄るかも、左列で並べて見られます
- 機械・制御系では、構造の整列とラベルの読みやすさで差が出ます
- 数学・物理系では、空間把握と数式周辺の配置の上手さが見やすいです

## 参考

- 前回記事(3モデル版): [Claude Opus 4.8 vs Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク]({PREV_URL})(確認日: 2026-05-29)
- 元記事(2モデル版): [Gemini 3.5 Flash vs GPT-5.4 図解生成ベンチマーク]({ORIGINAL_URL})(確認日: 2026-05-22)
- さらに前の比較記事: https://zenn.dev/kazuph/articles/claude-opus-tikz-comparison (確認日: 2026-05-22)

## おわりに(人間コメント)

Gemini 3.5 Flashが最強！ってのはそうなのですが、OpusよりもSonnetさんの方が視覚系タスクが優秀そうだとわかりました。
はぁ、早くOpus 4.9出ないかなぁ・・・。
"""
    POST.write_text(body, encoding="utf-8")
    print(f"wrote {POST}")


if __name__ == "__main__":
    main()
