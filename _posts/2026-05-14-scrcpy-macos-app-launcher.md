---
layout: post
title: "scrcpyを/Applicationsに置けるmacOSアプリにする"
date: 2026-05-14
description: "Homebrew の scrcpy を AppleScript アプリとして /Applications に置き、Finder や Spotlight から起動できるようにした小さな実装メモ。"
hidden: true
sitemap: false
robots: noindex,nofollow
permalink: /preview/scrcpy-macos-app-launcher-20260515-b7f3a9/
---

## なぜ

Android の画面を Mac に映すとき、`scrcpy` はかなり便利です。USB でつないで `scrcpy` と打つだけで、端末の画面を低遅延で表示できます。

ただ、普段使いの道具としては、毎回ターミナルから起動するより、Finder や Spotlight から普通のアプリとして起動できるほうが気楽です。`/Applications` に置いておけば、Dock にも置けるし、他の macOS アプリと同じ感覚で扱えます。

今回は Homebrew で入っている `scrcpy` を、薄い AppleScript アプリで包んで `/Applications/scrcpy.app` にしました。中身は大げさな GUI ではなく、既存の CLI をきれいに起動するための小さなランチャーです。

![scrcpy.app から Pixel 10 の Minecraft 画面を表示しているところ](/images/scrcpy/2026-05-14-scrcpy-minecraft-app-1600.png)

って、`scrcpy` 入れて何やるかと思ったらマイクラやるんかーい、という感じですが、確認としてはいいよね。

## scrcpy と adb を入れる

まずは `scrcpy` 本体を入れます。macOS なら Homebrew で入れるのが一番簡単です。

```bash
brew install scrcpy
```

`scrcpy` は Android 端末と通信するために `adb` を使います。Homebrew の `scrcpy` formula は依存関係として Android Platform Tools も入れてくれるので、ふつうはこれだけで `adb` も使えるようになります。

`adb` は Android Studio 経由で入れることも多いですが、ミニマムの入れ方は以下です。もし `adb` が見つからない場合は、Platform Tools を明示的に入れます。

```bash
brew install android-platform-tools
```

インストールできたら、コマンドが見えることを確認します。

```console
$ command -v scrcpy
/opt/homebrew/bin/scrcpy

$ command -v adb
.../Android/sdk/platform-tools/adb

$ brew list --versions scrcpy
scrcpy 4.0
```

次に Android 側で「開発者向けオプション」と「USB デバッグ」を有効にして、Mac に USB 接続します。初回接続時は Android 側に「USB デバッグを許可しますか？」という確認が出るので許可します。

接続できているかは `adb devices` で見ます。

```console
$ adb devices
List of devices attached
5B030DLCR001K1    device
```

ここで `device` と出ていれば準備完了です。`unauthorized` と出る場合は、Android 側の許可ダイアログを確認します。何も出ない場合は、ケーブル、USB 接続モード、USB デバッグ設定を見直します。

今回のアプリ化では、Homebrew で入った `scrcpy` の実体をそのまま使います。やることは、`/Applications/scrcpy.app` という app bundle を作り、その中から `/opt/homebrew/bin/scrcpy` を起動することだけです。

## AppleScript アプリを作る

macOS には `osacompile` というコマンドがあり、AppleScript を `.app` にコンパイルできます。これを使うと、ランチャー用途の小さなアプリを簡単に作れます。

```bash
APP="/Applications/scrcpy.app"

osacompile -o "$APP" -e 'on run
    set shellScript to "export PATH=/opt/homebrew/bin:/usr/local/bin:$HOME/Library/Android/sdk/platform-tools:/usr/bin:/bin:/usr/sbin:/sbin; " & ¬
        "nohup /opt/homebrew/bin/scrcpy " & ¬
        "> /tmp/scrcpy-app.log 2>&1 &"
    do shell script shellScript
end run'
```

ポイントは 3 つです。

1. `PATH` をアプリ側で明示する
2. `nohup ... &` で AppleScript の実行をすぐ返す
3. `/tmp/scrcpy-app.log` にログを残す

