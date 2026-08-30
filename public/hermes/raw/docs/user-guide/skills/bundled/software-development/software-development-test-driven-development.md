---
title: "Test Driven Development — TDD: RED-GREEN-REFACTOR を守り、コードより先にテストを書きます"
description: "TDD: RED-GREEN-REFACTOR を守り、コードより先にテストを書きます"
upstream_path: user-guide/skills/bundled/software-development/software-development-test-driven-development.md
upstream_blob: 805782c463766bd7614ee59caf65b13b64b2eb4a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development
---

# Test Driven Development {#test-driven-development}

TDD: RED-GREEN-REFACTOR を守り、コードより先にテストを書きます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/software-development\test-driven-development` |
| バージョン | `1.1.0` |
| 作者 | Hermes Agent（obra/superpowers から取り入れています） |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `testing`, `tdd`, `development`, `quality`, `red-green-refactor` |
| 関連 skill | [`systematic-debugging`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging/), [`subagent-driven-development`](/hermes/docs/user-guide/skills/optional/software-development/software-development-subagent-driven-development/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# テスト駆動開発（TDD） {#test-driven-development-tdd}

## 概要 {#overview}

先にテストを書きます。失敗するのを見届けます。それを通す最小限のコードを書きます。

**基本の考え方:** テストが失敗するところを見ていないなら、そのテストが正しいものを見ているかどうかもわかりません。

**決まりの文言を破ることは、決まりの精神を破ることです。**

## 使いどころ {#when-to-use}

**いつでも:**

- 新しい機能
- 不具合の修正
- リファクタリング
- ふるまいの変更

**例外（先に利用者に確認します）:**

- 使い捨ての試作
- 生成されたコード
- 設定ファイル

「今回だけ TDD を飛ばそう」と考えていませんか。やめてください。それは自分への言い訳です。

## 鉄の掟 {#the-iron-law}

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

テストより先にコードを書いてしまったら、消します。やり直します。

**例外はありません。**

- 「参考用」に残さない
- テストを書きながらそれを「取り込む」ことをしない
- 見ない
- 消すというのは、本当に消すことです

テストから新しく実装し直します。以上です。

## RED-GREEN-REFACTOR の周回 {#red-green-refactor-cycle}

### RED — 失敗するテストを書く {#red-write-failing-test}

何が起きてほしいのかを示す、最小のテストを 1 本書きます。

**よいテスト:**

```python
def test_retries_failed_operations_3_times():
    attempts = 0
    def operation():
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise Exception('fail')
        return 'success'

    result = retry_operation(operation)

    assert result == 'success'
    assert attempts == 3
```

名前がはっきりしていて、実際のふるまいを見ていて、見ている対象がひとつです。

**よくないテスト:**

```python
def test_retry_works():
    mock = MagicMock()
    mock.side_effect = [Exception(), Exception(), 'success']
    result = retry_operation(mock)
    assert result == 'success'  # What about retry count? Timing?
```

名前があいまいで、実際のコードではなくモックを見ています。

**満たすべきこと:**

- 1 本のテストで見るふるまいはひとつ
- 名前は具体的にはっきりと（名前に「and」が入るなら分けます）
- モックではなく実際のコードを使う（どうしても避けられない場合を除く）
- 名前は実装ではなくふるまいを表す

### RED を確かめる — 失敗するのを見届ける {#verify-red-watch-it-fail}

**必須です。絶対に飛ばさないでください。**

```bash
# Use terminal tool to run the specific test
pytest tests/test_feature.py::test_specific_behavior -v
```

次を確かめます。

- テストが失敗している（打ち間違いによるエラーではない）
- 失敗メッセージが想定どおり
- 機能がまだ無いことが理由で失敗している

**いきなり通ってしまいましたか。** それはすでにあるふるまいを見ています。テストを直してください。

**エラーになりましたか。** エラーを直し、正しく失敗するまで走らせ直します。

### GREEN — 最小限のコード {#green-minimal-code}

テストを通すいちばん単純なコードを書きます。それ以上は書きません。

**よい例:**

```python
def add(a, b):
    return a + b  # Nothing extra
```

**よくない例:**

```python
def add(a, b):
    result = a + b
    logging.info(f"Adding {a} + {b} = {result}")  # Extra!
    return result
```

機能を足したり、他のコードをリファクタリングしたり、テストの範囲を超えて「よくする」ことはしません。

**GREEN ではズルをしてかまいません。**

- 戻り値を決め打ちする
- コピー＆ペーストする
- コードを重複させる
- 端のケースを飛ばす

REFACTOR で直します。

### GREEN を確かめる — 通るのを見届ける {#verify-green-watch-it-pass}

**必須です。**

```bash
# Run the specific test
pytest tests/test_feature.py::test_specific_behavior -v

