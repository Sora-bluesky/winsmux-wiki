---
title: "送信プロキシの内部構造"
description: "iron-proxy の送信ファイアウォールが Hermes とどう結びついているか — モジュール構成、ライフサイクル、セキュリティ上の不変条件、拡張ポイント"
upstream_path: developer-guide/egress-internals.md
upstream_blob: f84160788a0c1f02388748fa8d470717bca850b3
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/egress-internals
---

# 送信プロキシの内部構造 {#egress-proxy-internals}

このページでは、送信時に資格情報を差し替えるファイアウォール（`hermes egress` / iron-proxy）の構造を、開発に加わる人やプラグイン作者の視点から説明します。利用者向けの準備と使い方は [送信プロキシ](/hermes/docs/user-guide/egress/iron-proxy/) にまとめてあります。

想定する脅威と全体像は利用者向けページで説明しているので、ここでは *どう配線されているか*、セキュリティに関わるコードがどこにあるか、そして手を入れるときに守らなければならない不変条件を扱います。

## モジュール構成 {#module-layout}

```text
agent/proxy_sources/iron_proxy.py     Core: binary install, CA gen, config build,
                                       subprocess lifecycle, mappings I/O, PID/nonce
                                       defense.  Pure-function surface where possible.

hermes_cli/proxy_cli.py               Wizard + slash command handlers.
                                       `hermes egress {install,setup,start,stop,
                                       status,disable,config}`.  Wires the
                                       core module into argparse.

hermes_cli/main.py:_dispatch_egress   Top-level subparser dispatcher.
                                       dest='egress_command' (intentionally
                                       disjoint from the inbound OAuth
                                       `hermes proxy` subparser, which uses
                                       dest='proxy_command').

hermes_cli/config.py: proxy schema    The `proxy:` block in DEFAULT_CONFIG.
                                       Adding a knob means: add it here, add a
                                       wizard prompt or `setdefault` in
                                       proxy_cli.cmd_setup, and document it
                                       in the user-guide page.

tools/environments/docker.py
  _egress_proxy_args_for_docker()     Builds the volume_args / env_overrides /
                                       host_args triple that the Docker backend
                                       injects when `proxy.enabled: true`.

  DockerEnvironment.__init__          Docker-side merge logic: collision
                                       detection against critical egress vars,
                                       NODE_OPTIONS append-merge via the
                                       _HERMES_EGRESS_NODE_OPTIONS_APPEND
                                       sentinel, enforce_on_docker precedence.

tests/test_iron_proxy.py              Hermetic tests (~70).  Binary install
                                       path, config build, mappings I/O,
                                       subprocess lifecycle, docker arg builder,
                                       deny CIDR defaults, bind policy, CA
                                       TOCTOU, ensure_audit_log behaviour, etc.

tests/test_iron_proxy_cli.py          CLI handler unit tests (~20).  Argparse
                                       wiring, fail-loud paths, BWS refresh
                                       wire-up, dest='egress_command'
                                       regression guard.

tests/test_iron_proxy_e2e.py          Live E2E (gated on HERMES_RUN_E2E=1).
                                       Real iron-proxy binary, real curl,
                                       end-to-end token swap verified.
```

## ライフサイクル {#lifecycle}

