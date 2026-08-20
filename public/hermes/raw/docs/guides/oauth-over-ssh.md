---
title: "SSH / リモートホスト越しの OAuth"
description: "Hermes をリモートのマシンやコンテナ、踏み台の向こうで動かしているときに、ブラウザを使う OAuth（Spotify、MCP サーバー）を完了させる方法"
upstream_path: guides/oauth-over-ssh.md
upstream_blob: c58aeb401d48f3666425d4ecf1ac4f3e196ec053
sources:
  - https://hermes-agent.nousresearch.com/docs/guides/oauth-over-ssh
---

# SSH / リモートホスト越しの OAuth {#oauth-over-ssh-remote-hosts}

Hermes のプロバイダーのうち、**Spotify** と**リモートの MCP サーバー**（Linear、Sentry、Atlassian、Asana、Figma など）は、*ループバックへ戻ってくる* 方式の OAuth を使います。認証サーバーがブラウザを `http://127.0.0.1:<port>/callback` へ転送し、Hermes が立ち上げた小さな HTTP の待ち受けが認可コードを受け取るしくみです。

Hermes とブラウザが同じマシンにあるなら、これは問題なく動きます。壊れるのは両者が別のマシンにあるときです。手元のノート PC のブラウザは**そのノート PC の** `127.0.0.1` を見に行きますが、待ち受けているのは**リモートのサーバーの** `127.0.0.1` だからです。

解決策は、SSH のローカル転送を 1 行足すことです。対話的な端末で MCP サーバーを使う場合は、代わりに転送先の URL を貼り戻すやり方でも済むことが多く、そのときはトンネルが要りません。

**xAI Grok OAuth（`xai-oauth`）は OAuth のデバイスコード方式**を使っており、ループバックへのコールバックは使いません。表示された確認用 URL をどれかのブラウザで開けば、Hermes が承認されるまで問い合わせ続けます。SSH のトンネルは不要です。[xAI Grok OAuth](/hermes/docs/guides/xai-grok-oauth/) を参照してください。

## 要点だけ {#tldr}

```bash
# On your local machine (laptop), in a separate terminal:
ssh -N -L 43827:127.0.0.1:43827 user@remote-host

# In your existing SSH session on the remote machine:
hermes auth spotify --no-browser
# → Hermes prints an authorize URL. Open it in a browser on your laptop.
# → Your browser redirects to 127.0.0.1:43827/callback, the tunnel forwards
#   the request to the remote listener, login completes.
```

Hermes は実際に使ったポートを `Waiting for callback on ...` の行に表示します。そこから写してください。Spotify の既定は `43827` 番です。

## トンネルが必要なプロバイダー {#which-providers-need-this}

| プロバイダー | ループバックのポート | トンネルは必要か |
|----------|---------------|----------------|
| Spotify | `43827`（既定） | 必要。Hermes がリモートにある場合 |
| MCP サーバー（`auth: oauth`） | サーバーごとに自動で選ばれます | 必要。Hermes がリモートにある場合（または転送先 URL を貼り戻す） |
| `xai-oauth`（Grok SuperGrok） | 該当なし | 不要。デバイスコード方式 |
| `anthropic`（Claude Pro/Max） | 該当なし | 不要。コードを貼る方式 |
| `openai-codex`（ChatGPT Plus/Pro） | 該当なし | 不要。デバイスコード方式 |
| `minimax`、`nous-portal` | 該当なし | 不要。デバイスコード方式 |

この表にないプロバイダーなら、トンネルは要りません。

## MCP サーバー {#mcp-servers}

リモートの MCP サーバー（Linear、Sentry、Atlassian、Asana、Figma など）も、同じループバック転送の方式を使います。Hermes はサーバーごとに空いているポートを自動で選び、OAuth が始まったところで認可用の URL を表示します。表示されるのは、`mcp_servers:` に新しいサーバーが増えたときの起動時か、`hermes mcp login <server>` を実行したときです。

