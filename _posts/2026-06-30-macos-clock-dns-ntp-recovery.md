---
layout: post
title: "DNSが死んでいてもmacOSの時計をNTPで直す"
date: 2026-06-30
description: "DNS lookup failureでNTP同期できないmacOSを、IP直指定のsntpから復旧した実例メモ。"
full_ai: true
---

この記事は、実際の復旧ログを元に Full AI で整理した記事です。個人環境のユーザー名、ホスト名、端末名、プロンプト文字列は載せていません。

## はじめに

macOS の時計が数日ずれていました。

最初にやったのは素直に NTP 同期です。

```sh
sudo sntp -sS ntp.nict.jp
```

ところが、返ってきたのはこれでした。

```text
sntp: Exchange failed: DNS lookup failure
sntp_exchange {
        result: 1 (DNS lookup failure)
        header: 00 (li:0 vn:0 mode:0)
       stratum: 00 (0)
          poll: 00 (1)
     precision: 00 (1.000000e+00)
         delay: 0000.0000 (0.000000000)
    dispersion: 0000.0000 (0.000000000)
}
```

時計を直したいのに、NTP サーバー名を DNS で引けない。こういう時は、先に DNS を直すより、まず時計を NTP サーバーの IP アドレスへ直接当てて復旧する方が早いことがあります。

今回はその手順で、時計、DNS、自動時刻設定まで戻しました。

## 状況

最初の `date` は 2026-06-24 を指していました。本来は 2026-06-30 なので、約 5 日半ずれています。

```text
Wed Jun 24 22:21:35 JST 2026
```

この状態で `sudo sntp -sS ntp.nict.jp` を実行しても、`ntp.nict.jp` の名前解決ができずに失敗しました。

ここで重要なのは、NTP 通信そのものが失敗しているのか、NTP サーバー名の DNS 解決だけが失敗しているのかを分けることです。

## IP 直指定で時計を戻す

DNS が壊れている時は、NTP サーバー名ではなく IP アドレスを直接指定します。

```sh
sudo sntp -sS 133.243.238.163
date
```

今回の結果はこうでした。

```text
+472987.781619 +/- 0.022394 133.243.238.163 133.243.238.163
Tue Jun 30 09:44:44 JST 2026
```

`+472987.781619` 秒、つまり約 5.47 日ぶん時計がずれていました。IP 直指定で `sntp` が通ったので、UDP/123 の NTP 通信は生きていて、最初の失敗は DNS lookup failure だったと切り分けられます。

この IP 指定は復旧用の一時対応です。NICT の案内では、通常の NTP サーバー設定には `ntp.nict.jp` を使います。

## DNS を直す

時計が戻ったら、DNS を直します。Wi-Fi を使っている場合は、まず DNS サーバーを明示します。

```sh
networksetup -setdnsservers Wi-Fi 1.1.1.1 8.8.8.8
scutil --dns | head -80
```

ネットワークサービス名が `Wi-Fi` ではない場合は、先に一覧を見ます。

```sh
networksetup -listallnetworkservices
```

今回の `scutil --dns` では、デフォルト resolver に `1.1.1.1` と `8.8.8.8` が入り、reachability も `Reachable` になりました。

```text
DNS configuration

resolver #1
  nameserver[0] : 1.1.1.1
  nameserver[1] : 8.8.8.8
  flags    : Request A records
  reach    : 0x00000002 (Reachable)
```

## 名前解決できることを確認する

DNS を設定したら、`dig` で `ntp.nict.jp` が引けるか確認します。

```sh
dig ntp.nict.jp
```

今回の結果では、`1.1.1.1` から `ntp.nict.jp` の A レコードが返りました。

```text
;; ->>HEADER<<- opcode: QUERY, status: NOERROR

;; ANSWER SECTION:
ntp.nict.jp.  83377  IN  A  133.243.238.164
ntp.nict.jp.  83377  IN  A  133.243.238.163
ntp.nict.jp.  83377  IN  A  61.205.120.130
ntp.nict.jp.  83377  IN  A  133.243.238.244
ntp.nict.jp.  83377  IN  A  133.243.238.243

;; SERVER: 1.1.1.1#53(1.1.1.1)
```

これで DNS は復旧しています。

## ホスト名で NTP 同期する

DNS が戻ったので、今度は本来のホスト名で NTP 同期します。