```text
hermes egress install
  -> agent.proxy_sources.iron_proxy.install_iron_proxy(force=...)
       Downloads pinned tarball + checksums.txt from GitHub Releases.
       SHA-256 verification before extraction.
       tarfile.extract(..., filter="data") on Python 3.12+ (PEP 706);
         falls back to plain extract on older Python with member-name
         sanitisation via _pick_tar_member.
       Stage into ~/.hermes/bin/.iron-proxy_XXXX, chmod 755, os.replace
         to ~/.hermes/bin/iron-proxy (atomic).
       _VERSION_CACHE.pop(target) so a forced reinstall re-probes
         --version on next call.

hermes egress setup [--from-bitwarden | --no-bitwarden] [--rotate-tokens]
  -> proxy_cli.cmd_setup
       Step 1. find_iron_proxy(install_if_missing=False) -> install if absent.
       Step 2. ensure_ca_cert()
                 Run openssl genrsa + req via subprocess.
                 Write CA key via os.open(O_WRONLY|O_CREAT|O_TRUNC|O_NOFOLLOW, 0o600)
                   + os.replace.  Never exists on disk under default umask.
                 Write CA cert with 0o644 (public).
       Step 3. discover_provider_mappings() or pull names from BWS via
                 fetch_bitwarden_secrets() when --from-bitwarden.
                 merge_mappings(existing=load_mappings(), discovered,
                                rotate=args.rotate_tokens) preserves prior
                 tokens unless --rotate-tokens is passed.
                 discover_uncovered_providers() and surface warnings.
       Step 4. ensure_audit_log(audit_log_path)   # raises on OSError
               build_proxy_config(...) with defaults applied at the call site
                 (deny CIDRs default, bind policy from _default_http_listen).
               write_proxy_config(cfg)            # atomic via .tmp + os.replace, 0o600
               write_mappings(mappings)           # atomic, 0o600
       Step 5. proxy_cfg["enabled"] = True; credential_source preservation logic
               (do NOT silently downgrade bitwarden -> env on re-run);
               save_config(cfg).

hermes egress start
  -> proxy_cli.cmd_start
       Pre-checks (refuse-start path):
         - credential_source=bitwarden? -> pre-validate access_token_env + project_id
       -> iron_proxy.start_proxy(
            refresh_secrets_from_bitwarden=...,
            bitwarden_config=...,
          )
            existing=_read_pid(); if alive, idempotent return.
            _build_proxy_subprocess_env(...):  ALLOWLIST + mapped real_env_names,
              strip HTTPS_PROXY/etc. to avoid recursion, optional BWS refresh
              (raises on missing values unless allow_env_fallback=true).
            Plant nonce: _proxy_nonce = sha256(urandom(16)); env[NONCE_ENV] = ...
            Open log_path via O_NOFOLLOW + 0o600 + st_uid check.
            Popen with stdin=DEVNULL, stdout=log_fd, stderr=STDOUT,
              start_new_session=True (POSIX).
            Close parent's log_fd in finally.
            _write_pidfile_safely(pidfile, proc.pid)
              O_EXCL + O_NOFOLLOW + uid check + persisted nonce sidecar.
              FileExistsError -> discriminate live vs stale, retry once if stale.
            Install SIGINT/SIGTERM handlers (main-thread only).
            Poll loop (do-while shape):
              while True:
                if proc.poll() is not None: tail log + unlink pidfile + raise
                if _port_listening(probe_host, tunnel_port): break  # probe_host = configured bind host
                if time.time() >= deadline: break  (do-while: checked AFTER first probe)
                time.sleep(0.1)
            If not listening at exit: _kill_and_wait(proc) + unlink pidfile + raise.

hermes egress stop
  -> iron_proxy.stop_proxy
       _read_pid + _pid_alive guard.
       starttime_before = _pid_proc_starttime(pid)   # Linux only; None elsewhere
       os.kill(pid, SIGTERM)
       Wait up to 5s for graceful exit.
       After grace: re-check starttime + _pid_alive.
         If recycled (starttime drift OR _pid_alive False), DO NOT SIGKILL.
         Otherwise os.kill(pid, _KILL_SIGNAL).
       _cleanup_state_files: unlink pidfile + nonce sibling.
```

## セキュリティ上の不変条件 {#security-invariants}

ここに挙げるのは、仕組み全体を支えている性質です。このモジュールに手を入れるなら、必ず維持してください。再発防止テストがあるものは、その名前も添えてあります。

### ファイルの権限 {#filesystem-perms}