GUI アプリとして起動すると、ターミナルで使っている shell の `PATH` はそのまま引き継がれません。なので、`scrcpy` と `adb` が見えるように `PATH` を明示しておきます。

また、`scrcpy` は起動後も動き続けるアプリなので、AppleScript 側で待ち続ける必要はありません。`nohup` と `&` で裏に回し、ログだけ残しておくと、起動に失敗したときも原因を追いやすいです。

## アプリ名とアイコンを整える

`osacompile` だけでもアプリとして起動できますが、そのままだと名前やアイコンが少し味気ないので、`Info.plist` を調整します。

```bash
/usr/libexec/PlistBuddy -c "Set :CFBundleName scrcpy" "$APP/Contents/Info.plist" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Add :CFBundleName string scrcpy" "$APP/Contents/Info.plist"

/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName scrcpy" "$APP/Contents/Info.plist" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string scrcpy" "$APP/Contents/Info.plist"

/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.example.scrcpy-launcher" "$APP/Contents/Info.plist" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string com.example.scrcpy-launcher" "$APP/Contents/Info.plist"
```

Homebrew の scrcpy にはアイコン画像も入っているので、それを `.icns` に変換して app bundle に入れます。

![scrcpy のアプリアイコン](/images/scrcpy/scrcpy-app-icon.png)

```bash
ICON_PNG="/opt/homebrew/share/icons/hicolor/256x256/apps/scrcpy.png"
ICONSET="/tmp/scrcpy.iconset"

rm -rf "$ICONSET"
mkdir -p "$ICONSET"

sips -z 16 16     "$ICON_PNG" --out "$ICONSET/icon_16x16.png" >/dev/null
sips -z 32 32     "$ICON_PNG" --out "$ICONSET/icon_16x16@2x.png" >/dev/null
sips -z 32 32     "$ICON_PNG" --out "$ICONSET/icon_32x32.png" >/dev/null
sips -z 64 64     "$ICON_PNG" --out "$ICONSET/icon_32x32@2x.png" >/dev/null
sips -z 128 128   "$ICON_PNG" --out "$ICONSET/icon_128x128.png" >/dev/null
sips -z 256 256   "$ICON_PNG" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
sips -z 256 256   "$ICON_PNG" --out "$ICONSET/icon_256x256.png" >/dev/null
sips -z 512 512   "$ICON_PNG" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
sips -z 512 512   "$ICON_PNG" --out "$ICONSET/icon_512x512.png" >/dev/null
cp "$ICON_PNG" "$ICONSET/icon_512x512@2x.png"

iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/scrcpy.icns"

/usr/libexec/PlistBuddy -c "Set :CFBundleIconFile scrcpy" "$APP/Contents/Info.plist" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Add :CFBundleIconFile string scrcpy" "$APP/Contents/Info.plist"

rm -rf "$ICONSET"
```

AppleScript アプリの場合、`CFBundleIconName` が `applet` のままだと、`CFBundleIconFile` を設定したつもりでも見た目が AppleScript のデフォルトアイコンに戻ることがあります。なので、`CFBundleIconName` も `scrcpy` に揃え、さらに `applet.icns` 自体も置き換えておくと確実です。

```bash
cp "$APP/Contents/Resources/scrcpy.icns" "$APP/Contents/Resources/applet.icns"

/usr/libexec/PlistBuddy -c "Set :CFBundleIconName scrcpy" "$APP/Contents/Info.plist" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Add :CFBundleIconName string scrcpy" "$APP/Contents/Info.plist"

touch "$APP"
```

これで `/Applications` の中でも `scrcpy` として見え、アイコンも scrcpy のものになります。

## 起動確認

最後に、実際に Android 端末が見えていることと、アプリから起動できることを確認します。

```console
$ adb devices
List of devices attached
5B030DLCR001K1    device

$ open /Applications/scrcpy.app

$ tail /tmp/scrcpy-app.log
/opt/homebrew/Cellar/scrcpy/4.0/share/scrcpy/scrcpy-server: 1 file pushed, 0 skipped. 154.9 MB/s (732226 bytes in 0.005s)
[server] INFO: Device: [Google] google Pixel 10 (Android 16)
```

