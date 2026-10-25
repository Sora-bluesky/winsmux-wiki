---
title: Hermes Agent Wiki
description: Hermes Agent の日本語知識ベース。公式ドキュメント全ページの日本語版に、逆引き・トラブル対処・料金の早見をのせた非公式サイト。
sources:
  - https://hermes-agent.nousresearch.com/docs/
hermes_version: "0.22.5"
confidence: high
raw: /hermes/raw/index.md
---

# Hermes Agent Wiki

**Hermes Agent の日本語ドキュメント。毎日更新、AI にも渡せる。**

公式ドキュメント全400ページ超の日本語版に、逆引き・トラブル対処・料金の早見をのせています。全ページに AI へ渡せる Markdown 版（/hermes/raw/…）があります。本サイトは NousResearch とは無関係の**非公式**サイトで、正本は常に [Hermes Agent Documentation](https://hermes-agent.nousresearch.com/docs/) です。毎日、公式の更新に追随しています。

## 調べる（このサイト独自のページ）

- [逆引き](/hermes/howto/) — 「〜したい」から最短の手順ページへ
- [トラブル](/hermes/trouble/) — 症状から原因と対処を引く表
- [モデルと料金](/hermes/models/) — Portal 掲載の全モデルの価格・割引・無料枠。毎日自動更新
- [料金と実例](/hermes/cost/) — 費用構造と価格の実例
- [Claude Code からの乗り換え](/hermes/from-claude-code/) — 概念の対応表と移行の考え方
- [日本語入力と日本語化](/hermes/japanese/) — 日本語で使う設定と既知問題の現在地
- [更新履歴](/hermes/updates/) — 公式 docs への追随記録
- [コミュニティの動き](/hermes/community/) — 公式 Discord の話題の週次日本語要約

## レベルに合わせて読む

- [初めての方へ](/hermes/first/) — インストールから最初の会話まで。次の一歩だけ
- [ふだんの使いかた](/hermes/guide/) — よく使うページの案内
- [どこまで任せるか](/hermes/trust/) と [運用](/hermes/ops/) — 任せかたと常時稼働

## 管理人より

### このサイトを作った理由

Hermes Agent には、日本語のドキュメントがありません。英語の公式ドキュメントのところで止まってしまう人を減らしたくて、日本語版を作りました。公式ドキュメントを毎日取り込んで日本語にし、「〜したい」から引ける[逆引き](/hermes/howto/)と、症状から原因をたどる[表](/hermes/trouble/)を足しています。公式の日本語版が出たら、このサイトは役目を終えます。

### そらの Hermes の使い方

- **動かしている場所**：月 1,800 円ほどの国内 VPS に常駐させています。家の PC を起動しておかなくても、スマホの Telegram から話しかけられます
- **毎朝の定時実行**：Teknium と Nous Research の Hermes についての投稿を集めさせ、日本語の要約を Telegram に届けさせています。コードは書かず、チャットで頼んだだけです
- **いちばん多い使い方は調べもの**：たとえば Reddit での評判を調べさせ、関心の高い話題を 5 つにまとめさせました
- **重い作業は自宅の PC へ**：VPS から、自宅 PC（RTX 4070）の Claude Code や Codex、ローカルモデルに回しています
- **困ったこと**：Telegram の受信だけが、何も言わずに止まったことがあります（v0.17.0 からは自動で戻ります）

手順と画面は Zenn の連載「[Hermes Agent 完全構築ガイド](https://zenn.dev/sora_biz/articles/hermes-vps-complete-guide)」にまとめています。（管理人: そら / [@sora_biz](https://x.com/sora_biz)）

## 動画で学ぶ（外部の解説動画）

- [Hermes Agent Masterclass（Tonbi's AI Garage）](https://www.youtube.com/watch?v=BeWUUclCin0&list=PLmpUb_PWAkDx-VWjh00tVCji794xAa_IX) — 導入から実際に動かすところまでを扱う YouTube の連続講座。音声は英語だが、プレーヤーの設定 → 音声トラック → 日本語 で日本語音声に切り替えられる

## ドキュメント（公式 docs の日本語版）

- [Hermes Agentをインストールする](/hermes/docs/getting-started/quickstart/)
- [メッセージ窓口の一覧](/hermes/docs/user-guide/messaging/) — LINE、Telegram、Discord、Slack など
- [skill の索引](/hermes/guide/skills/) — 用途からさがせます
- [すべての索引](/hermes/guide/all/) — 公式全ページの日本語版一覧
