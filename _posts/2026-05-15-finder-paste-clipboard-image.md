---
layout: post
title: "Finderで画像をCmd+V保存できるようにする"
date: 2026-05-15
description: "Finder上で画像クリップボードをCmd+Vしたら、そのフォルダにPNGとして保存するKarabiner連携メモ。"
---

<img src="/images/posts/finder-paste-clipboard-image/finder-paste-clipboard-image-demo.gif" alt="Finderで画像クリップボードをCmd+VしてPNGとして保存するデモ" width="800" height="476" loading="eager" decoding="sync">

<div class="zenn-message zenn-message-alert">
  <p><strong>注意:</strong> この記事の方法で「Finder に画像を <code>Cmd+V</code> して PNG として保存する」ことはできます。ただし Karabiner で Finder の <code>Cmd+V</code> を横取りするため、ファイルや画像以外のペーストに影響することがあります。普段の Finder ペーストを確実に守りたい場合は、別ショートカットや Quick Action に分ける方が安全です。</p>
</div>

## はじめに

スクリーンショットや生成画像を扱っていると、画像をコピーしたあとに Finder のフォルダへそのまま貼り付けたくなります。

でも macOS の Finder では、画像データそのものを `Cmd+V` しても、その場に PNG ファイルを作れません。毎回 Preview や画像編集アプリを開くのは、少し手間がかかります。

そこで、Finder が前面にあるときだけ `Cmd+V` を拾って、クリップボードの画像を開いているフォルダに `clipboard-image-YYYYMMDD-HHMMSS.png` として保存するようにしました。

## 追記: 普通のファイル貼り付けに影響することがある

この記事を書いたあと、最初の実装が通常のファイル貼り付けにも反応することに気づきました。Finder でファイルをコピーして別フォルダへ `Cmd+V` したときも、画像保存スクリプトが先に動いてしまいます。

特に画像ファイルをコピーしている場合、pasteboard には「ファイル参照」と「画像として読めそうなデータ」が同時に見えることがあります。その状態で `NSImage(pasteboard:)` を先に読むと、ユーザーとしてはファイルを移したいだけなのに、ファイルコピーではなく PNG 保存として扱われてしまいます。

もうひとつの問題は、画像以外を貼り付ける場合の fallback です。画像ではないと判断したあとに `Cmd+V` を送り直すだけでは、Karabiner の同じルールが再び反応し、Finder の通常のペーストを実行できません。画像保存用の `Cmd+V` が、Finder 標準の `Cmd+V` を妨げていました。

## どうやって

最短構成は、Karabiner-Elements の Finder 限定ルールと、小さな zsh スクリプトの組み合わせです。

まず、保存処理を `~/dotfiles/bin/finder-paste-clipboard-image` に置きました。Finder の前面ウィンドウのディレクトリを AppleScript で取り、Swift から `NSPasteboard` を読んで PNG として書き出します。

```zsh
finder_dir=$(/usr/bin/osascript <<'APPLESCRIPT'
tell application "Finder"
  if (count of Finder windows) > 0 then
    POSIX path of (target of front Finder window as alias)
  else
    POSIX path of (desktop as alias)
  end if
end tell
APPLESCRIPT
)
```

画像が取れたら、同じフォルダに時刻付きの PNG を保存します。ただし、pasteboard にファイル参照が含まれている場合は画像保存に進まず、Finder 標準の Paste メニューへ戻します。

```swift
let pasteboard = NSPasteboard.general

func fileURLs(from pasteboard: NSPasteboard) -> [URL] {
    if let objects = pasteboard.readObjects(forClasses: [NSURL.self], options: nil) as? [NSURL] {
        return objects.map { $0 as URL }.filter(\.isFileURL)
    }
    return []
}

let sourceURLs = fileURLs(from: pasteboard)
if !sourceURLs.isEmpty {
    exit(2)
}

if let pngData = pasteboard.data(forType: .png) {
    try pngData.write(to: outputURL, options: .atomic)
    exit(0)
}

if let image = NSImage(pasteboard: pasteboard),
   let data = pngData(from: image) {
    try data.write(to: outputURL, options: .atomic)
    exit(0)
}
```