ここまで出れば、`/Applications/scrcpy.app` から Homebrew 版 scrcpy が起動し、接続中の Android 端末まで届いています。

## Minecraft 用の可変サイズアプリも作る

ここまでの `scrcpy.app` は、スマホ本体の画面をそのまま Mac に映す通常ミラーです。これはこれで便利ですが、scrcpy 4.0 にはもうひとつ面白い使い方があります。

`--new-display` で Android 側に仮想ディスプレイを作り、`-x` / `--flex-display` で Mac 側のウィンドウサイズに合わせて、その仮想ディスプレイ自体をリサイズできます。

```console
$ scrcpy --help
    --new-display[=[<width>x<height>][/<dpi>]]
        Create a new display with the specified resolution and density.

    -x, --flex-display
        Continuously resize the virtual display to match the window.
```

通常ミラーと混ぜると挙動がわかりにくくなるので、別アプリとして `/Applications/scrcpy Minecraft.app` を作ることにしました。名前は公式表記に合わせて `scrcpy`、Minecraft 起動専用なので `scrcpy Minecraft` です。

![scrcpy Minecraft.app のアプリアイコン](/images/scrcpy/scrcpy-minecraft-app-icon.png)

```bash
APP="/Applications/scrcpy Minecraft.app"

osacompile -o "$APP" -e 'on run
    set shellScript to "export PATH=/opt/homebrew/bin:/usr/local/bin:$HOME/Library/Android/sdk/platform-tools:/usr/bin:/bin:/usr/sbin:/sbin; " & ¬
        "nohup /opt/homebrew/bin/scrcpy " & ¬
        "--new-display=/192 " & ¬
        "-x " & ¬
        "--start-app=com.mojang.minecraftpe " & ¬
        "--keep-active " & ¬
        "--no-vd-system-decorations " & ¬
        "--window-title=scrcpy-minecraft " & ¬
        "> /tmp/scrcpy-minecraft-app.log 2>&1 &"
    do shell script shellScript
end run'
```

Minecraft 版は Alfred / Raycast で見分けやすいように、草ブロック風の専用アイコンにしています。AppleScript のデフォルトアイコンが残らないように、通常版と同じく `CFBundleIconFile` / `CFBundleIconName` / `applet.icns` を揃えます。

これを起動すると、Pixel の実画面をそのまま映すのではなく、Android 側に `scrcpy` という仮想ディスプレイを作り、その上で Minecraft を起動します。Mac 側でウィンドウを横長にしたり縦長にしたりすると、仮想ディスプレイの解像度も追従します。

![scrcpy Minecraft.app で flex display のサイズ変更を試しているところ](/images/scrcpy/2026-05-14-scrcpy-minecraft-flex.gif)

さらに面白いのは、この状態だと Mac 側のキーボードとマウスで Minecraft を操作できることです。スマホゲームを「Mac のウィンドウ上で、キーボード + マウス操作できる」状態になるので、単なる画面ミラーリングよりだいぶ PC 版っぽい触り心地になります。

確認ログはこんな感じです。

```console
$ open "/Applications/scrcpy Minecraft.app"

$ tail /tmp/scrcpy-minecraft-app.log
[server] INFO: Device: [Google] google Pixel 10 (Android 16)
[server] INFO: New display: 1280x960/192 (id=23)
[server] INFO: Starting app "Minecraft" [com.mojang.minecraftpe] on display 23...
```

つまり、用途は 2 つに分けています。

- `scrcpy.app`: Pixel の実画面をそのままミラーする
- `scrcpy Minecraft.app`: 可変サイズの仮想ディスプレイを作って Minecraft を起動する

## おわりに

scrcpy をアプリ化してみました。これまで起動するときに、えーっと確か scrap みたいな名前の……って感じでうろ覚えだったのと、Alfred / Raycast の候補に出てこないことで使いこなせてなかったのですが、これでサクッと起動できるようになって助かりました。

Codex に聞けば大体やってくれるのも良いですね。

副産物でマイクラ捗る感じになったので、Codex の Computer Use と組み合わせて色々できそうです。

Enjoy, Minecraft with scrcpy ;)
