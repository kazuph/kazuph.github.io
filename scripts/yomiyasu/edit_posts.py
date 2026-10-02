#!/usr/bin/env python3
"""Apply or verify the editorial changes reviewed on 2026-10-02.

The replacements below are individually reviewed edits, not a general rewriter.
Default: verify only. --apply writes only the 19 reviewed historical posts.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
import subprocess

BASE = '5751b3916a0dc3ae61b43b62d598dade8c385a38'
SKILL_COMMIT = 'f03aecd9c4c4a69e229f3848ecba66c3871f734c'
ROOT = Path(__file__).resolve().parents[2]

def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args], text=True)

names = git('ls-tree', '--name-only', BASE, '_posts/').splitlines()
originals = {name: git('show', BASE + ':' + name) for name in names}
edits = []

def change(pattern, before, after, reason, count=1):
    matches = [p for p in names if Path(p).match('_posts/' + pattern)]
    if len(matches) != 1:
        raise ValueError(('ambiguous path', pattern, matches))
    path = matches[0]
    if originals[path].count(before) != count:
        raise ValueError(('source mismatch', path, before))
    edits.append(dict(path=path, before=before, after=after, reason=reason, count=count))

def common(before, after, reason):
    for path, text in sorted(originals.items()):
        if 'full_ai: true' in text.split('---', 2)[1] and before in text:
            change(Path(path).name, before, after, reason, text.count(before))

common('この記事は、題材設計、コード生成、比較、記事化までをAIで進める **Full AI** 方式で書いています。', '題材設計、コード生成、比較、記事作成までをAIで行いました。', '重複した執筆方式の説明を整理')
common('source 欄は単なるパス文字列ではなく、サイト上でそのまま開ける公開 source へのリンクにしています。', 'source欄のリンクから、公開したソースをこのサイトで直接開けます。', '不要な否定対比を整理')
common('シリーズの顔であるクマのぬいぐるみ題材の TikZ 比較', 'シリーズで継続して使っているクマのぬいぐるみ題材のTikZ比較', '比喩を具体的な説明に変更')
common('定点観測なので、生成過程でつまずいた点も正直に記録しておきます。', '継続して比較できるよう、生成中に起きた問題も記録します。', '自己評価を省き記録内容を明記')
common('この記事は、各モデルによる既存成果物の生成と機械検証、gpt-5.6-solによる記事化までをAIで進めるFull AI方式で作成しています。', '各モデルによる成果物の生成と機械検証、gpt-5.6-solによる記事作成までをAIで行いました。掲載する成果物は既存のものを使っています。', '生成と記事作成の担当、既存成果物の利用を整理')
common('自動ドッグフーディングで検出したボタンとレンジスライダーの数です。数が多いほど優れているという指標ではありませんが、共通プロンプトから各モデルがどこまで操作機能を追加したかを確認できます。', '自動ドッグフーディングで検出したボタンとレンジスライダーの数です。数の多さは品質の指標ではありません。共通プロンプトに対して各モデルが追加した操作機能を確認できます。', '品質を保証しないという制約を残して文を分割')

p = '2026-05-08-*'
change(p, '足元を基準に配置し、余った空間は頭の上へ逃がします。', '足元を基準に配置し、余白は頭の上に残します。', '配置を具体的に説明')
change(p, '余白は頭上に逃がし、ジャンプはサイズ差ではなく上下位置の変化として残します。', '余白は頭上に残し、ジャンプはサイズ差ではなく上下位置の変化として残します。', '比喩動詞のみ変更し対比は保持')
change(p, '動きそのものが壊れている場合は再生成が必要です。', '動きそのものが意図と異なる場合は再生成が必要です。', '直前の向きの例に対応させて説明')
change(p, '生成をやり直すと泥沼化しやすいため、', '生成をやり直すと修正が長引きやすいため、', '比喩の負担感を保持')
change(p, '偶然の手足や小物に引っ張られにくくします。', '手足や小物による検出値のばらつきの影響を受けにくくします。', '統計処理の説明を具体化')

p = '2026-05-16-*'
change(p, 'まっさらな状態からのrelease buildはRust化後のほうが長くなりました。', 'クリーンな状態からのrelease buildはRust化後のほうが長くなりました。', 'ビルド条件の表現を整理')
change(p, 'ここは素直に重くなっています。', 'その分ビルドに時間がかかっています。', '処理時間の説明に変更')
change(p, 'parse、TypeScriptの変換、symbol処理、出力、minifyがまとめて通ります。', 'parse、TypeScriptの変換、symbol処理、出力、minifyをまとめて実行します。', '処理の動作を明記')
change(p, 'さすがに結論に入れるには怪しいので除外しました。', '測定値を結論の根拠にするには信頼性が足りないため、除外しました。', '除外理由を明記')
change(p, '実プロジェクトでまず効きそうなbuildと変換処理では、', '実プロジェクトでまず効果が期待できるbuildと変換処理では、', '期待であることを保って比喩を整理')

p = '2026-05-22-*'
change(p, '今回はそれをそのまま延長せず、`Gemini 3.5 Flash` と `GPT-5.4` の2モデルに絞って、新しく回し直します。', '今回はその比較をそのまま続けず、`Gemini 3.5 Flash` と `GPT-5.4` の2モデルに絞って、新たに実行します。', '比較を実行することを明記')
change(p, '比較できる土台を作りました。', '比較できる構成を作りました。', '比較ページの構成を説明')

p = '2026-05-24-*'
change(p, 'それを WebGPU 側の質感へ持っていきます。', 'それをWebGPUで描画し、ガラスの質感を加えます。', 'レンダリングの説明を具体化')

p = '2026-05-27-*'
change(p, 'TUI の再描画から離れて、macOS 側は AppKit で直接描画する構成へ変えました。', 'TUIでの再描画をやめ、macOS側はAppKitで直接描画する構成へ変えました。', '構成変更を直接記述')
change(p, 'Cocoa/AppKit に直接乗ったほうがさらに薄くできます。', 'Cocoa/AppKitを直接使うほうが、さらに構成を小さくできます。', '依存する構成を説明')
change(p, 'ここでの Zig は、UI を書く主役ではありません。', 'ここでZigを使っているのは、UIを書くためではありません。', '役割の比喩を整理')
change(p, 'ひとつの `build.zig` に閉じ込めるための道具です。', 'ひとつの `build.zig` にまとめるために使っています。', 'ビルド手順の役割を説明')
change(p, 'ここで大事なのは、Zig だけが小ささの理由ではないことです。', 'Zigだけがバイナリの小ささの理由ではない点が大事です。', '重要性と否定の意味を保持')
change(p, 'Objective-C のコードも、Zig が魔法のように小さくしているわけではなく、最終的には clang/LLVM でコンパイルされます。', 'Objective-Cのコードは、Zig自体が特別に小さくしているわけではありません。最終的にはclang/LLVMでコンパイルされます。', '誤解を訂正する否定を残して分割')
change(p, '余計な runtime や接続層を増やさずにビルド手順へ閉じ込められることです。', '余計なruntimeや接続層を増やさずにビルド手順へまとめられることです。', '不要な比喩を整理')
change(p, 'ここで効いているのは、Zig が C/Objective-C をプロジェクトの普通の材料として扱える点です。', 'ZigがC/Objective-Cを通常のソースとして扱える点が役立ちました。', '開発上の利点を具体化')
change(p, '余計な runtime を増やさずに再現可能なビルド手順へ閉じ込められることでした。', '余計なruntimeを増やさずに再現可能なビルド手順へまとめられることでした。', '不要な比喩を整理')
change(p, '短すぎる chunk は前後へ吸収する後処理を入れました。', '短すぎるchunkは前後につなげる後処理を入れました。', '分割後の処理を説明')

p = '2026-05-28-*'
change(p, 'Agent が勝手にこれを打ちます。', 'Agentがその指示に従ってこのコマンドを実行します。', '直前の設定指示と動作を対応')
change(p, '送信側で潰しています。', '送信側で防いでいます。', '問題への対策を説明')
change(p, 'pane の中で動いていた Claude Code や Codex は当然死にます。', 'paneの中で動いていたClaude CodeやCodexは終了します。', 'プロセス終了を直接記述')
change(p, '復元機能自体はありますが、雑にやると事故ります。', '復元機能自体はありますが、復元先を誤ることがあります。', '後続のセッション誤選択の例に対応')
change(p, '3 枚とも同じ会話に潰れる。', '3枚とも同じ会話を開いてしまいます。', '復元失敗の状態を説明')
change(p, 'Agent 同士の宛先が壊れません。', 'Agent同士が指定する宛先は変わりません。', 'pane IDの対応が不変であることを説明')

p = '2026-05-29-*'
change(p, '元記事と同じプロンプトから一発生成したものです。', '元記事と同じプロンプトから一度で生成したものです。', '生成回数を明記')

p = '2026-06-10-fable5-vs-gemini35flash-vs-gpt55-diagram*'
change(p, '従来の10題材ではカバーできていなかった軸を狙っています。', '従来の10題材では確認できていなかった点を比較します。', '評価対象を直接記述')
change(p, '一番左の列に迎え、', '一番左の列に追加し、', 'モデル追加を直接記述')

p = '2026-06-10-fable5-vs-gemini35flash-vs-gpt55-3d*'
change(p, '次に気になるのは空間です。', '次は立体的な空間の表現を比較します。', '比較対象を明記')
change(p, 'この記事は題材設計、コード生成、検証、記事化までをAIで進める <strong>Full AI</strong> 方式で書いています。', '題材設計、コード生成、検証、記事作成までをAIで行いました。', '重複した執筆方式の説明を整理')
change(p, 'という Three.js の古典的な罠です。', 'というThree.jsのモジュール解決の問題です。', '直前のimport失敗を指す表現に変更')
change(p, '質感とUIのリッチさが武器。', '質感の表現とUIの充実度が強みです。', '講評の評価は保持して比喩を整理')
change(p, '3モデルで頭ひとつ抜けています。', '3モデルの中で特に優れています。', '評価の強さを保持')

p = '2026-06-11-*'
change(p, '実際の開発ループに乗せたときの到達点', '実際に修正を繰り返したときの完成度', '反復改善の意味を説明')
change(p, '食べ物の周りに礼儀正しいリングを作って待ちます。', '食べ物の周りに輪を作って待ちます。', '群れの配置の擬人化を削除')
change(p, '放っておいても干渉模様が生き続けます。', '操作しなくても干渉模様が変化し続けます。', 'シェーダーの動作を直接記述')
change(p, 'マテリアルの <code>onBeforeCompile</code> で風揺れも注入。', 'マテリアルの <code>onBeforeCompile</code> で風による揺れも加えています。', '描画処理を説明')

p = '2026-06-30-*'
change(p, 'まず時計を NTP サーバーの IP アドレスへ直接当てて復旧する方が早いことがあります。', 'NTPサーバーのIPアドレスを直接指定して、まず時計を直す方が早いことがあります。', '時計をアドレスへ当てるという主述の不整合を修正')
change(p, 'ここで重要なのは、NTP 通信そのものが失敗しているのか、NTP サーバー名の DNS 解決だけが失敗しているのかを分けることです。', 'NTP通信そのものの失敗と、NTPサーバー名のDNS解決の失敗を切り分けることが重要です。', '評価を述語に残して整理')
change(p, 'DNS が壊れている時は、', 'DNSで名前解決できない時は、', 'ログに記録された失敗の範囲を明記')
change(p, 'UDP/123 の NTP 通信は生きていて、', 'UDP/123のNTP通信は成功していて、', '通信の結果を直接記述')
change(p, '差分は 1 ミリ秒未満まで詰まりました。', '差分は1ミリ秒未満まで縮まりました。', '計測値の変化を説明')
change(p, 'DNS が壊れていて `sudo sntp -sS ntp.nict.jp` が', 'DNSで名前解決できず `sudo sntp -sS ntp.nict.jp` が', '具体的なエラー状態に限定')
change(p, 'NTP 通信は生きています。', 'NTP通信は成功しています。', '通信の結果を直接記述')

p = '2026-07-01-karukan*'
change(p, '導入作業、ビルド、辞書とモデルの取得、インストール済みサーバーの実動作確認までを AI が実環境で実行し、その結果を Full AI 記事として整理しています。', 'AIが実環境で導入作業、ビルド、辞書とモデルの取得、インストール済みサーバーの動作確認を行いました。この記事にはその結果をまとめています。', '動作主と作業内容を分けて記述')
change(p, 'CPU 推論に寄せています。', 'CPU推論を使っています。', '実装の選択を直接記述')
change(p, 'つまり、いまの実装は「Metal を使っていない」のではなく、「GPT-2 では Metal を使わない方に倒している」状態です。', 'つまり、現行の実装ではGPT-2の問題を避けるため、意図的にMetalを使わないようにしています。', '判断の理由を保持して否定対比と比喩を整理')
change(p, '音声入力でよくある「同音異義語が文脈に合わない」問題には効く可能性があります。', '音声入力でよくある「同音異義語が文脈に合わない」問題の改善に役立つ可能性があります。', '可能性の強さを保って効果を説明')
change(p, 'Karukan をそのまま貼るより、', 'Karukanをそのまま組み込むより、', 'ソフトウェアの組み込みを説明')

p = '2026-07-01-sonnet*'
change(p, 'オーケストレーター(この作業セッションのメインエージェント)が', 'この作業セッションのメインエージェントが', '同義の括弧説明を統合')

p = '2026-07-31-*'
change(p, 'この記事は題材選定、コード生成、比較、記事化までをAIで進める **Full AI** 方式で書いています。', '題材選定、コード生成、比較、記事作成までをAIで行いました。', '重複した執筆方式の説明を整理')
change(p, 'マスターから Cursor Grok 4.5 と Claude Opus 5 の一騎打ち、さらに既存の Gemini 3.5 Flash を3列目に足す指示を受け、', 'ユーザーからCursor Grok 4.5とClaude Opus 5を比較し、既存のGemini 3.5 Flashを3列目に追加する指示を受け、', '引用外の作業説明を整理')
change(p, '結論から言うと、今回の並びでは **Claude Opus 5 が明らかに圧勝** でした。', '今回の比較では、Claude Opus 5が明らかに圧勝でした。', '前置きと太字だけを削り評価は保持')
change(p, 'Gemini 3.5 Flash を3列目に据えた', 'Gemini 3.5 Flashを3列目に追加した', '表の配置を直接記述')

p = '2026-09-03-fable5-vs-fable51-diagram*'
change(p, 'Fable 5.1が同じ共通プロンプトから新しく生成した36件を隣に置きます。', 'Fable 5.1が同じ共通プロンプトから新しく生成した36件と横並びで比較します。', '比較の動作を明記')
change(p, 'この記事は、Fable 5.1によるソース生成と機械検証、gpt-5.6-solによる記事化までをAIで進めるFull AI方式で作成しています。', 'ソース生成と機械検証はFable 5.1、記事作成はgpt-5.6-solが担当しました。', '工程ごとの担当を明記')

p = '2026-09-03-gemini35-to-38-vs-opus5-diagram*'
change(p, '比較相手には、2026年7月31日のベンチマークで生成したClaude Opus 5を置いています。', '比較には、2026年7月31日のベンチマークでClaude Opus 5が生成した結果を使っています。', 'モデルそのものと生成結果を区別')
change(p, '同じお題を同じ形式で描いた結果を並べると、Flashが世代ごとにどう変わったか、そしてOpus 5とどこで差が出るかを画像そのもので確認できます。', '同じ題材を同じ形式で描いた画像を並べ、Flash各世代の違いとOpus 5との違いを確認できます。', '比較対象を明記して重複を整理')
change(p, 'この記事は、既存プロンプトの再利用、各モデルによるソース生成、機械検証、記事化までをAIで進めるFull AI方式で作成しています。', '既存プロンプトの再利用、各モデルによるソース生成、機械検証、記事作成までをAIで行いました。', '重複した執筆方式の説明を整理')
change(p, '見た目の順位は機械検証から捏造せず、180枚のレンダリング結果と公開ソースをそのまま掲載します。', '機械検証の結果だけで見た目の順位を決めず、180枚のレンダリング結果と公開ソースをそのまま掲載します。', '評価方法の制約を残して強い言い回しを整理')

p = '2026-09-24-*'
change(p, '性格の違う6つの課題で比べました。', '種類の異なる6つの課題で比較しました。', '課題の種類を説明')
change(p, 'Opus は開始2分で、インデックス追加、移動距離のキャッシュ、近い椅子を優先する配車をまとめて入れる速攻型でした。', 'Opusは開始2分で、インデックス追加、移動距離のキャッシュ、近い椅子を優先する配車をまとめて実装しました。', '性格付けを具体的な実装と時間に変更')
change(p, '最後まで「正しさ」を固め切れませんでした。', '最後まで正しく動く実装を完成させられませんでした。', '不合格の評価を保持して状態を説明')
change(p, '配車の総移動時間を最小にするアルゴリズムで伸ばしました。', '配車の総移動時間を最小にするアルゴリズムでスコアを伸ばしました。', '前後に明記されたスコアを目的語に補足')
change(p, 'スコアの天井を追うより「落ちない実装を出す」判断をしたほうが勝った、という結果です。', '最高スコアを追うよりも、合格する実装の提出を優先した判断が勝利につながった結果です。', '評価の因果と比重を保持して比喩を整理')
change(p, 'それでも、絵本の土台である日本語が崩れていては成り立ちません。', 'それでも、日本語として意味が通じなければ絵本として成り立ちません。', '言語表現への評価を直接記述')
change(p, 'スコアの天井よりも「落ちない実装を最後に出す」判断が効いた勝負でした。', '最高スコアよりも、合格する実装を最後に提出する判断が勝敗を分けた勝負でした。', '比喩を実際の合否判断に変更')

# These blocks are evidence or attributed speech, not editorial prose.
PROTECTED = {
    'frontmatter': r'\A---\n[\s\S]*?\n---',
    'fences': r'(?m)^```[^\n]*\n[\s\S]*?^```[^\n]*',
    'pre': r'<pre\b[^>]*>[\s\S]*?</pre>',
    'scripts': r'<script\b[^>]*>[\s\S]*?</script>',
    'styles': r'<style\b[^>]*>[\s\S]*?</style>',
    'svg': r'<svg\b[^>]*>[\s\S]*?</svg>',
    'html_tables': r'<table\b[^>]*>[\s\S]*?</table>',
    'markdown_tables': r'(?m)^\|.*$',
    'quoted_lines': r'(?m)^\s*>.*$',
    'blockquotes': r'<blockquote\b[^>]*>[\s\S]*?</blockquote>',
    'human_reviews': r'<div class="bench-review human">[\s\S]*?</div>',
    'stories': r'<div class="story">[\s\S]*?</div>',
    'inline_code': r'`[^`\n]+`|<code\b[^>]*>[\s\S]*?</code>',
    'prompts': r'(?m)^### お題\n[\s\S]*?(?=^### |^## |\Z)',
    'human_end': r'(?m)^## おわりに\(人間コメント\)[\s\S]*\Z',
    'human_questions': r'(?m)^### .*\？?\?$',
    'human_followup': r'(?m)^\(追記\) 直しというか、.*$',
    'attributed_gemini': r'<h2[^>]*>おまけ: 当事者 Gemini 3\.5 Flash による総評</h2>[\s\S]*?(?=<h2|\Z)',
    'urls': r'https?://[^\s<>"\)]+',
    'numeric_literals': r'\d+(?:[.,]\d+)*',
}

def protected_check(before, after, path):
    for label, pattern in PROTECTED.items():
        if re.findall(pattern, before) != re.findall(pattern, after):
            raise ValueError(('protected content changed', path, label))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--report-dir', type=Path)
    args = parser.parse_args()
    grouped = defaultdict(list)
    for edit in edits:
        grouped[edit['path']].append(edit)
    if len(grouped) != 19 or len(edits) != 89:
        raise ValueError(('unexpected review scope', len(grouped), len(edits)))
    pending = {}
    for path, rows in grouped.items():
        expected = originals[path]
        for row in rows:
            if expected.count(row['before']) != row['count']:
                raise ValueError(('overlapping edits', path, row['before']))
            expected = expected.replace(row['before'], row['after'])
        protected_check(originals[path], expected, path)
        current = (ROOT / path).read_text(encoding='utf-8')
        allowed = (originals[path], expected) if args.apply else (expected,)
        if current not in allowed:
            raise ValueError(('unexpected working copy; no files written', path))
        pending[path] = expected
    for path in set(originals) - set(grouped):
        if (ROOT / path).read_text(encoding='utf-8') != originals[path]:
            raise ValueError(('unreviewed article changed', path))
    if args.apply:
        for path, text in pending.items():
            (ROOT / path).write_text(text, encoding='utf-8')
    report = dict(base_commit=BASE, skill_commit=SKILL_COMMIT,
                  reviewed_posts=len(originals), changed_posts=len(grouped),
                  replacements=len(edits), protected_checks=list(PROTECTED),
                  unchanged_posts=sorted(set(originals)-set(grouped)), edits=edits)
    if args.report_dir:
        args.report_dir.mkdir(parents=True, exist_ok=True)
        (args.report_dir / 'review.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        for side, texts in [('before', originals), ('after', pending)]:
            folder = args.report_dir / side
            folder.mkdir(exist_ok=True)
            for path in grouped:
                (folder / Path(path).name).write_text(texts[path], encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'edits'}, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
