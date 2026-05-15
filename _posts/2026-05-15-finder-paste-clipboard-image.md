---
layout: post
title: "Finderで画像をCmd+V保存できるようにする"
date: 2026-05-15
description: "Finder上で画像クリップボードをCmd+Vしたら、そのフォルダにPNGとして保存する小さなKarabiner連携メモ。"
---

<img src="/images/posts/finder-paste-clipboard-image/finder-paste-clipboard-image-demo.gif" alt="Finderで画像クリップボードをCmd+VしてPNGとして保存するデモ" width="800" height="476" loading="eager" decoding="sync">

## はじめに

スクリーンショットや生成画像を扱っていると、画像をコピーしたあとに Finder のフォルダへそのまま貼り付けたくなります。

でも macOS の Finder は、画像データそのものを `Cmd+V` しても、その場に PNG として保存してくれるわけではありません。いったん Preview や画像編集アプリを挟むのは、毎回やるにはちょっとだけ重い。

そこで、Finder が前面にあるときだけ `Cmd+V` を拾って、クリップボードの画像を開いているフォルダに `clipboard-image-YYYYMMDD-HHMMSS.png` として保存するようにしました。

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

画像が取れたら、同じフォルダに時刻付きの PNG を保存します。

```swift
let pasteboard = NSPasteboard.general

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

画像ではないものを貼り付けた場合は、スクリプトの中で通常の `Cmd+V` を送り直します。なので、Finder でファイルをコピーして貼り付ける普段の操作はそのまま残ります。

```zsh
fallback_paste() {
  /usr/bin/osascript \
    -e 'tell application "System Events" to keystroke "v" using command down'
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

## おわりに

これで、Finder を開いて画像をコピーし、そこで `Cmd+V` するだけで PNG が吐き出されます。

Enjoy, instant image files!