リモートのホストから完了させる方法は 2 つあります。

**方法 1 — 転送先の URL を貼り戻す（準備不要で、どこでも使えます）。** 対話的な端末では、ローカルの待ち受けを動かすのと並行して、Hermes が転送先 URL の貼り付けを促します。ブラウザで承認すると `http://127.0.0.1:<port>/callback` への転送で接続エラーの画面になりますが、これは想定どおりです。**ブラウザのアドレス欄にある URL 全体**を写して、Hermes のプロンプトに貼り付けてください。

```
  MCP OAuth: authorization required.
  Open this URL in your browser:

    https://mcp.linear.app/authorize?response_type=code&...

  Or paste the redirect URL here (or the ?code=...&state=... portion) and press Enter:
> https://mcp.linear.app/callback?code=abc123&state=xyz
  Got authorization code from paste — completing flow.
```

`?code=...&state=...` のクエリ文字列だけでも受け付けます。これは `auth: oauth` のどの MCP サーバーでも使え、SSH の設定を変える必要もありません。

**方法 2 — SSH のポート転送（Spotify と同じ）。** Hermes は SSH セッション向けの案内に、実際に使ったポートを表示します。手元のノート PC で別の端末を開いてください。

```bash
ssh -N -L <port>:127.0.0.1:<port> user@remote-host
```

あとは、いつもどおり認可用の URL をブラウザで開けば、転送がトンネルを通って待ち受けに届きます。人が付かずに完了させたいとき（貼り付け操作ができない自動の再認証など）は、こちらを使ってください。

**落とし穴 — 30 秒で打ち切られる設定の読み込み直し。** Hermes のセッションを動かしたまま `~/.hermes/config.yaml` を編集して OAuth の MCP サーバーを足すと、CLI が 30 秒のタイムアウト付きで MCP の接続を読み込み直します。対話的な OAuth を終えるには短すぎて、読み込み直しは途中であきらめてしまいます。代わりに、新しい端末から `hermes mcp login <server>` を実行してください。こちらには打ち切りがなく、貼り戻すまで 5 分間待ってくれます。

## 待ち受けを 0.0.0.0 に開けない理由 {#why-the-listener-cant-just-bind-0000}

Spotify と多くの MCP の OAuth サーバーは、`redirect_uri` のパラメーターを許可リストと照らし合わせます。どちらもループバックの形（`http://127.0.0.1:<exact-port>/callback`）を要求します。待ち受けを `0.0.0.0` や別のポートに開くと、認証サーバーは redirect_uri の不一致としてリクエストを拒否します。SSH のトンネルなら、ループバックの URI を端から端までそのまま保てます。

## 手順: SSH が 1 段の場合 {#step-by-step-single-ssh-hop}

### 1. 手元のマシンからトンネルを張る {#1-start-the-tunnel-from-your-local-machine}

```bash
# Spotify (port 43827)
ssh -N -L 43827:127.0.0.1:43827 user@remote-host
```

`-N` は「リモートのシェルは開かず、トンネルを保つだけ」という意味です。ログインが終わるまで、この端末は開いたままにしておいてください。

### 2. 別の SSH セッションで認証のコマンドを実行する {#2-in-a-separate-ssh-session-run-the-auth-command}

```bash
ssh user@remote-host
hermes auth spotify --no-browser
```

Hermes は SSH のセッションであることを見分けてブラウザの自動起動をやめ、認可用の URL と `Waiting for callback on http://127.0.0.1:<port>/callback` の行を表示します。

### 3. 手元のブラウザでその URL を開く {#3-open-the-url-in-your-local-browser}

リモートの端末から認可用 URL を写して、ノート PC のブラウザに貼り付けます。同意の画面で承認すると、認証サーバーが `http://127.0.0.1:<port>/callback` へ転送します。ブラウザがトンネルに入り、リクエストがリモートの待ち受けへ届いて、Hermes が `Login successful!` と表示します。

