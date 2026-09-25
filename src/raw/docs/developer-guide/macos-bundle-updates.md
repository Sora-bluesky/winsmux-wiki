---
title: "macOS バンドルの更新"
description: ""
upstream_path: developer-guide/macos-bundle-updates.md
upstream_blob: 3e1aa2aab2a5c50bd258068193c9d814d3a5a77f
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/macos-bundle-updates
---

# macOS バンドルの更新 {#macos-bundle-updates}

タグ付きの macOS バンドルは `electron-updater` で更新されます。同梱版と Light 版の刻印には、
その更新の担い手が記されています。Stable と Canary は別々のアプリケーション ID を持ち、それぞれ
ビルド時に焼き込まれたチャンネルの中で更新されます。開発用やブートストラップでのインストールは、
引き続きチェックアウトの更新を使います。

単発のビルドは `source: commit-build` を持ち、アップデーターがありません。パッケージの
ID に短いコミット SHA が含まれるため、異なるコミットのビルドを共存させられます。
更新の確認や適用を求めると、開発者が新しいビルドを用意する必要があると説明されます。
これはデスクトップと同梱の CLI に当てはまるもので、デスクトップが接続する無関係なリモートの
バックエンドには当てはまりません。

## フィードの取り決め {#feed-contract}

チャンネルの登録は、リポジトリにコミットされたチャンネル対応表ではなく、R2 の `releases/channels/NAME.json` にあります。
チャンネル用のバンドルは、変更できないネイティブのフィードを選ぶ前に、その記録と、ダイジェストで紐づいた
ビルドのマニフェストを解決します。受理されたリクエストは、ビルドをまたいでアプリケーション ID を変えずに保ち、
増えていくネイティブのパッケージバージョンとは別に、元になったコミットを記録します。

既存のタグ付きクライアントは、ネイティブのフィード URL をそのまま使い続けます。汎用の
`apps/desktop/update-feed.cjs` アダプターはこうした従来のパスを計算するだけで、チャンネルの
登録はしません。ビルダーは従来の URL を `app-update.yml` に書き込みます。
`updates.desktop_feed_base_url` を使うと、バケットの基底 URL を明示的に指定できます。

- Stable: `releases/darwin/stable/stable-mac.yml`
- Canary: `releases/darwin/canary/canary-mac.yml`
- Light: 同じパスの `darwin/` とチャンネルの間に `light/` を挟んだもの。
- 成果物: `releases/tag/TAG/FILENAME`。ダウンロードリンクとフィードで共有します。
- チャンネルビルドの成果物とネイティブのメタデータ: `releases/channel-builds/BUILD_ID/`。

チャンネルの廃止は、ネイティブの更新とは別の操作です。古いチャンネルは、自身のネイティブフィード内にある
名前の違うパッケージではなく、条件を満たした公式の移行先を指します。明示的な移行操作では、ユーザーの状態を保ち、
プレビュー版のアプリケーションを削除する前に移行先の準備ができていることを確かめなければなりません。
条件を満たした受け手のマニフェストを変更しないまま保つことで、移行先のチャンネルが先に進んだあとでも、
オフラインだったプレビュー版が移行できます。移行後の更新は移行先が担います。

現在のワークフローは、同梱版を ARM64 と Intel のランナーでビルドします。
Light 版はクライアントとフィードの振り分けが別になっていますが、この変更ではリリースのマトリクスに含まれていません。

`python -m scripts.releases.r2 finalize` には、アーキテクチャごとに1つずつ、
`arm64-CHANNEL-mac.yml` と `x64-CHANNEL-mac.yml` という名前のメタデータファイルが必要です。バージョン、
バリアント、アーキテクチャ、ハッシュが誤っているものや、従来のパスのフィールドが食い違っているものは拒否されます。
参照されている ZIP/DMG はそれぞれ読み戻され、SHA-512 とサイズが照合されます。
公開の際は、稼働中のバージョンを確認し、ETag を条件にして置き換え、
できあがったフィードを読み戻します。同じタグの macOS 成果物を、中身の違うバイト列で
上書きすることはできません。内容が変わるフィードには `Cache-Control: no-store` を使います。
Canary の保持処理は、稼働中のフィードが参照している成果物と blockmap を守ります。
フィードが読めない場合は、古いものの削除を行いません。

## クライアント側の流れ {#client-lifecycle}

更新の確認で自動的にダウンロードすることはありません。適用するとリリースを確認し直してダウンロードし、
Squirrel.Mac が署名済みのアプリを受け入れるのを待ちます。そこで初めて Hermes は
アプリが持つバックエンドを止め、インストールと再起動を求めます。更新と関係のない終了では
インストールは始まりません。ダウンロードやネイティブの検証に失敗した場合、
バックエンドは動いたままです。同時に行われた確認が、適用中の操作の対象を置き換えることはありません。
既存のチェックアウト用アップデーターは、封印されたアプリのバンドルを書き換えません。

## リリース環境 {#release-environment}

既存の `release-signing` 環境が次のものを提供します。

- `CSC_LINK` と `CSC_KEY_PASSWORD`: Developer ID Application の署名 ID。
- `APPLE_API_KEY_P8`、`APPLE_API_KEY_ID`、`APPLE_API_ISSUER`: 公証。
- `CLOUDFLARE_R2_ACCOUNT_ID`、`CLOUDFLARE_R2_ACCESS_KEY_ID`、
  `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: バケットにアクセスするためのシークレット。
- `CLOUDFLARE_R2_BUCKET`、`CLOUDFLARE_R2_PUBLIC_URL`: リポジトリまたは環境の変数。

公開には Apple の認証情報が必要です。公証は既存の署名後フックが担うため、
electron-builder 側の2つ目の公証経路は無効にしています。
公開ゲートは、署名、ステープルされたチケット、Gatekeeper の評価を検証します。
Darwin の公開ジョブは、両方のネイティブビルドを待ってから、チャンネルへの書き込みを1つずつ順に行います。

## 検証の限界 {#verification-limits}

補助テストは、更新の方式、ネイティブイベントの順序、フィードの検証、
条件付きの公開、保持処理を確かめます。これらは、署名済みパッケージのインストールや
実際のアプリの置き換えを証明するものではありません。

macOS のパッケージ更新をネイティブで動かすドライバーは、既存の
[インストール・更新の一群](https://github.com/NousResearch/hermes-agent/blob/main/tests/install/BUNDLED_UPDATES.md)に含まれます。Stable のゲートでは、
両方のアーキテクチャで署名済みパッケージの移行が求められます。受け入れを主張するには、
その主張ごとに、まさにその新旧パッケージの組み合わせでネイティブの実行が成功している必要があります。
ワークフローの定義や過去の補助テストの結果は、現在の head の受け入れを
裏づけるものではありません。範囲を絞った証跡については [PM 監査の状況](/hermes/docs/developer-guide/pm-audit-status/)を参照してください。