# Then run ALL tests to check for regressions
pytest tests/ -q
```

次を確かめます。

- テストが通る
- 他のテストも通ったまま
- 出力がきれい（エラーも警告も出ていない）

**テストが落ちましたか。** テストではなくコードを直します。

**他のテストが落ちましたか。** その場で直します。

### REFACTOR — 整える {#refactor-clean-up}

緑になってからだけ、次を行います。

- 重複を取り除く
- 名前をよくする
- 補助関数に切り出す
- 式を簡単にする

その間ずっとテストは緑のままにします。ふるまいは足しません。

**リファクタリング中にテストが落ちたら:** すぐ元に戻します。もっと小さく刻みます。

### 繰り返す {#repeat}

次のふるまいのために、次の失敗するテストを書きます。一度に回すのは 1 周だけです。

## 横に切らない {#avoid-horizontal-slices}

テストを全部書いてから実装を全部書く、というやり方は**避けてください**。それは横に切るやり方です。RED が「想像で書いたテストの山を積むこと」になり、GREEN が「その山を通すこと」になります。実装から「どのふるまいとどの窓口が本当に大事か」を学ぶ前にテストを設計してしまうので、壊れやすいテストができあがります。

代わりに、縦に貫く曳光弾を使います。

```text
WRONG:
  RED:   test1, test2, test3, test4
  GREEN: impl1, impl2, impl3, impl4

RIGHT:
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
```

曳光弾とは、端から端まで貫くふるまいの一切れです。その経路が通ることを証明し、窓口の形を教えてくれ、次のテストを、今わかったことに根ざしたものに保ってくれます。

## 順番が大事な理由 {#why-order-matters}

**「動くことを確かめるために、あとでテストを書きます」**

コードのあとに書いたテストは、その場で通ります。その場で通っても、何も証明しません。

- 見当違いのものを見ているかもしれない
- ふるまいではなく実装を見ているかもしれない
- 忘れていた端のケースを取りこぼしているかもしれない
- そのテストが不具合をつかまえる場面を、一度も見ていない

テストを先に書けば、失敗を目にすることになり、そのテストが本当に何かを見ていると証明できます。

**「端のケースはもう全部手で確かめました」**

手で確かめるのは、その場かぎりのやり方です。全部やったつもりでも、こうなります。

- 何を確かめたのか記録が残らない
- コードが変わったときに、やり直せない
- 追い込まれると、ケースを忘れやすい
- 「やってみたら動いた」は、網羅とは違う

自動テストは順序立っています。いつでも同じやり方で走ります。

**「何時間もかけた成果を消すのはもったいない」**

それは埋没費用の錯覚です。かけた時間はもう戻りません。今の選択肢はこうです。

- 消して、TDD で書き直す（自信を持てる）
- そのまま残して、あとからテストを足す（自信は薄く、不具合が残りやすい）

「もったいない」のは、信用できないコードを抱え続けることのほうです。

**「TDD は教条的です。現実的にやるとは、やり方を場に合わせることです」**

TDD こそ現実的です。

- コミット前に不具合が見つかる（あとからデバッグするより速い）
- 後戻りを防ぐ（壊れた瞬間にテストがつかまえる）
- ふるまいの説明になる（テストが使い方を示す）
- リファクタリングを可能にする（自由に変えても、壊れればテストが気づく）

「現実的」という名の近道は、本番でのデバッグにつながり、結局は遅くなります。

**「あとから書くテストでも狙いは同じです。形式ではなく精神が大事です」**

違います。あとから書くテストは「これは何をするのか」に答えます。先に書くテストは「これは何をすべきか」に答えます。

あとから書くテストは、自分の実装に引きずられます。求められているものではなく、作ったものを見てしまいます。先に書くテストは、実装の前に端のケースを見つけさせます。

## よくある言い訳 {#common-rationalizations}

| 言い訳 | 実際のところ |
|--------|---------|
| 「単純すぎてテストするまでもない」 | 単純なコードも壊れます。テストは 30 秒で書けます。 |
| 「あとでテストします」 | その場で通るテストは、何も証明しません。 |
| 「あとから書いても狙いは同じ」 | あとから書くと「これは何をするのか」、先に書くと「これは何をすべきか」になります。 |
| 「もう手で確かめました」 | その場かぎりのやり方は、順序立てたやり方とは違います。記録も残らず、やり直せません。 |
| 「何時間もかけたものを消すのはもったいない」 | 埋没費用の錯覚です。確かめていないコードを抱えるほうが負債です。 |
| 「参考に残して、テストは先に書きます」 | 結局それを取り込みます。それはあとから書くのと同じです。消すというのは、本当に消すことです。 |
| 「まず試しに触ってみないと」 | かまいません。触った分は捨てて、TDD で始め直します。 |
| 「テストしにくい＝設計がはっきりしていない」 | テストの声を聞いてください。テストしにくいものは、使いにくいものです。 |
| 「TDD だと遅くなる」 | TDD はデバッグより速いです。現実的なやり方とは、テストを先に書くことです。 |
| 「手で確かめるほうが速い」 | 手作業では端のケースを証明できません。変更のたびに確かめ直すことになります。 |
| 「今あるコードにはテストがない」 | あなたはそれをよくしているところです。触ったコードの分だけテストを足します。 |

## 危険なサイン — 止まってやり直す {#red-flags-stop-and-start-over}

次のどれかをしていることに気づいたら、コードを消して TDD でやり直します。

- テストより先にコードを書いている
- 実装のあとにテストを書いている
- テストが最初の実行でいきなり通る
- なぜテストが失敗したのか説明できない
- テストを「あとで」足している
- 「今回だけ」と自分に言い訳している
- 「もう手で確かめました」
- 「あとから書くテストでも狙いは同じです」
- 「参考に残す」「今あるコードを取り込む」
- 「もう何時間もかけたので、消すのはもったいない」
- 「TDD は教条的です。私は現実的にやっています」
- 「これは事情が違って……」

**どれも意味するところは同じです。コードを消し、TDD でやり直します。**

## 確認リスト {#verification-checklist}

作業を終えたと言う前に、確かめます。

- [ ] 新しい関数・メソッドには、すべてテストがある
- [ ] 実装の前に、テストが失敗するのを毎回見届けた
- [ ] どのテストも想定どおりの理由で失敗した（打ち間違いではなく、機能が無いこと）
- [ ] 各テストを通す最小限のコードを書いた
- [ ] テストがすべて通る
- [ ] 出力がきれい（エラーも警告も出ていない）
- [ ] テストは実際のコードを使っている（モックはどうしても避けられないときだけ）
- [ ] 端のケースとエラーを押さえている

全部にチェックを入れられませんか。それは TDD を飛ばしています。やり直してください。

## 行き詰まったとき {#when-stuck}

| 困りごと | 対処 |
|---------|----------|
| どうテストすればいいかわからない | 欲しい窓口の形を書いてみます。まず検査したいことを書きます。利用者に聞きます。 |
| テストが複雑すぎる | 設計が複雑すぎます。窓口を簡単にします。 |
| 何もかもモックしないと動かない | コードの結び付きが強すぎます。依存の受け渡しを外から行う形にします。 |
| テストの準備が大きすぎる | 補助関数に切り出します。それでも複雑なら、設計を簡単にします。 |

## Hermes Agent との組み合わせ {#hermes-agent-integration}

### テストを走らせる {#running-tests}

各段階で、`terminal` ツールを使ってテストを走らせます。

```python
# RED — verify failure
terminal("pytest tests/test_feature.py::test_name -v")