先に file URL を確認することが重要です。Finder でファイルをコピーしたときも、pasteboard に画像として読めるデータが入ることがあります。特に画像ファイルを複数選択していると、`NSImage(pasteboard:)` で 1 枚の画像として読み取れてしまいます。

改善版では、ファイル参照が含まれている場合は画像保存に進まないようにしています。そこでスクリプトを終えて Finder 標準の Paste メニューへ戻す方針です。ただし `Cmd+V` 自体を Karabiner で横取りしている以上、環境や Finder の状態によっては通常のペーストに影響する可能性があります。

次に、`~/.config/karabiner/karabiner.json` の各 profile へ、Finder が前面のときだけ動く `Cmd+V` ルールを追加しました。

```json
{
  "description": "Finder: Cmd+V saves clipboard image into the open folder",
  "manipulators": [
    {
      "conditions": [
        {
          "bundle_identifiers": ["^com\\.apple\\.finder$"],
          "type": "frontmost_application_if"
        }
      ],
      "from": {
        "key_code": "v",
        "modifiers": {
          "mandatory": ["command"],
          "optional": ["any"]
        }
      },
      "to": [
        {
          "shell_command": "~/dotfiles/bin/finder-paste-clipboard-image"
        }
      ],
      "type": "basic"
    }
  ]
}
```

Karabiner は、Finder が前面のときだけ `Cmd+V` に応じてスクリプトを呼び出します。画像かファイルかの判定と、通常のペーストに戻すかどうかの処理は、Karabiner の JSON ではなくスクリプト側で行います。JSON に記述する処理を少なくすると、複数 profile に同じルールを入れても挙動がずれにくくなります。

画像でもファイル参照でもないものを貼り付けた場合は、スクリプトから Finder のペーストメニューを直接クリックします。`Cmd+V` を送り直すと Karabiner のルールが再び反応するため、メニュー項目を使います。

```zsh
fallback_paste() {
  /usr/bin/osascript <<'APPLESCRIPT'
tell application "System Events"
  tell process "Finder"
    tell menu 1 of menu bar item 4 of menu bar 1
      if exists menu item "ペースト" then
        click menu item "ペースト"
      else if exists menu item "Paste" then
        click menu item "Paste"
      end if
    end tell
  end tell
end tell
APPLESCRIPT
}
```

## 確認方法

設定を入れたあと、Karabiner の JSON とスクリプトを確認しました。

```console
$ zsh -n ~/dotfiles/bin/finder-paste-clipboard-image

$ karabiner_cli --lint-complex-modifications ~/.config/karabiner/karabiner.json
~/.config/karabiner/karabiner.json: ok
```

最後に、一時フォルダを Finder で開き、1px の PNG をクリップボードへ入れてスクリプトを実行しました。

```console
$ find /tmp/finder-image-paste-verify.* -name 'clipboard-image-*.png' -exec file {} \;
clipboard-image-20260515-093313.png: PNG image data, 2 x 2, 8-bit/color RGBA, non-interlaced
```

操作としては、次の2つを確認しました。

- 画像データをコピーして Finder で `Cmd+V` すると、開いているフォルダに PNG ファイルが作られる。
- Finder で複数ファイルや画像ファイルそのものをコピーして `Cmd+V` した場合は、PNG 化しないように file URL を先に判定する。

## おわりに

これで、Finder を開いて画像をコピーし、そこで `Cmd+V` するだけで PNG ファイルが保存されます。ただし、通常のペーストも同じキーで扱うため、使う場合は上の注意点も踏まえて試すのがよさそうです。

Enjoy, instant image files!