```sh
sudo sntp -sS ntp.nict.jp
date
```

最初はまだ 2 秒ほどずれていました。

```text
+2.018556 +/- 0.021909 ntp.nict.jp 133.243.238.243
```

もう一度実行すると、差分は 1 ミリ秒未満まで詰まりました。

```text
+0.000906 +/- 0.022017 ntp.nict.jp 133.243.238.243
Tue Jun 30 09:46:58 JST 2026
```

ここまで来たら、時計と DNS の両方が復旧しています。

## macOS の自動時刻設定を戻す

最後に macOS の自動時刻設定を確認します。

```sh
sudo systemsetup -getusingnetworktime
sudo systemsetup -getnetworktimeserver
date
```

今回の最終結果はこれでした。

```text
Network Time: On
Network Time Server: ntp.nict.jp
Tue Jun 30 09:47:27 JST 2026
```

自動時刻設定が ON で、時刻サーバーも `ntp.nict.jp` になっています。これで完了です。

## 途中で出たエラー

復旧途中で、次のエラーも出ました。

```text
Could not kickstart service "com.apple.timed": 150: Operation not permitted while System Integrity Protection is engaged
```

SIP が有効な macOS では、`com.apple.timed` を `launchctl kickstart` で直接再起動できないことがあります。今回の復旧では、この操作は必須ではありませんでした。

また、時計が大きく戻った直後に sudo が次の警告を出しました。

```text
sudo: ignoring time stamp from the future
```

これは sudo の認証キャッシュ時刻が、時計変更の影響で未来扱いになった警告です。時計が正常化したあとに再認証すれば、そのまま進められました。

`systemsetup` の設定変更中には `Error:-99` も出ましたが、最終的には `getusingnetworktime` と `getnetworktimeserver` で正しい状態を確認できました。エラー表示だけで止めず、最後に現在状態を読むのが大事です。

## 復旧コマンドまとめ

DNS が壊れていて `sudo sntp -sS ntp.nict.jp` が `DNS lookup failure` になる時は、まず IP 直指定で時計を戻します。

```sh
sudo sntp -sS 133.243.238.163
date
```

次に DNS を明示します。

```sh
networksetup -setdnsservers Wi-Fi 1.1.1.1 8.8.8.8
scutil --dns | head -80
dig ntp.nict.jp
```

最後にホスト名で NTP 同期して、自動時刻設定を確認します。

```sh
sudo sntp -sS ntp.nict.jp
sudo systemsetup -getusingnetworktime
sudo systemsetup -getnetworktimeserver
date
```

## 再現手順と確認日

- 確認日: 2026-06-30 JST
- 確認環境: macOS の標準コマンド `sntp`, `systemsetup`, `networksetup`, `scutil`, `dig`
- 再現した症状: `sudo sntp -sS ntp.nict.jp` が `DNS lookup failure` で失敗
- 復旧確認: `sudo sntp -sS ntp.nict.jp` が `+0.000906` 秒差で成功し、`systemsetup` が `Network Time: On` と `Network Time Server: ntp.nict.jp` を返した

## 参考

- [NICT Public NTP Service](https://jjy.nict.go.jp/tsp/PubNtp/index-e.html)（確認日: 2026-06-30）
- [NICT NTP FAQ](https://www.nict.go.jp/en/sts/ntp_faq.html)（確認日: 2026-06-30）
- [`sntp(1)` macOS manual](https://keith.github.io/xcode-man-pages/sntp.1.html)（確認日: 2026-06-30）
- [`systemsetup(8)` macOS manual](https://keith.github.io/xcode-man-pages/systemsetup.8.html)（確認日: 2026-06-30）
- [`networksetup(8)` macOS manual](https://keith.github.io/xcode-man-pages/networksetup.8.html)（確認日: 2026-06-30）
- [`scutil(8)` macOS manual](https://keith.github.io/xcode-man-pages/scutil.8.html)（確認日: 2026-06-30）

## おわりに

今回のポイントは、`ntp.nict.jp` が引けない時点で「NTP が壊れている」と決めつけず、NTP サーバーの IP アドレスへ一度だけ直接当てたことです。

IP 直指定で時計が戻れば、NTP 通信は生きています。そのあと DNS を直し、最後に `ntp.nict.jp` というホスト名で同期できる状態へ戻せば、macOS の自動時刻設定まできれいに復旧できます。
