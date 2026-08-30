---
title: "Grill Me — 実装に入る前に、計画を厳しく問いただす"
description: "実装に入る前に、計画を厳しく問いただす"
upstream_path: user-guide/skills/optional/software-development/software-development-grill-me.md
upstream_blob: 1890f819a5570d38c6b036aff42b7c81f38deb4e
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/software-development/software-development-grill-me
---

# Grill Me {#grill-me}

実装に入る前に、計画を厳しく問いただします。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/software-development/grill-me` で導入します |
| パス | `optional-skills/software-development\grill-me` |
| バージョン | `2.0.0` |
| 作者 | Rafael Zendron (rafaumeu) + Matt Pocock (mattpocock/skills, grilling) + Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `planning`, `adversarial`, `interview`, `decision-tree`, `pre-implementation`, `review`, `alignment` |
| 関連 skill | [`requesting-code-review`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review/), [`subagent-driven-development`](/hermes/docs/user-guide/skills/optional/software-development/software-development-subagent-driven-development/), [`test-driven-development`](/hermes/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development/) |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Grill Me {#grill-me}

コードを1行も書かないうちに、筋道を立てた厳しい質問で計画を揺さぶります。計画を
**設計の木**として捉え（ある判断は、そこにぶら下がる次の判断へと枝分かれしていきます）、
すべての枝に決着が付き、暗黙のうちに前提にしているものがなくなるまで、何巡かに分けて
利用者に質問していきます。

もとの skill が持っていた段階の踏み方に、mattpocock/skills の `grilling` にある
フロンティア巡回のしくみを組み合わせたものです。

## こんなときに使います {#when-to-use}

- 利用者が「grill me」「計画を詰めて」「この案を叩いて」と言ったとき
- 認証の流れ、スキーマ変更、移行、決済など、込み入った作業に入る前
- 計画に未決の判断が残っている、あるいはどこか漠然としているとき
- `subagent-driven-development` で作業を分解する前

すでにあるコードには使わないでください（その場合は `requesting-code-review` を使います）。
一度きりの単純な作業にも向きません。

## 事前に必要なもの {#prerequisites}

ありません。どんな計画にも、まだ形になっていない思いつきにも使えます。

## 中心のしくみ: フロンティア巡回 {#core-mechanic-frontier-rounds}

計画を設計の木として描きます。**フロンティア**とは、前提となる判断がすでに片付いている
判断のことです。つまり、まだ聞いていない答えを推測しなくても、今すぐ聞ける質問のことです。

作業は**巡回**の形で進めます。いまのフロンティアにある質問をすべて、番号を振って1つの
メッセージにまとめ、それぞれに自分の推奨する答えを添えて送ります。そして待ちます。
その巡回でまだ答えの出ていない質問に答えが左右される質問は、この巡回ではなく後の巡回に
回してください。

各巡回はこの形式で書きます。

```
❓ Q1 — <question title>: <question body, options if relevant>
➡️ Recommendation: <your recommended answer + one-line why>

❓ Q2 — <question title>: <question body>
➡️ Recommendation: <...>
```

答えが返るたびに木の形が変わります。決着した判断がフロンティアを外へ押し広げ、
それ待ちだった質問が動き出します。フロンティアを計算し直して、次の巡回を送ってください。

**事実を調べるのは自分の仕事、決めるのは利用者の仕事です。** フロンティアの質問に環境側の
事実（コードベース、ファイル、設定、ドキュメント）が必要なら、`search_files` /
`read_file` / `terminal` で自分で調べます。調査が重いなら `delegate_task` でサブ
エージェントに任せます。自分で調べられることを利用者に聞いてはいけません。調査の完了を
待って手を止める必要もありません。待つのはその調査の下流にある質問だけで、残りの
フロンティアは今すぐ聞いてください。

## 質問の範囲（この枝を木に組み込みます） {#question-coverage-work-these-branches-into-the-tree}

**理解** — 本当の目的と境目について。
- 実際の目的は何か。何が範囲に入り、何が明確に範囲外か。
- 制約は何か（期間、技術、体制、予算）。使うのは誰か。

**技術的な判断** — 設計上の選択それぞれについて。
- 「なぜ X ではなくこのやり方なのか」「Y が失敗したらどうなるか」
- 「最悪の場合はどうなるか」「どう切り戻すか」
- 既存のコードベースと突き合わせます。同じことをする型がすでにプロジェクトにあるなら、
  それを指摘します。

**境界の場合:**
- 「利用者が Z をしたらどうなるか」「依存先の X が落ちたらどうなるか」
- 「量が想定の100倍になったら」「セキュリティ面への影響は」

## まとめ（フロンティアが空になったら） {#synthesis-when-the-frontier-is-empty}

1. 決まったことをすべて箇条書きにまとめます
2. 未決のまま残っているもの、および明確に範囲外としたものを挙げます
3. 「認識は合っていますか。実装に入ってよいですか、それとも直すところがありますか」と尋ねます

理解が一致したと利用者が答えるまで、計画を実行に移してはいけません。

## つまずきやすいところ {#pitfalls}

1. **依存の順序を無視して質問してしまう。** まだ答えの出ていない質問に左右される質問は、
   疑問符を付けた当て推量でしかありません。後の巡回まで取っておきます。
2. **コードベースを見ないで済ませてしまう。** 事実は Hermes のツールでコードから探します。
   利用者に聞くのではありません。
3. **「分かりません」をそのまま受け入れてしまう。** 選択肢を示し、それぞれの得失を説明し、
   推奨を出してください。
4. **問いただしている最中にコードを書いてしまう。** ここでやるのは認識合わせだけです。
   コードは、はっきり許可が出てからです。
5. **調子を合わせすぎてしまう。** 問題を見つけるのが役目です。どこも問題なく見えるなら、
   もっと深く見てください。
6. **利用者の言語に合わせない。** 利用者が話す言語で聞き取りを行ってください。

## 確認 {#verification}

- [ ] 各巡回のすべての質問について、前提となる判断がすでに決着していた
- [ ] 質問ごとに推奨を添えた
- [ ] 利用者に聞く代わりに、コードベースを調べて事実を集めた
- [ ] まとめに入る前にフロンティアが空になっていた（暗黙に前提にした枝がない）
- [ ] 決まったことと未決の項目を、はっきりした形でまとめた
- [ ] 終わる前に、利用者と認識が一致していることを確かめた