| パス | モード | テスト |
|---|---|---|
| `~/.hermes/proxy/`（ディレクトリ） | `0o700` | `test_proxy_state_dir_is_0o700` |
| `ca.key` | `0o600` | `test_ca_key_created_with_0o600` |
| `ca.crt` | `0o644` | （暗黙。`ensure_ca_cert` 内の chmod 呼び出し） |
| `proxy.yaml` | `0o600` | （`write_proxy_config` の原子的リネーム後に chmod） |
| `mappings.json` | `0o600` | （`write_mappings` の原子的リネーム後に chmod） |
| `iron-proxy.pid` | `0o600` | （`_write_pidfile_safely` 内の `os.open(..., 0o600)` のモード） |
| `iron-proxy.nonce` | `0o600` | （`_write_pidfile_safely` 内の `os.open(..., 0o600)` のモード） |
| `audit.log` | `0o600` | `test_ensure_audit_log_creates_with_0o600` |
| `iron-proxy.log` | `0o600` | （`os.open(..., 0o600)` と `fchmod`） |

書き込み経路はすべて `os.open(O_WRONLY | O_CREAT | O_NOFOLLOW, 0o600)` と `os.fstat().st_uid` による確認を通します。`shutil.copy2` と `os.chmod` の組み合わせは、既定の umask による緩い権限の隙間が生まれるため禁止です。

### サブプロセスの環境変数を最小限にする {#subprocess-env-minimisation}

`_build_proxy_subprocess_env` では `os.environ.copy()` を使ってはいけません。渡してよいのは許可リスト `_PROXY_SUBPROCESS_ENV_ALLOWLIST`（PATH、HOME、ロケールなど）と、`load_mappings()` が参照する環境変数名だけです。それ以外はホスト側に残します。

再発防止テスト: `test_subprocess_env_strips_unrelated_secrets`、`test_subprocess_env_strips_proxy_recursion_vars`、`test_subprocess_env_keeps_infrastructure_vars`。

### 待ち受けアドレスの方針 {#bind-policy}

`_default_http_listen` は要素が 1 つのリストを返します。Linux では docker ブリッジのゲートウェイ IP です（コンテナは `host.docker.internal:host-gateway` 経由でプロキシに届き、これはブリッジのゲートウェイに解決されるため、ループバックで待ち受けるとコンテナの中から到達できません）。macOS と Windows の Docker Desktop ではループバックです（VPNkit が `host.docker.internal` をホストへ振り分けます）。docker0 ブリッジが見つからない Linux では、警告を出したうえでループバックに戻ります。`0.0.0.0` や `:PORT`（INADDR_ANY）は決して使いません。

`_detect_docker_bridge_ip` は `ipaddress.IPv4Address` で検証し、`is_unspecified` / `is_loopback` / `is_multicast` / `is_reserved` / `is_link_local` / `is_global` を拒否します。PATH 上に悪意のある `ip` の偽物が置かれていても `0.0.0.0` を注入できません。

**v0.39 のスキーマ上の制約と、各リスナーの役割（実際のバイナリで確認済み）:** バイナリ側の `config.Proxy` 構造体には単数形のリスナー項目しかなく、複数形の `http_listens` というリストは存在しません。`tunnel_listen` が CONNECT と MITM を担うリスナー（`HTTPS_PROXY` の通信が届く先）で、`http_listen` は絶対形式の平文 HTTP 転送だけを扱います（ここに CONNECT を送ると通常のリクエストとして上流へ中継され、400 が返ります）。そのため `build_proxy_config` は `tunnel_listen` を `tunnel_port` に、`http_listen` を `tunnel_port + 1` に、どちらもプラットフォームごとの待ち受けホスト上で割り当てます。Docker バックエンドは `HTTPS_PROXY` に `tunnel_port` を、`HTTP_PROXY` に `tunnel_port + 1` を設定します。

生存確認のプローブ（`start_proxy` のポーリングループと `get_status`）は、設定された待ち受けホストを `_read_http_listen_from_config()` で読み取り、そのホストに対して確認します。ループバック決め打ちで確認すると、ブリッジで待ち受けている正常なデーモンを停止中と誤って報告してしまいます。

再発防止テスト: `test_default_bind_is_loopback_not_zero_zero`（INADDR_ANY が無いこと、および生成された yaml に `http_listens` が含まれないことを確認）、`test_default_bind_uses_docker_bridge_on_linux`、`test_default_bind_falls_back_to_loopback_without_bridge`、`test_default_bind_is_loopback_on_macos`、`test_detect_docker_bridge_ip_rejects_dangerous`（8 種類の攻撃的な入力でパラメータ化）。