成功の行が出たら、最初の端末で Ctrl+C を押してトンネルを畳んで構いません。

## 手順: 踏み台を経由する場合 {#step-by-step-through-a-jump-box}

踏み台（bastion）を通って Hermes に届いている場合は、SSH に組み込みの `-J`（ProxyJump）を使います。

```bash
ssh -N -L 43827:127.0.0.1:43827 -J jump-user@jump-host user@final-host
```

これで、踏み台にループバックのポートを置かずに、SSH の接続を踏み台越しにつなげます。ノート PC の `127.0.0.1:43827` は、最終的なリモートホストの `127.0.0.1:43827` までまっすぐ通ります。

`-J` に対応していない古い OpenSSH では、長い書き方になります。

```bash
ssh -N \
    -o "ProxyCommand=ssh -W %h:%p jump-user@jump-host" \
    -L 43827:127.0.0.1:43827 \
    user@final-host
```

## Mosh、tmux、ssh の ControlMaster {#mosh-tmux-ssh-controlmaster}

トンネルは、その下にある SSH の接続に属するものです。mosh のセッションの中の `tmux` で Hermes を動かしている場合、mosh の接続の移り変わりには `-L` の転送が付いてきません。`-L` のトンネル**専用**に、素の SSH セッションを*別に*開いてください。認証のあいだ生きている必要があるのは、その接続です。対話用の mosh / tmux のセッションのほうは、そのまま Hermes を動かし続けて構いません。

`ssh -o ControlMaster=auto` を使っている場合、多重化された接続でのポート転送は親の接続と寿命を共にします。トンネルが立ち上がらないときは、親を張り直してください。

```bash
ssh -O exit user@remote-host
ssh -N -L 43827:127.0.0.1:43827 user@remote-host
```

## うまくいかないとき {#troubleshooting}

### `bind [127.0.0.1]:43827: Address already in use` と出る {#bind-12700143827-address-already-in-use}

手元のマシンで、そのポートをすでに何かが使っています。前のトンネルがきれいに終わっていないか、ローカルの Hermes も同じポートで待ち受けているかのどちらかです。犯人を見つけて止めてください。

```bash
# macOS / Linux
lsof -iTCP:43827 -sTCP:LISTEN
kill <PID>
```

そのうえで `ssh -L` のコマンドをやり直します。

### ローカルのコールバックを待っている途中で承認がタイムアウトする {#authorization-timed-out-waiting-for-the-local-callback}

転送がリモートの待ち受けまで戻ってこなかった状態です。トンネルがまだ生きているか（`ssh -N` は何も出力しないので、起動した端末を見てください）、いちばん新しい `Waiting for callback on ...` の行にあるポートを使ったか（Hermes は希望のポートが埋まっていると自動でずらすことがあります）を確認し、必要ならトンネルを張り直して、認証のコマンドをやり直してください。

### トークンが違う `~/.hermes` に書かれる {#tokens-land-in-the-wrong-hermes}

トークンは `hermes auth add ...` を実行した Linux ユーザーの下に書かれます。ゲートウェイや systemd のサービスが別のユーザー（`root` や専用の `hermes` ユーザーなど）で動いているなら、**そのユーザー**として認証して、トークンがそのユーザーの `~/.hermes/auth.json` に入るようにしてください。`sudo -u hermes -i` などを使います。

## あわせて読む {#see-also}

- [xAI Grok OAuth](/hermes/docs/guides/xai-grok-oauth/) — デバイスコード方式。SSH のトンネルは不要
- [Spotify（`Running over SSH`）](/hermes/docs/user-guide/features/spotify/#running-over-ssh--in-a-headless-environment)
- [ネイティブの MCP クライアント（OAuth の節）](/hermes/docs/user-guide/features/mcp/#oauth-authenticated-http-servers)
- [SSH の `-J` / ProxyJump（man ページ）](https://man.openbsd.org/ssh#J)
