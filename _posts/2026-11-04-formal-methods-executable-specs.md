---
layout: post
title: "仕様を1か所壊したら誰が気づくか：Alloy・TLA+・Quint・Dafny・Lean・Z3・Cedar・dspecで試す"
date: 2026-11-04
description: "同じ承認フローを7つの形式手法の道具で書き、「取消したのにアクセスを許す」へ1か所だけ壊して、どの道具がどう気づくかを終了コードまで比べます。dspecでは実装参照の切れを試します。"
full_ai: true
full_ai_model: claude-opus-5-5
image: /images/posts/formal-methods-executable-specs/who-notices.png
social_image: /images/posts/formal-methods-executable-specs/who-notices.png
---

## はじめに

AIに頼めば、AlloyやTLA+やLeanのモデルは数分で出てくる。
書くのが速くなると、今度は別の心配が出てくる。
仕様を変えたとき、増えたモデルや証明のどれかが黙って古くなるのではないか。

そこで、同じ小さな承認フローを7つの道具で書き、わざと1か所だけ壊してみた。
壊し方はすべて同じで、「取消したのにアクセスを許す」にする。
道具が気づくか、気づいたらCIを止める終了コードを返すかを見る。
仕様と実装の対応を管理するdspecだけは役目が違うので、実装参照の名前を壊して別に試した。

結果は、7つのうちTLA+・Quint・Dafnyの3つがそのまま止まった。
LeanとCedarは、命題の書き方とテストの有無で結果が変わった。
AlloyとZ3は気づいたが、終了コードではCIを止めなかった。

## 題材：取消した依頼は許可しない

- 依頼は`Pending`から始まる
- `approve`すると`Approved`になり、アクセスを許可する
- `cancel`すると`Cancelled`になり、アクセスを許可しない
- `Cancelled`の依頼は、何をしても許可しない