### メトリクスのポート衝突 {#metrics-port-collision}

iron-proxy v0.39 では `metrics.listen` の既定値が `:9090` で、Hermes の既定の `tunnel_port: 9090` と同じポートです。そこで `build_proxy_config` は `metrics.listen: 127.0.0.1:0` を明示的に固定し、運用者がどの `tunnel_port` を選んでもプロキシのリスナーと衝突しないよう、メトリクスにはループバック上の空きポートを割り当てさせます。

再発防止テスト: `test_metrics_listener_pinned_to_loopback_ephemeral`。

### 既定で拒否する CIDR {#default-deny-cidrs}

`_DEFAULT_UPSTREAM_DENY_CIDRS` は、ループバック（v4 と v6）、リンクローカル（169.254.169.254 の IMDS と、IPv4 射影 v6 形式を含む）、RFC1918、IPv6 ULA、CGNAT、RFC2544 のベンチマーク用範囲を対象にします。`build_proxy_config(..., upstream_deny_cidrs=None)` は必ずこの既定値を出力しなければなりません。無効にできるのは、空のリストを明示的に渡した場合だけです。

再発防止テスト: `test_default_deny_cidrs_present_when_unspecified`、`test_default_deny_includes_ipv4_mapped_v6`。

### 監査ログは失敗を隠さない {#audit-log-fail-loud}

`ensure_audit_log` は `OSError` が起きたら `RuntimeError` を送出します。固定している v0.39 ではデーモンがこのファイルを書かない（`log.audit_path` の項目が無い）ため、`cmd_setup` は失敗を警告として扱い（バージョンが上がるまでこのファイルは仕組みを支えていません）、成功を伝える行にも「予約済み」と添えます。固定バージョンが `log.audit_path` に対応したものへ上がったら、この扱いを見直してください。事前作成が「最初の 1 バイトから 0o600」という保証を支えるようになり、ウィザードは再び失敗をはっきり出すべきです。

**v0.39 のスキーマ上の制約:** `log.audit_path` は iron-proxy v0.39 の `config.Log` 構造体に存在しない項目なので、`build_proxy_config` は `audit_log` の引数を受け取りはしますが、生成する yaml には出力しません。v0.39 ではリクエストごとの記録も、デーモンの動作記録と同じ `iron-proxy.log` に入ります。それでも `audit.log` は `O_NOFOLLOW` 付きで `0o600` として事前に作成しておき、別ストリームに対応したバージョンへ固定を上げたときにプライバシー上の約束がそのまま成り立つようにしています。

再発防止テスト: `test_ensure_audit_log_raises_on_immutable_parent`、`test_audit_log_kwarg_does_not_inject_audit_path_v039`。

### Bitwarden モードは失敗を隠さない {#bitwarden-mode-fail-loud}

`credential_source: bitwarden` かつ `proxy.allow_env_fallback: false`（既定）のとき:
- アクセストークンの環境変数が無ければ `cmd_start` は起動を拒みます。
- `project_id` が無ければ `cmd_start` は起動を拒みます。
- `bws secret list` が、対応付けたプロバイダのどれかについて値を返さなければ `_build_proxy_subprocess_env` が例外を送出します。

Bitwarden モードでホストの環境変数に戻ってしまうと、この経路がそもそも避けようとしていた「古い値が使われる」不具合をそのまま呼び戻すことになります。

再発防止テスト: `test_cmd_start_refuses_when_bitwarden_token_missing`（CLI 層）、および `_build_proxy_subprocess_env` の厳格モードのアサーション（デーモン層）。

### docker_env の衝突検出 {#dockerenv-collision-detection}

`enforce_on_docker: true` のとき、送信制御に関わる変数（HTTPS_PROXY、SSL_CERT_FILE、NODE_EXTRA_CA_CERTS など）、または対応付けた `real_env_name`（OPENROUTER_API_KEY など）のいずれかを `docker_env` で上書きしていると、コンテナが起動する前に `RuntimeError` を送出します。

再発防止テスト: `test_docker_env_collision_with_proxy_raises_when_enforce`。