# GREEN — verify pass
terminal("pytest tests/test_feature.py::test_name -v")

# Full suite — verify no regressions
terminal("pytest tests/ -q")
```

### delegate_task と組み合わせる {#with-delegatetask}

実装をサブエージェントに任せるときは、依頼内容の中で TDD を守らせます。

```python
delegate_task(
    goal="Implement [feature] using strict TDD",
    context="""
    Follow test-driven-development skill:
    1. Write failing test FIRST
    2. Run test to verify it fails
    3. Write minimal code to pass
    4. Run test to verify it passes
    5. Refactor if needed
    6. Commit

    Project test command: pytest tests/ -q
    Project structure: [describe relevant files]
    """,
    toolsets=['terminal', 'file']
)
```

### systematic-debugging と組み合わせる {#with-systematic-debugging}

不具合を見つけましたか。それを再現する失敗するテストを書きます。そのうえで TDD の周回を回します。そのテストが修正を証明し、再発を防ぎます。

テストなしで不具合を直してはいけません。

## テストのアンチパターン {#testing-anti-patterns}

- **実際のふるまいではなくモックのふるまいを見ている** — モックはやり取りを確かめるためのもので、対象そのものを置き換えるものではありません
- **実装の細部を見ている** — 内部でどのメソッドが呼ばれたかではなく、ふるまいと結果を見ます
- **うまくいく道筋しか見ていない** — 端のケース、エラー、境目を必ず見ます
- **壊れやすいテスト** — テストは構造ではなくふるまいを見るべきで、リファクタリングで壊れてはいけません

## 最後の決まり {#final-rule}

```
Production code → test exists and failed first
Otherwise → not TDD
```

利用者がはっきり認めた場合を除いて、例外はありません。