題材は記事用に作った最小の例である。
7つのサンプルと壊した版は[scripts/formal_methods_approval_2026](https://github.com/kazuph/kazuph.github.io/tree/master/scripts/formal_methods_approval_2026)にある。
壊した版は`broken/`の下にあり、元の版との差は1行だけである。

## 壊した仕様に誰が気づいたか

<div style="overflow-x:auto; margin: 24px 0;">
<svg viewBox="0 0 900 650" style="width:100%; min-width:680px; height:auto; display:block;" role="img" aria-label="仕様を1か所壊したときに、7つの道具とdspecのどれが気づいたかの図" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, -apple-system, 'Hiragino Sans', sans-serif">
  <defs><marker id="fm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker></defs>
  <rect x="220.0" y="10" width="460" height="58" rx="12" fill="#172033"/>
  <text x="450.0" y="36" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">仕様を1か所壊す</text>
  <text x="450.0" y="57" text-anchor="middle" font-size="14" fill="#cbd5e1">cancel したのに granted = true にする</text>
  <path d="M450.0,68 L450.0,88 L150.0,88 M450.0,88 L730.0,88" fill="none" stroke="#475569" stroke-width="2"/>
  <path d="M150.0,88 L150.0,110" fill="none" stroke="#475569" stroke-width="2" marker-end="url(#fm-arrow)"/>
  <path d="M440.0,88 L440.0,110" fill="none" stroke="#475569" stroke-width="2" marker-end="url(#fm-arrow)"/>
  <path d="M730.0,88 L730.0,110" fill="none" stroke="#475569" stroke-width="2" marker-end="url(#fm-arrow)"/>
  <text x="150.0" y="132" text-anchor="middle" font-size="16" font-weight="800" fill="#172033">設計モデル</text>
  <rect x="10" y="146" width="280" height="92" rx="10" fill="#fffbeb" stroke="#fbbf24"/>
  <text x="24" y="172" font-size="16" font-weight="800" fill="#172033">Alloy 6</text>
  <text x="24" y="196" font-size="14" fill="#172033">反例あり（SAT）</text>
  <text x="24" y="220" font-size="14" font-weight="700" fill="#b45309">ただし終了コード 0</text>
  <rect x="10" y="254" width="280" height="92" rx="10" fill="#ecfdf5" stroke="#34d399"/>
  <text x="24" y="280" font-size="16" font-weight="800" fill="#172033">TLA+ / TLC</text>
  <text x="24" y="304" font-size="14" fill="#172033">取消1回で不変条件違反の反例</text>
  <text x="24" y="328" font-size="14" font-weight="700" fill="#047857">終了コード 12 で止まる</text>
  <rect x="10" y="362" width="280" height="92" rx="10" fill="#ecfdf5" stroke="#34d399"/>
  <text x="24" y="388" font-size="16" font-weight="800" fill="#172033">Quint</text>
  <text x="24" y="412" font-size="14" fill="#172033">found a counterexample</text>
  <text x="24" y="436" font-size="14" font-weight="700" fill="#047857">終了コード 1 で止まる</text>
  <text x="440.0" y="132" text-anchor="middle" font-size="16" font-weight="800" fill="#172033">コードと証明</text>
  <rect x="300" y="146" width="280" height="92" rx="10" fill="#ecfdf5" stroke="#34d399"/>
  <text x="314" y="172" font-size="16" font-weight="800" fill="#172033">Dafny</text>
  <text x="314" y="196" font-size="14" fill="#172033">事後条件 !granted を証明できない</text>
  <text x="314" y="220" font-size="14" font-weight="700" fill="#047857">終了コード 4 で止まる</text>
  <rect x="300" y="254" width="280" height="92" rx="10" fill="#fef2f2" stroke="#f87171"/>
  <text x="314" y="280" font-size="16" font-weight="800" fill="#172033">Lean 4（元の定理）</text>
  <text x="314" y="304" font-size="14" fill="#172033">定理は通り、granted=true を出力</text>
  <text x="314" y="328" font-size="14" font-weight="700" fill="#b91c1c">見逃す（終了コード 0）</text>
  <rect x="300" y="362" width="280" height="92" rx="10" fill="#ecfdf5" stroke="#34d399"/>
  <text x="314" y="388" font-size="16" font-weight="800" fill="#172033">Lean 4（強めた定理）</text>
  <text x="314" y="412" font-size="14" fill="#172033">decide が命題を偽と判定</text>
  <text x="314" y="436" font-size="14" font-weight="700" fill="#047857">終了コード 1 で止まる</text>
  <text x="730.0" y="132" text-anchor="middle" font-size="16" font-weight="800" fill="#172033">論理式・本番の判断</text>
  <rect x="590" y="146" width="280" height="92" rx="10" fill="#fffbeb" stroke="#fbbf24"/>
  <text x="604" y="172" font-size="16" font-weight="800" fill="#172033">Z3</text>
  <text x="604" y="196" font-size="14" fill="#172033">違反を問う式が sat になる</text>
  <text x="604" y="220" font-size="14" font-weight="700" fill="#b45309">ただし終了コード 0</text>
  <rect x="590" y="254" width="280" height="92" rx="10" fill="#fffbeb" stroke="#fbbf24"/>
  <text x="604" y="280" font-size="16" font-weight="800" fill="#172033">Cedar（authorize）</text>
  <text x="604" y="304" font-size="14" fill="#172033">ALLOW を返すだけ</text>
  <text x="604" y="328" font-size="14" font-weight="700" fill="#b45309">正誤は判断しない（終了コード 0）</text>
  <rect x="590" y="362" width="280" height="92" rx="10" fill="#ecfdf5" stroke="#34d399"/>
  <text x="604" y="388" font-size="16" font-weight="800" fill="#172033">Cedar（run-tests）</text>
  <text x="604" y="412" font-size="14" fill="#172033">expected Deny, got Allow</text>
  <text x="604" y="436" font-size="14" font-weight="700" fill="#047857">終了コード 1 で止まる</text>
  <path d="M440.0,346 L440.0,361" stroke="#475569" stroke-width="2" marker-end="url(#fm-arrow)"/>
  <text x="450.0" y="358" font-size="12" fill="#475569">命題を強める</text>
  <path d="M730.0,346 L730.0,361" stroke="#475569" stroke-width="2" marker-end="url(#fm-arrow)"/>
  <text x="740.0" y="358" font-size="12" fill="#475569">期待値を書く</text>
  <text x="450.0" y="484" text-anchor="middle" font-size="16" font-weight="800" fill="#172033">別の壊し方：dspec では実装参照の名前を壊す</text>
  <rect x="10" y="496" width="880" height="70" rx="10" fill="#ecfdf5" stroke="#34d399"/>
  <text x="24" y="524" font-size="16" font-weight="800" fill="#172033">dspec（drift）</text>
  <text x="160" y="524" font-size="14" fill="#172033">実装参照の関数名を壊すと missing implementation symbol</text>
  <text x="24" y="550" font-size="14" font-weight="700" fill="#047857">終了コード 1 で止まる</text>
  <text x="200" y="550" font-size="13" fill="#475569">壊すのは参照の名前で、関数の中身が規則どおりかは見ない</text>
  <rect x="10" y="592" width="18" height="18" rx="4" fill="#ecfdf5" stroke="#34d399"/>
  <text x="36" y="606" font-size="14" fill="#172033">気づいて止まる</text>
  <rect x="180" y="592" width="18" height="18" rx="4" fill="#fffbeb" stroke="#fbbf24"/>
  <text x="206" y="606" font-size="14" fill="#172033">結果は返すが、CIを止めるには判定が要る</text>
  <rect x="510" y="592" width="18" height="18" rx="4" fill="#fef2f2" stroke="#f87171"/>
  <text x="536" y="606" font-size="14" fill="#172033">見逃す</text>
  <text x="10" y="638" font-size="12" fill="#475569">Alloy 6.2.0、TLC 2.19、Quint 0.33.1、Dafny 4.11.0、Lean 4.35.0、Z3 5.3.3、Cedar CLI 4.14.1、dspec の main で実行。</text>
</svg>
</div>

止まらなかった道具には、それぞれ止める方法があった。

**Leanは、書いた命題の外を見逃した。**
元の定理は「取消済みの状態から先では許可しない」で、壊した`pending`から`cancel`する行は範囲の外にある。
定理を「どの状態からでも、結果が取消済みなら許可しない」に強めると止まった。

**Cedarは、期待値が無いと正誤を決めない。**
`authorize`は壊したポリシーでも`ALLOW`と答えるだけで、期待値を書いたテストを`run-tests`で流すと止まった。

**AlloyとZ3は、終了コードを見るだけでは足りない。**
どちらも違反を見つけても終了コード0で終わる。
CIで使うなら、違反を問う検査の結果を期待値と比べる処理を足す。
Alloyなら対象の`check`が`UNSAT`か、Z3なら違反を問う`check-sat`が`unsat`かを見る。
出力のどこかに`sat`が出たら落とす、という雑な判定では、正常な版も落ちる。

## 8つの道具は何を検査するか

| 道具 | 問い | 機械が行うこと | この題材での位置 |
| --- | --- | --- | --- |
| Alloy 6 | 制約を満たすおかしな構造はあるか | 有限の範囲をSATソルバーで探す | 設計モデル |
| TLA+ / TLC | おかしな実行の順序はあるか | 到達できる状態を列挙する | 設計モデル |
| Quint | 同上を、型と実行できるモデルで | TLA+に変換してTLCかApalacheで検査する | 設計モデル |
| Dafny | この関数は事前・事後条件を満たすか | 検証条件を作り、Z3で証明する | コード |
| Lean 4 | 定義からこの命題を導けるか | 証明をカーネルが検査する | コードと証明 |
| Z3 | この論理式に解はあるか | SMTソルバーとして充足可能性を判定する | 他の検証器の下で働く |
| Cedar | この要求を許可するか | 本番でも使うポリシーを評価する | 本番の判断 |
| dspec | 正本と実装・生成物の対応は切れていないか | 型検査、生成、参照切れの検査をする | 対応の管理 |

Z3は、AlloyやTLA+と同じ意味の仕様言語ではない。
Dafnyをはじめ多くの検証器の下で働く推論エンジンで、業務の仕様をどう式にするかは使う側が決める。

Cedarは検証専用のモデルでもない。
同じポリシーを、Rust製のエンジンや[Amazon Verified Permissions](https://aws.amazon.com/verified-permissions/)が本番の認可判断に使う。

[dspec](https://github.com/mizchi/dspec)は定理証明器でもモデル検査器でもない。
[Pkl](https://github.com/apple/pkl)の型付きモデルを正本にして、規則とAlloy・TLA+・Lean・テストなどの生成物、実装のどの関数がどの規則に対応するか（実装参照）を結び付ける。
正本から生成物を作ることを、dspecは射影と呼ぶ。

## サンプルと、壊したときの出力

### Alloy 6：有限の範囲で反例を探す

```alloy
enum Status { Pending, Approved, Cancelled }
enum Grant { Denied, Granted }

sig User {}

sig Request {
  owner: one User,
  approver: one User,
  status: one Status,
  grant: one Grant
}

fact DistinctRoles {
  all r: Request | r.owner != r.approver
}

fact GrantMatchesStatus {
  all r: Request | r.grant = Granted iff r.status = Approved
}

assert CancelledNeverGrants {
  all r: Request | r.status = Cancelled implies r.grant = Denied
}

check CancelledNeverGrants for 4
```

```sh
java -jar alloy.jar exec -c CancelledNeverGrants -t json -o out approval.als
```

```text
00. check CancelledNeverGrants     0       UNSAT
```

`UNSAT`は、スコープ4の範囲でassertを破る構造が見つからなかったという意味である。
無限の範囲で証明したわけではない。

壊した版は`GrantMatchesStatus`を`r.status != Pending`にした。
結果は`SAT`になり、取消済みで許可された依頼が反例として出る。
終了コードは0のままだった。

### TLA+ / TLC：すべての到達状態を調べる

```tla
---- MODULE Approval ----
VARIABLES status, granted

vars == <<status, granted>>

Init ==
  /\ status = "pending"
  /\ granted = FALSE

Approve ==
  /\ status = "pending"
  /\ status' = "approved"
  /\ granted' = TRUE

Cancel ==
  /\ status = "pending"
  /\ status' = "cancelled"
  /\ granted' = FALSE

Finish ==
  /\ status \in {"approved", "cancelled"}
  /\ UNCHANGED vars

Next == Approve \/ Cancel \/ Finish
Spec == Init /\ [][Next]_vars

CancelledNeverGrants == status = "cancelled" => ~granted
====
```

```sh
java -cp tla2tools.jar tlc2.TLC -config Approval.cfg Approval.tla
```

```text
Model checking completed. No error has been found.
5 states generated, 3 distinct states found, 0 states left on queue.
```

終わった後の足踏みは`Finish`として明示した。

`Cancel`の`granted'`を`TRUE`にすると、TLCは取消1回の反例（初期状態と取消後の2状態）を出して終了コード12で止まる。

```text
State 1: <Initial predicate>
/\ granted = FALSE
/\ status = "pending"

State 2: <Cancel line 16, col 3 to line 18, col 20 of module Approval>
/\ granted = TRUE
/\ status = "cancelled"
```

### Quint：型付きの状態モデルをTLCで検査する

```quint
module approval {
  type Status = Pending | Approved | Cancelled

  var status: Status
  var granted: bool

  action init = all {
    status' = Pending,
    granted' = false,
  }

  action approve = all {
    status == Pending,
    status' = Approved,
    granted' = true,
  }

  action cancel = all {
    status == Pending,
    status' = Cancelled,
    granted' = false,
  }

  action step = any { approve, cancel }
  val cancelledNeverGrants = status != Cancelled or not(granted)
}
```

```sh
npx @informalsystems/quint@0.33.1 verify approval.qnt \
  --backend=tlc --invariant=cancelledNeverGrants --max-steps=5
```

```text
[ok] No violation found (300ms).
```

`cancel`の`granted'`を`true`にすると、`[violation] Found an issue`と反例を出して終了コード1で止まる。
TLCのバックエンドはJava 21以上が要る。Java 17では起動の段階で失敗した。

Quintは、モデルが作った実行の列を実装にも流して振る舞いを比べる、モデルベーステストにもつながる。
[Quint Connect](https://github.com/quint-co/quint-connect)は、QuintのトレースをRustの実装へ再生する。

### Dafny：契約つきの関数を証明する

```dafny
datatype Status = Pending | Approved | Cancelled

method Approve(status: Status) returns (next: Status, granted: bool)
  requires status == Pending
  ensures next == Approved
  ensures granted
{
  next, granted := Approved, true;
}

method Cancel(status: Status) returns (next: Status, granted: bool)
  requires status == Pending
  ensures next == Cancelled
  ensures !granted
{
  next, granted := Cancelled, false;
}
```

```sh
dafny verify approval.dfy
```

```text
Dafny program verifier finished with 3 verified, 0 errors
```

`Cancel`の本体を`granted := true`にすると、すぐ上の`ensures !granted`を証明できずに止まる（終了コード4）。

```text
approval.dfy(15,0): Error: a postcondition could not be proved on this return path
Dafny program verifier finished with 2 verified, 1 error
```

Dafnyは契約と実装を同じ場所に書くので、実装を変えれば契約とぶつかる。
ただし証明できるのはDafnyで書いたコードである。
同じロジックを別にTypeScriptで手書きしていれば、そちらは証明の外にある。

### Lean 4：命題が狭いと見逃す

```lean
def step : Status -> Event -> Status × Bool
  | .pending, .approve => (.approved, true)
  | .pending, .cancel => (.cancelled, false)
  | status, _ => (status, false)

-- 元の定理: 取消済みの状態から先では許可しない
theorem cancelledNeverGrants (event : Event) :
    (step .cancelled event).2 = false := by
  cases event <;> rfl

-- 強めた定理: どの状態からどの操作をしても、結果が取消済みなら許可しない
theorem cancelledResultNeverGrants (status : Status) (event : Event) :
    (step status event).1 = .cancelled → (step status event).2 = false := by
  cases status <;> cases event <;> decide
```

```sh
lean --run Approval.lean
```

```text
status=Status.cancelled, granted=false
```

元の定理だけの版（`broken/ApprovalOriginalTheorem.lean`）で`.pending, .cancel`を`(.cancelled, true)`にすると、ファイルはそのまま受理される。
実行すると`status=Status.cancelled, granted=true`が出る。
元の定理は`step .cancelled event`、つまり取消済みの状態を入力にした遷移しか見ていないからだ。

強めた定理を入れた版では、同じ1行の変更で止まる（終了コード1）。

```text
Approval.lean:24:35: error: Tactic `decide` proved that the proposition
  (step Status.pending Event.cancel).fst = Status.cancelled → (step Status.pending Event.cancel).snd = false
is false
```

元の定理の名前は`cancelledNeverGrants`で、読むと正しそうに見える。
レビューで見るべきは定理の名前ではなく、量化している範囲である。

### Z3：違反を直接聞く

```smt2
(set-logic ALL)

(declare-datatypes () ((Status Pending Approved Cancelled)))
(declare-const before Status)
(declare-const after Status)
(declare-const granted Bool)

(assert (= before Pending))
(assert
  (or
    (and (= after Approved) (= granted true))
    (and (= after Cancelled) (= granted false))))

(push)
(assert (= after Cancelled))
(assert granted)
(check-sat)
(pop)

(check-sat)
(get-model)
```

```text
unsat
sat
```

最初の`unsat`は「取消済みなのに許可」という状態が遷移と両立しないことを示す。
壊した版では、最初の答えが`sat`になる。
どちらの版でもZ3の終了コードは0なので、期待する答えと比べる処理を自分で書く。

### Cedar：本番と同じポリシーを評価する

```cedar
permit (
  principal == User::"approver",
  action == Action::"approve",
  resource is Request
);

permit (
  principal,
  action == Action::"read",
  resource is Request
) when {
  resource.status == "approved"
};

forbid (
  principal,
  action == Action::"read",
  resource is Request
) when {
  resource.status == "cancelled"
};
```

取消済みの依頼に対する`read`は`DENY`（一致したのは3つめの`forbid`）、approverによる`approve`は`ALLOW`になる。

```sh
cedar authorize --policies approval.cedar --entities entities.json \
  --principal 'User::"approver"' --action 'Action::"read"' \
  --resource 'Request::"request-1"'
```

3つめの`forbid`を`permit`にすると、`authorize`は`ALLOW`を返して終了コード0で終わる。
期待値を書いた[テストのJSON](https://github.com/kazuph/kazuph.github.io/blob/master/scripts/formal_methods_approval_2026/approval.cedar-tests.json)を`run-tests`に渡すと、壊した版で止まる。

```sh
cedar run-tests --policies approval.cedar --tests approval.cedar-tests.json
```

```text
running 2 test(s)
  test cancelled request cannot be read ... fail: expected Deny, got Allow
  test approver can approve ... ok
results: 1 passed, 1 failed
```

Cedar自体の正しさは、[Leanのモデル、Rustの実装、両者を比べるテスト](https://docs.cedarpolicy.com/other/security.html)で支えられている。
それでも、業務の要件どおりのポリシーを書くことと、正しい主体・資源・文脈をCedarへ渡すことは、使う側の仕事として残る。

### dspec：規則と実装の対応が切れたら止める

dspecには承認操作の決定表をPklで書いたfixtureがある。
上長のallowより、優先度の高いdenyの例外が勝つという決定だ。

```pkl
new d.IntentAccessPolicy {
  id = "request.approve-manager-allow"
  process = "request.approve"
  subject = "role.manager"
  decision = "allow"
  priority = 100
}

new d.IntentAccessPolicy {
  id = "request.approve-manager-deny-exception"
  process = "request.approve"
  subject = "role.manager"
  decision = "deny"
  priority = 200
  overrides {
    "request.approve-manager-allow"
  }
}
```

```sh
node src/cli.mjs intent access --json fixtures/intent-contract.pkl \
  request.approve role.manager
```

```json
{
  "decision": "deny",
  "policy": {
    "id": "request.approve-manager-deny-exception",
    "overrides": ["request.approve-manager-allow"],
    "priority": 200
  },
  "status": "pass"
}
```

dspec自身の正本に`check`と`drift`をかけると、規則81、用語138、射影7、実装参照1,124件で両方とも`pass`になった。
正本にある実装参照`loadModel`を、存在しない`loadModel_missing_for_test`に書き換えると、`drift`が止まる（終了コード1）。

```text
missing implementation symbol: DSPEC-TOPLEVEL-MODEL -> src/cli.mjs#loadModel_missing_for_test
```

dspecが見ているのは、規則に対応する関数がまだ存在するかである。
関数の中身が規則どおりかまでは見ない。
dspecのREADMEも、`drift`の役目を、実装参照がファイルやシンボルに今も解決できるかの検査としている。
検証の強さは、解決できるだけの`reference`と、`executed`・`bounded`・`proved`を分けて記録する。

## ずれを抑える4つの設計

仕様を変えたときに古くなる成果物を減らす方法は、今のところ4つに分かれる。

| 設計 | 例 | 何をもって「ずれていない」とするか | それでも残るずれ |
| --- | --- | --- | --- |
| 仕様と実装を同じ言語に置く | Dafny、Lean | 関数と契約・証明を同じ場所で検査する | 外側の入出力、他の言語との境界、命題の狭さ |
| 同じ成果物を本番でも使う | Cedar | 検証したポリシーが、そのまま本番の判断に使われる | 要求の組み立て、期待値のテストの有無 |
| 同じトレースをモデルと実装に流す | Quint Connect | モデルが作った実行の列で、実装の振る舞いが一致する | 変換の層、作られなかったトレース |
| 1つの正本から生成し、対応を検査する | dspec | 生成物と実装参照が正本と対応している | 生成できない意味、参照先の中身 |

今回の結果をこの表に重ねると、どの設計にも「書いていない命題は守られない」という穴が残る。
Leanの狭い定理と、期待値を書かないCedarは、同じ穴に落ちた例である。

## どれを選ぶか

**権限の組み合わせが複雑なとき。**
設計段階でrole、tenant、所有、委任の矛盾を探すならAlloyが合う。
本番の認可まで同じ成果物で持ちたいならCedarを使い、期待値のテストを`run-tests`でCIに入れる。

**取消、タイムアウト、再試行が絡むとき。**
TLA+かQuintを使う。
「取消の後に遅れて承認が届く」のような順序の問題は、決定表では書きにくい。
Quintは型と実行とテストに寄せたいとき、TLA+は既存の事例やTLAPSでの証明まで使いたいときに向く。

**関数そのものを証明したいとき。**
Dafnyは自動証明の比重が高く、契約とコードを一緒に書ける。
Leanは命題と証明の書き方を細かく制御できる。
どちらも、定理が何を量化しているかをレビューで確かめる。

**成果物が増えてきたとき。**
dspecのように、規則・実装参照・生成物・検証結果を1つの型付きモデルに戻すと、参照の切れはCIで止められる。
意味の一致までは保証しないので、上の検証器やテストと組み合わせる。

## 実行した版

| 道具 | 実行した版 | 最新リリース |
| --- | --- | --- |
| [Alloy](https://github.com/AlloyTools/org.alloytools.alloy) | 6.2.0 | 2025-01-09 |
| [TLA+](https://github.com/tlaplus/tlaplus) | TLC 2.19（TLA+ tools 1.7.4） | 2024-08-05 |
| [Quint](https://github.com/quint-co/quint) | 0.33.1（TLCバックエンド） | 2026-10-28 |
| [Dafny](https://github.com/dafny-lang/dafny) | 4.11.0 | 2025-08-25 |
| [Lean 4](https://github.com/leanprover/lean4) | 4.35.0 | 2026-10-12 |
| [Z3](https://github.com/Z3Prover/z3) | 5.3.3 | 2026-10-29 |
| [Cedar](https://github.com/cedar-policy/cedar) | CLI 4.14.1 | 2026-11-02 |
| [dspec](https://github.com/mizchi/dspec) | main | リリースなし |

## 出典

- Alloy: [Alloy applications](https://alloytools.org/applications.html)、[case studies](https://alloytools.org/citations/case-studies.html)
- TLA+: [Leslie LamportのTLA+のページ](https://lamport.azurewebsites.net/tla/tla.html)、[Use of Formal Methods at Amazon Web Services](https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf)
- Quint: [Quintのドキュメント](https://quint.sh/docs/lang)、[use cases](https://quint.sh/docs/use-cases)
- Dafny: [Dafny reference](https://dafny.org/dafny/DafnyRef/DafnyRef)、[AWSでの利用](https://aws.amazon.com/blogs/security/aws-security-profile-rustan-leino-senior-principal-applied-scientist/)
- Lean 4: [Lean language reference](https://lean-lang.org/doc/reference/latest/)、[Mathlib](https://lean-lang.org/use-cases/mathlib/)
- Z3: [Z3: an efficient SMT solver](https://www.microsoft.com/en-us/research/?p=825739)
- Cedar: [Cedar security model](https://docs.cedarpolicy.com/other/security.html)、[Amazon Verified Permissions](https://aws.amazon.com/verified-permissions/)
- dspec: [mizchi/dspec](https://github.com/mizchi/dspec)、[Apple Pkl](https://github.com/apple/pkl)
- 分類: 三菱総合研究所「[形式手法・ツール分類](https://formal.mri.co.jp/outline/tool-cat.html)」

## おわりに

同じ1行の壊し方に対して、止まった道具と素通りした道具があった。
差を生んだのは道具の強さより、命題をどこまで広く書いたか、期待値をテストに書いたか、CIが終了コードと出力のどちらを見るかだった。

AIでモデルを増やすなら、モデルと一緒に「壊したら落ちるか」も確かめておきたい。
壊した版は1行で作れて、CIで毎回流せる。