### PID 使い回しへの備え {#pid-recycling-defense}

`_pid_alive` は、`argv[0]` のファイル名の一致を信用する前に、プロセス内の `_proxy_nonce`（同一プロセスの場合）か、ディスク上の `iron-proxy.nonce`（CLI をまたぐ場合）のどちらかを必ず参照しなければなりません。また `stop_proxy` は、SIGKILL を送る前に `/proc/<pid>/stat` の起動時刻を再確認し、起動時刻がずれていれば送信を取りやめなければなりません。

再発防止テスト: `test_stop_proxy_suppresses_sigkill_on_pid_recycle`、`test_pid_proc_starttime_parses_comm_with_parens`、`test_persisted_nonce_roundtrip`。

### 再セットアップ時にトークンを保つ {#token-preservation-on-re-setup}

`merge_mappings(existing, discovered, rotate=False)` は、重複するプロバイダについて以前のトークンを必ず返さなければなりません。`hermes egress setup` をもう一度実行したせいで、動いているサンドボックスが黙って 401 になるようなことがあってはいけません。作り直したいときは `--rotate-tokens` を明示的に指定します。

再発防止テスト: `test_merge_mappings_preserves_existing_tokens`、`test_merge_mappings_rotate_mints_fresh_tokens`。

### `credential_source` を保つ {#credentialsource-preservation}

`cmd_setup` は、`--no-bitwarden` を明示的に指定されない限り、再実行時に `credential_source: bitwarden` を `env` に落としてはいけません。`hermes egress setup` をフラグ無しで実行した場合は、以前に設定された内容がそのまま保たれます。

これは CLI テストの `cmd_setup` の流れで確認しています（`--from-bitwarden` のあとにフラグ無しの `setup` を再実行することで、bitwarden が保たれる経路をたどっています）。

## 拡張ポイント {#extension-points}

### bearer トークン方式のプロバイダを追加する {#adding-a-new-bearer-token-provider}

`iron_proxy.py` の `_BEARER_PROVIDERS` は、環境変数名から上流ホストの組への対応表です。ここに項目を足すと `discover_provider_mappings()` が見つけられるようになり、その環境変数があればウィザードが自動でトークンを発行します。

```python
_BEARER_PROVIDERS: Dict[str, Tuple[str, ...]] = {
    ...,
    "MY_PROVIDER_API_KEY": ("api.myprovider.com",),
}
```

あわせて `_DEFAULT_ALLOWED_HOSTS` も更新し、その上流を既定で通すようにします。`test_discover_provider_mappings_*` を実行して確かめてください。

### ヘッダートークン方式（x-api-key 系）のプロバイダを追加する {#adding-a-new-header-token-provider-x-api-key-family}

Anthropic の `x-api-key`、Azure の `api-key`、Gemini の `x-goog-api-key` のように、Authorization 以外の固定ヘッダーで認証するプロバイダは `_HEADER_AUTH_PROVIDERS` に追加します。iron-proxy の `secrets.replace.match_headers` は任意のヘッダー名を対象にできるので、これらも一級の差し替え対象になります:

```python
_HEADER_AUTH_PROVIDERS: Dict[str, Dict[str, Tuple[str, ...]]] = {
    ...,
    "MY_PROVIDER_API_KEY": {
        "hosts": ("api.myprovider.com",),
        "match_headers": ("x-my-auth-header", "Authorization"),
        "aliases": (),
    },
}
```

`aliases` は *同じ* 資格情報を指す言い換えの環境変数名にだけ使ってください（たとえば `GEMINI_API_KEY` に対する `GOOGLE_API_KEY`）。別名は 1 つの対応にまとめられます。同じホストに `require: true` の規則が 2 つあると、互いのリクエストを弾き合ってしまうためです。ここでも `_DEFAULT_ALLOWED_HOSTS` を更新します。

### 署名認証のプロバイダを追加する（差し替え対象外） {#adding-a-new-signature-auth-provider-uncovered}

SigV4、SDK が発行する OAuth、リクエスト署名などを使うプロバイダは、固定ヘッダーの差し替えでは扱えません。その環境変数を `_NON_BEARER_PROVIDERS` に追加すると、ウィザードと `hermes egress status` が注意を促すようになります:

```python
_NON_BEARER_PROVIDERS: Tuple[str, ...] = (
    ...,
    "MY_SIGNED_PROVIDER_ACCESS_KEY",
)
```

### Docker 以外のバックエンドに iron-proxy をつなぐ {#wiring-iron-proxy-into-a-non-docker-backend}

`_egress_proxy_args_for_docker` は Docker 専用です。同じような配線をしたいバックエンドは、次のことをする自前の相当物を用意します:

1. `load_config().get("proxy", {})` を読み、`enabled` が false なら空の引数を返す。
2. `iron_proxy.get_status()` を呼び、`configured` / `pid` / `listening` / `ca_cert_path` が失敗する経路で `enforce` の意味づけを反映する。
3. `iron_proxy.load_mappings()` を呼び、空でありながら `enforce_on_docker: true` ならマウントを拒む。
4. 7 つの環境変数（HTTPS_PROXY、NO_PROXY、REQUESTS_CA_BUNDLE、SSL_CERT_FILE、CURL_CA_BUNDLE、NODE_EXTRA_CA_CERTS、HERMES_EGRESS_PROXY）と、対応ごとの `HERMES_PROXY_TOKEN_<NAME>` を設定する。
5. CA 証明書を、その実行環境が信頼するパス（多くは `/etc/ssl/certs/hermes-egress-ca.crt`）へサンドボックス内に配る。
6. 利用者が設定したバックエンド固有の環境変数との衝突検出を実装する。

Docker 版の実装はおよそ 150 行です。Modal / Daytona / SSH でも同じくらいの分量になるとみてください。

### リクエストごとの監査イベントを受け取る {#subscribing-to-per-request-audit-events}

現在固定している v0.39 では、iron-proxy は 1 行 1 件の JSON を `~/.hermes/proxy/iron-proxy.log` に書き出します（デーモンの記録とリクエストごとの記録が混在します。利用者向けガイドの「iron-proxy v0.39 でのログ」を参照）。プラグインや外部の監視ツールは、このファイルを追いかけて、許可リストによる拒否、シークレットの差し替え、上流のエラーに反応できます。固定バージョンが `log.audit_path` に対応したものへ上がると、リクエストごとの記録は `audit.log` に移り、そのパスを見ている監視ツールは運用者が何もしなくても動き出します。形式は [docs.iron.sh/audit](https://docs.iron.sh/audit)（リンク先）で説明されています。

## テスト {#testing}

```bash
# Hermetic suite (no network, no real binary)
scripts/run_tests.sh tests/test_iron_proxy.py tests/test_iron_proxy_cli.py

# Live E2E (real binary, real curl, real CONNECT tunnel)
HERMES_RUN_E2E=1 scripts/run_tests.sh tests/test_iron_proxy_e2e.py

# Live PTY smoke against `hermes egress`
HERMES_HOME=/tmp/hermes-egress-test python3 -m hermes_cli.main egress --help
HERMES_HOME=/tmp/hermes-egress-test python3 -m hermes_cli.main egress setup --help
```

CLI は argparse を使っているので、「新しく足したフラグがきちんと登録されたか」を確かめるには `--help` から試すのが手軽です。

## 関連ページ {#see-also}

- 利用者向けの準備と困ったときの対処: [送信プロキシ](https://hermes-agent.nousresearch.com/docs/user-guide/egress/iron-proxy)
- Docker バックエンドの内部構造: [Docker](https://hermes-agent.nousresearch.com/docs/user-guide/docker)
- Bitwarden Secrets Manager との連携: [`hermes secrets bitwarden`](https://hermes-agent.nousresearch.com/docs/user-guide/secrets/bitwarden)
- CLI コマンド一覧: [`hermes egress`](https://hermes-agent.nousresearch.com/docs/reference/cli-commands#hermes-egress)
- サンドボックスに注入される環境変数: [送信プロキシ（サンドボックスに注入）](https://hermes-agent.nousresearch.com/docs/reference/environment-variables#egress-proxy-sandbox-injected)
