---
license: "MIT. Translation of the Hermes Agent documentation, Copyright (c) 2025 Nous Research. See https://wiki.winsmux.dev/hermes/licenses.txt"
title: "コントリビュート"
description: "Hermes Agent へのコントリビュート方法（開発環境のセットアップ、コードスタイル、PR の流れ）"
upstream_path: developer-guide/contributing.md
upstream_blob: aed4c50fd6649d9b9eb0b70ba28e9e2c6f07b42d
sources:
  - https://hermes-agent.nousresearch.com/docs/developer-guide/contributing
---

# コントリビュート {#contributing}

Hermes Agent へのコントリビュートをありがとうございます。このガイドでは、開発環境の用意、コードベースの理解、PR をマージしてもらうまでの流れを説明します。

## コントリビュートの優先順位 {#contribution-priorities}

次の順番でコントリビュートを重視しています。

1. **バグ修正** — クラッシュ、誤った動作、データの消失
2. **クロスプラットフォーム対応** — macOS、各種 Linux ディストリビューション、WSL2
3. **セキュリティ強化** — シェルインジェクション、プロンプトインジェクション、パストラバーサル
4. **性能と堅牢性** — リトライ処理、エラー処理、段階的な機能縮退
5. **新しいスキル** — 幅広く役立つもの（[スキルの作成](/hermes/docs/developer-guide/creating-skills/)を参照）
6. **新しいツール** — 必要になることはまれです。ほとんどの機能はスキルで作るべきです
7. **ドキュメント** — 修正、説明の補足、新しい例

## コントリビュートの評価基準 {#contribution-rubric}

これはプロジェクトの意図をまとめた層で、ルートの `AGENTS.md` に要約があります。ここでは例を添えた詳しい版を載せます。
Hermes はたくさんのものを出荷しています。マージの大半はバグ修正で、製品の表面（プラットフォーム、
プロバイダー、モデル、デスクトップや TUI の機能）は意図して広げています。抑制の対象はエージェントのコアと
モデルに渡すツールスキーマです。ここに足したものは、すべての API 呼び出しのたびにコストとして払うことになるからです。端は広く、胴回りは控えめに、という方針です。

### 歓迎するもの {#what-we-want}

- **本物のバグを、きちんと直す。** 現在の `main` で症状を再現し、それが現れる正確な行を示し、
  同じ種類のバグをまとめて直してください。兄弟にあたる呼び出し経路も含めます。
- **端で届く範囲を広げる。** 新しいアダプター、チャネル、プロバイダー、モデル、デスクトップ・TUI・
  ダッシュボードの機能は、大きなものも含めて日常的に取り込んでいます。条件は、生の環境変数を
  継ぎ足すのではなく、既存のセットアップや設定の UX（`hermes tools`、`hermes setup`、自動インストール）に組み込むことです。
- **巨大なファイルをきれいなモジュールに分ける。** 機械的に切り出すだけの大きな `+N/-N` の PR も
  歓迎する作業です。「すべての行が依頼にたどれる」という基準は*機能*の PR に当てはまるもので、
  リファクタリングと宣言した PR では、切り出しそのものが依頼です。
- **コアを狭く保つ。** 優先順位は、既存コードの拡張 → CLI コマンド + スキル →
  サービス条件付きツール（`check_fn`）→ プラグイン → カタログ内の MCP サーバー → 新しいコアツール（最後の
  手段）の順です。下の「フットプリントの段階」を参照してください。
- **重複させず、拡張する。** モジュール、マネージャー、フックを足す前に、既存の仕組みでその用途を
  まかなえないかを確かめてください。同じ*種類*（メモリーのバックエンド、プロバイダー、通知手段）を組み込む PR が 3 件以上開いているときは、
  ABC とオーケストレーターを設計し、既存の組み込み実装を最初のプロバイダーとして包み、
  競合する PR はそれに対するプラグインにします。
- **スナップショットより振る舞いの契約。** テストは 2 つのデータがどう関係するかを確かめるもので、
  現在の値を固定するものではありません（`tests/AGENTS.md` を参照）。
- **単体テストのモックが緑なだけでなく、E2E で検証する。** 解決の連鎖、設定の伝播、
  セキュリティ境界、リモートのバックエンド、ファイルやネットワークの I/O に触れる変更は、
  一時的な `HERMES_HOME` に対して本物の import で実際の経路を通してください。プロファイルの範囲に触れる変更なら、それを 2 つ使います（A→B→A）。
  モックは連携のバグを隠します。
- **キャッシュ、交互性、不変条件を壊さない。** プロンプトキャッシュ、厳密なロールの
  交互性（同じロールのメッセージを 2 つ続けない、ループの途中で合成したユーザーメッセージを差し込まない）、
  そして会話の間ずっとバイト単位で変わらないシステムプロンプトを守ってください。
- **コントリビューターの功績を残す。** 外部の成果は cherry-pick（rebase-merge）で取り込み、
  作者の記録が残るようにします。作り直すのではなく、その上に積み上げてください。

### 歓迎しないもの（よくできていても却下します） {#what-we-dont-want-rejected-even-when-well-built}

- **見込みだけの基盤。** 具体的な利用者がいないフック、コールバック、拡張ポイントです。
  フックを足すのは簡単ですが、プラグインが依存した後に外すのは困難です。実在し、
  明示された用途のあるフックは、利用者が別に出荷されるとしても見込みだけのものではありません。
- **秘密でない設定のための新しい `HERMES_*` 環境変数。** `.env` は秘密情報専用です。振る舞いの
  設定（タイムアウト、閾値、フラグ、表示の好み）は `config.yaml` に置きます。仕組みが内部の環境変数を必要とするなら、
  コードの中で橋渡ししてください。「X を .env に設定する」というドキュメントは、
  X が認証情報でない限り却下します。
- **ターミナルとファイル（あるいはスキル）で済むのに作る新しいコアツール。** 障害が
  リモートのバックエンドでファイルが見えないことだけなら、ツールセットではなくマウントを直してください。
- **指示用ツールに付ける、読み飛ばしの抜け道。** エージェントが全部読むべき内容（スキル、プロンプト、プレイブック）を読み込むツールに、
  `offset`/`limit` のページ分割は付けません。モデルは
  1 ページ目だけ読んで残りを飛ばすからです。
- **守るはずの機能を壊してしまう「修正」。** 振る舞いを制限する前に、元の意図を
  （`git log -p -S` で）読んでください。機能を残したまま直す方法を探します。
- **オプトインの条件なしに外部へ送るテレメトリや利用の帰属。** 利用者向けの汎用的なオプトイン
  （設定の条件 + セットアップ時の確認 + `hermes tools` での切り替え）ができるまでは、分析、
  第三者の識別子の付与、帰属タグは入れません。ラベルを付けて保留にします。
- **変更検知だけのテスト、会話の途中でキャッシュを壊すもの、E2E の証明なしに配線したデッドコード、
  コアのファイルに触れるプラグイン。** プラグインは、こちらが用意する ABC やフックの範囲で動くものです。
  それ以上が必要なら、汎用のプラグインの表面を広げてください。コアの中で特別扱いはしません。
- **第三者の製品をコアのツリーに組み込むもの。** 可観測性のバックエンド、ベンダーの
  SaaS コネクター、分析ダッシュボードなど「他社の製品」のプラグインは、
  `plugins/` の下には入れません。どれも、自分たちが所有しないバックエンドのために、
  変化の速いコアに対して負担を抱え込むことになるからです。**独立したプラグインのリポジトリ**（`~/.hermes/plugins/` または pip の
  エントリーポイント）として出荷し、Nous Research の Discord の `#plugins-skills-and-skins` で紹介してください。これは
  品質の基準ではなく結合度の判断です。こうした PR は、公開先を案内して閉じます。

### バグと呼ぶ前に前提を確かめる（そして閉じてはいけないとき） {#before-you-call-it-a-bug-verify-the-premise-and-when-not-to-close}

よく書けた PR が閉じられる理由で最も多いのは、**前提が誤っている**ことと、
**意図した設計を欠落と見なしている**ことです。次のパターンは、レビュアーには何を精査すべきかを示し、
sweeper には PR を閉じてはいけない場面を示します（迷ったら、人間のために開いたままにします）。

- **「欠落ではなく、意図した設計」。** 分離そのものが設計ではないかを考えてください。プロファイルは
  意図して独立した島になっています。既定のプロファイルから設定をその場で継承させる PR は、
  プロファイル同士を結び付けることこそ設計が防いでいるものなので閉じられました（「既定の設定から始めたい」は `--clone`
  ですでにまかなえます）。何かが未完成だと決めつける前に、`git log -p -S "<symbol>"` を読んでください。
- **「X の実際の動きに照らすと前提が成り立たない」。** 理由を受け入れる前に、実際の実行時の動きをたどってください。
  実際に閉じた例として、レート制限の「クールダウン中の再確認」PR があります（ブレーカーは
  *空と確定した*バケットでしか作動しないので、再確認は空と証明済みのバケットを叩き続けるだけです）。
  また、それより前のガードがすでに状態を取り出しているため、新しい分岐が**一度も実行されない**
  利用量の修正もありました。バグが現れる正確な行を示し、かつ修正がその行の振る舞いを変えることを
  示せないなら、前提は検証されていません。
- **「欠けていたのは意図的だった」。** 「欠けている」`__init__.py` ファイルを戻したところ、テストのツリーが
  ドット区切りのパッケージとして import できるようになり、本物のプラグインを覆い隠して、import の時点でその `register()` を
  消してしまいました。欠けていること自体が支えになっていたのです。
- **「やりすぎ、または卒業した方法を蘇らせた」。** 合意した土台を越えて範囲を広げることや、
  メンテナーが閉じた方向性を復活させることは、動くとしても却下します。残りは
  焦点を絞った後続の PR として提案してください。

一貫する原則は、**修正を書く前、マージする前に、主張と意図の両方をコードベースに照らして確かめる**ことです。
現在の `main` での再現と行単位の説明は、もっともらしい理由に勝ります。
意図がはっきりしないときは、設計とぶつかる修正を出荷するより、尋ねるほうが安く済みます。

### フットプリントの段階（新しい機能の判断） {#the-footprint-ladder-new-capability-decision}

問題を正しく解決できる中で、最も上の（フットプリントが最も小さい）段を選んでください。

1. **既存コードの拡張** — すでにあるものの変形です。新しい表面はゼロです。
2. **CLI コマンド + スキル** — シェルコマンドで表せる設定、状態、インフラです。エージェントはスキルの案内に従って
   `hermes <subcommand>` を実行します。購読、予約タスク、
   サービスのセットアップ（`hermes webhook`、`hermes cron`、`hermes tools`）の既定の選択肢です。
3. **サービス条件付きツール（`check_fn`）** — 構造化した引数と戻り値が必要で、かつ前提となるものが
   設定されているときだけ現れます（Home Assistant のツール、メモリープロバイダーのツール）。この段は
   到達可能性やオプトインをプロセス全体で切り替えます。セッションごとに変わる機能（誰が見ているか）は
   `check_fn` ではなく、ツールセットの解決処理が取り込む名前付きツールセットです。`tools/AGENTS.md` の「Surface
   capability is a property of the SESSION」の節を参照してください。
4. **プラグイン** — 第三者向け、ニッチ、利用者固有のものです。`~/.hermes/plugins/` か pip の
   パッケージに置き、実行時に見つけ出されます。
5. **MCP サーバー（カタログ内）** — 本当にツールではあるものの、コアの根幹ではないものです。コアのスキーマに
   恒久的なフットプリントを残さず、どの MCP ホストからも再利用でき、組み込みの MCP クライアント経由で使えます。
6. **新しいコアツール** — 根幹にかかわり、ほぼすべての利用者に広く役立ち、
   ターミナルとファイルや MCP サーバーでは届かない場合だけです（terminal、read_file、web_search、
   browser_navigate）。

## よくあるコントリビュートの入口 {#common-contribution-paths}

- Hermes のコアを変更せずに、独自のツールやローカル用のツールを作る場合は、[Hermes プラグインを作る](/hermes/docs/developer-guide/plugins/)から始めてください
- Hermes 本体に組み込むコアツールを新しく作る場合は、[ツールの追加](/hermes/docs/developer-guide/adding-tools/)から始めてください
- 新しいスキルを作る場合は、[スキルの作成](/hermes/docs/developer-guide/creating-skills/)から始めてください
- 新しい推論プロバイダーを作る場合は、[プロバイダーの追加](/hermes/docs/developer-guide/adding-providers/)から始めてください

## 開発環境のセットアップ {#development-setup}

### 前提条件 {#prerequisites}

| 必要なもの          | 補足                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- |
| **Git**              | `git-lfs` 拡張をインストールしておきます                                                        |
| **Python 3.14** | 現在の開発では PM が固定したインタープリターを使います。パッケージのメタデータにある広めの指定 `>=3.11,<3.15` は古いアップデーターを動かし続けるためのもので、古い Python で現在のランタイムが動くという意味ではありません。 |
| **Node.js** | PM が固定したバージョンか、ルートの `package.json` の engines が受け付けるバージョンを使います |

### PM による開発環境 {#pm-developer-environment}

準備、有効化、日常のコマンド、依存関係の変更、テスト環境については、[PM の開発者向けワークフロー](/hermes/docs/reference/package-management/#developer-workflow)に従ってください。実験中のコードが本番のデータを移行してしまわないよう、
セットアップの前に開発用の
ホームを選んでおきます。

新しいシェルを開くたびに、リポジトリのルートで有効化します。有効化すると、PM を通じて
チェックアウトが準備され、古くなった依存関係が同期されます。

Bash:

```bash
source ./activate
hermes --version
```

PowerShell:

```powershell
. .\activate.ps1
hermes --version
```

このチェックアウトでは `hermes` を実行します。有効化によってこれがこの
ワークツリー用の関数として定義されるため、グローバルな `hermes` エイリアスは隠れ、ワークツリーの外では実行を拒否します。
PM の有効化は、ツールと Python の依存関係を同期してからシェルに追加します。
JS のワークスペースのインストールや、ランチャー・シェル設定の書き換えは行いません。`deactivate` を実行すると、元のシェル環境に戻り、関数も削除されます。

### 手動の開発・テスト環境 {#manual-development-and-test-environment}

まず [PM の開発者向けワークフロー](/hermes/docs/reference/package-management/#developer-workflow)で Python 3.14 を準備してください。
以下のコマンドは、そのチェックアウトで、準備した Python を使って実行します。開発用の
`HERMES_HOME` は同じものを使い続けてください。PM は、別の環境を作る前に自分自身が起動できる必要があります。
Windows では、ソースから依存関係をビルドする前に、使っている
アーキテクチャ向けのネイティブ C++ ビルド環境を初期化しておきます。

テストやエディターのツール用に、独立したインタープリターを作ります。

```bash
python -m pm.build_env --source . --out .venv --group dev --group test
```

PM はコミット済みのロックファイルからビルドし、新しいインタープリターを返す前に依存関係の整合性を確認します。
`test` グループにはネイティブランチャーのテストに必要な
依存関係が含まれ、アプリケーションのランタイムには入りません。テストで
別の宣言済み機能が必要なら、その `--extra` を追加してください。

出力先は、空のディレクトリやシンボリックリンクであっても、あらかじめ存在していてはいけません。依存関係を変更したあとに
作り直すときは、その環境のプロセスを止めてから、使い捨ての環境だけを意図的に削除してください。
PM は既存の出力先を削除しません。
PM で作った環境を変更するために、pip や uv のコマンドを直接実行しないでください。

テスト環境をチェックアウトの外に置く場合は、`.venv` を新しい絶対
パスに置き換えます。そのうえで `HERMES_PYTHON` にその環境のインタープリターを指定します。

- POSIX: `export HERMES_PYTHON="/absolute/path/to/hermes-dev/bin/python"`
- PowerShell: `$env:HERMES_PYTHON = 'C:\absolute\path\to\hermes-dev\Scripts\python.exe'`

正規のテストランナーは、リポジトリの `.venv` を自動で見つけます。ランナーは
`PYTHONPATH` を消去するので、pytest はインタープリター自身の環境にインストールされている必要があります。
このテスト環境は、PM によるアプリケーションの選択やツールストアの代わりにはなりません。
同梱版アプリからこの環境を参照させたり、MSIX のペイロードにインストールしたりしないでください。

分離した開発用インスタンスを使うときは、ソースからのコマンドを起動する前に使い捨ての `HERMES_HOME` を
選んでください。設定には `hermes setup` を使い、
本番の認証情報をチェックアウトにコピーしないようにします。

### JavaScript のワークスペースと Web サイト {#javascript-workspaces-and-website}

リポジトリのルートで `npm ci` を実行すると、デスクトップ、TUI、ダッシュボード、
共有の JS ワークスペースが揃います。Web サイトは別扱いです。

```bash
npm ci --prefix website
npm run build:fast --prefix website
```

それぞれの `package.json` の engines が受け付ける Node/npm のバージョンを使ってください。
デスクトップのネイティブ依存関係には、プラットフォームのビルドツールチェーンが必要になることもあります。

ロゴとアイコンは `assets/nous-girl-*.svg` と
`assets/backgrounds/` から生成されます。`node scripts/generate-icons.mjs` は、
Hermes ランタイムの Python（`HERMES_PYTHON`、未設定なら PATH 上の `python`）でこれらを描画します。Pillow と
resvg-py はコアの依存関係です。生成された PNG/ICO/ICNS はコミットしないでください。

### テストを実行する {#run-tests}

どのホストでも正規のテストランナーを使います。

```bash
scripts/run_tests.sh
scripts/run_tests.sh tests/agent/ -v
```

Windows では、このスクリプトを Bash から実行します。ローカルの `.venv` や `venv` に
pytest が入っていない場合、ランナーは上で指定した `HERMES_PYTHON` を使います。ランナーは
認証情報を消去し、`HERMES_HOME` を分離したうえで、`scripts/run_tests_parallel.py` を通じて
テストファイルを1つずつ別のサブプロセスで実行します。xdist は使いません。
`tests/conftest.py` が本番の `HERMES_HOME` を一時的なセッション用ホームへ差し替えるときは、
内部マーカー `HERMES_TEST_SANDBOX_HOME` を設定します。これにより、
再インポートされたテストフィクスチャが自分のサンドボックスを認識でき、本物のホームへの
I/O として誤検知しなくなります。このマーカーを自分で設定しないでください。使い捨ての
開発用ホームには `HERMES_HOME` を設定し、分離はテストランナーに任せます。

JS を変更したときは、関係する JS ワークスペースのチェックを実行してください。ネイティブのインストール・更新の
E2E は使い捨ての CI ホストで実行し、開発者が実際に使っているアプリに対しては決して実行しません。
PM のコマンドとランタイムの所有範囲については、[パッケージ管理](/hermes/docs/reference/package-management/)を参照してください。

## コードスタイル {#code-style}

- **PEP 8** に従います。ただし実用上の例外があります（行の長さは厳密には強制しません）
- **コメント**: 自明でない意図、トレードオフ、API の癖を説明するときだけ書きます
- **エラー処理**: 具体的な例外を捕捉します。想定外のエラーには `exc_info=True` を付けて `logger.warning()`/`logger.error()` を使います
- **クロスプラットフォーム**: Unix を前提にしないでください（下記参照）
- **プロファイルに安全なパス**: `~/.hermes` を決め打ちで書かないでください。コード上のパスには `hermes_constants` の `get_hermes_home()` を、ユーザー向けのメッセージには `display_hermes_home()` を使います。規則の全体は [AGENTS.md](https://github.com/NousResearch/hermes-agent/blob/main/AGENTS.md#profiles-multi-instance-support) を参照してください。

## クロスプラットフォーム対応 {#cross-platform-compatibility}

**[対応プラットフォーム](/hermes/docs/getting-started/platform-support/)**を参照してください。ネイティブの Windows では、シェルコマンドに（[Git for Windows](https://git-scm.com/download/win) に含まれる）Git Bash を使います。ダッシュボードは、Unix では POSIX の PTY を、Windows では `pywinpty`/ConPTY のブリッジを使います。使えるかどうかは、そのホストがネイティブ依存関係に対応しているかで決まります。Windows 中心の開発をしている場合は、push する前に Windows の落とし穴を検出する lint（`scripts/check-windows-footguns.py`）を実行してください。

コードをコントリビュートするときは、次の規則を守ってください。

- **ガードなしで `signal.SIGKILL` を参照しないでください。** Windows では定義されていません。`gateway.status.terminate_pid(pid, force=True)`（Windows では `taskkill /T /F`、POSIX では SIGKILL を行う一元化された関数）を通すか、`getattr(signal, "SIGKILL", signal.SIGTERM)` で代替してください。
- **プロセスの生存確認には `psutil.pid_exists()` を使ってください。** Windows で `os.kill(pid, 0)` を使わないでください。安全な確認方法ではありません。
- **ターミナルに POSIX の挙動を強制しないでください。** `os.setsid`、`os.killpg`、`os.getpgid`、`os.fork` はどれも Windows では例外を投げます。`if sys.platform != "win32":` か `if os.name != "nt":` で囲ってください。
- **テキストのエンコーディングは明示してください。** ユーザーが書いた UTF-8 を読むときは、先頭の BOM を受け付けるよう `utf-8-sig` を使います。書き込みには BOM を付けずに `utf-8` を使います。
- **`pathlib.Path` / `os.path.join` を使い、`/` で手作業の連結をしないでください。** OS から返ってくる文字列ではそれほど問題になりませんが、自分で組み立ててサブプロセスに渡す文字列では重要です。

主なパターン:

### 1. ファイルのエンコーディング {#1-file-encoding}

環境によっては、`.env` ファイルが UTF-8 以外のエンコーディングで保存されていることがあります。

```python
try:
    load_dotenv(env_path)
except UnicodeDecodeError:
    load_dotenv(env_path, encoding="latin-1")
```

### 2. プロセス管理 {#2-process-management}

`os.setsid()`、`os.killpg()`、シグナル処理はプラットフォームによって異なります。

```python

if platform.system() != "Windows":
    kwargs["preexec_fn"] = os.setsid
```

### 3. パスの区切り文字 {#3-path-separators}

`/` での文字列連結ではなく、`pathlib.Path` を使ってください。

## セキュリティ上の考慮事項 {#security-considerations}

Hermes はターミナルにアクセスできます。セキュリティは重要です。

### 既存の保護 {#existing-protections}

| 層                           | 実装                                                              |
| ------------------------------- | --------------------------------------------------------------------------- |
| **sudo パスワードの受け渡し**        | `shlex.quote()` でシェルインジェクションを防ぎます                             |
| **危険なコマンドの検出** | `tools/approval.py` の正規表現パターンと、ユーザーによる承認の流れ               |
| **cron のプロンプトインジェクション**       | 指示の上書きを狙うパターンをスキャナーがブロックします                                |
| **書き込み拒否リスト**             | 保護対象のパスを `os.path.realpath()` で解決し、シンボリックリンクによる回避を防ぎます |
| **スキルのガード**                | Hub からインストールしたスキル向けのセキュリティスキャナー                                   |
| **コード実行のサンドボックス**      | 子プロセスは API キーを取り除いた状態で動きます                                   |
| **コンテナの強化**         | Docker: すべての capability を削除し、権限昇格を禁止し、PID 数を制限します       |

### セキュリティに関わるコードのコントリビュート {#contributing-security-sensitive-code}

- ユーザーの入力をシェルコマンドに埋め込むときは、必ず `shlex.quote()` を使ってください
- アクセス制御のチェックの前に、`os.path.realpath()` でシンボリックリンクを解決してください
- シークレットをログに出さないでください
- ツールの実行まわりでは広めに例外を捕捉してください
- 変更がファイルパスやプロセスに関わる場合は、すべてのプラットフォームでテストしてください

## プルリクエストの流れ {#pull-request-process}

### ブランチの命名 {#branch-naming}

```
fix/description        # Bug fixes
feat/description       # New features
docs/description       # Documentation
test/description       # Tests
refactor/description   # Code restructuring
```

### 提出する前に {#before-submitting}

1. **テストを実行する**: CI と同じ条件にするため `scripts/run_tests.sh` を使います。`python -m pytest ...` を直接使うのは、ラッパーが使えないときか、ラッパーの外で意図的にデバッグするときだけにしてください。
2. **手動でテストする**: `hermes` を実行し、変更したコードの経路を実際に動かします
3. **クロスプラットフォームへの影響を確認する**: macOS、Linux、WSL2、ネイティブの Windows を考慮します。ファイル I/O、プロセス管理、ターミナル処理、サブプロセス、シグナルに触れた場合は、`scripts/check-windows-footguns.py` を実行してください。
4. **PR を絞る**: 1つの PR には論理的な変更を1つだけ含めます

### PR の説明 {#pr-description}

次の内容を含めてください。

- **何を**変更したか、**なぜ**変更したか
- **どうテストするか**
- **どのプラットフォーム**でテストしたか
- 関連する issue への参照

### コミットメッセージ {#commit-messages}

[Conventional Commits](https://www.conventionalcommits.org/) を使っています。

```
<type>(<scope>): <description>
```

| 種類       | 用途                       |
| ---------- | ----------------------------- |
| `fix`      | バグ修正                     |
| `feat`     | 新機能                  |
| `docs`     | ドキュメント                 |
| `test`     | テスト                         |
| `refactor` | コードの再構成            |
| `chore`    | ビルド、CI、依存関係の更新 |

スコープ: `cli`、`gateway`、`tools`、`skills`、`agent`、`install`、`whatsapp`、`security`

例:

```
fix(cli): prevent crash in save_config_value when model is a string
feat(gateway): add WhatsApp multi-user session isolation
fix(security): prevent shell injection in sudo password piping
```

### リポジトリ内のレビューチェックリスト: `.agents/checks/*.md` {#repo-local-review-checklists-agentschecksmd}

Hermes を使って作る（または Hermes にレビューさせる）プロジェクトでは、レビュー用のチェックリストをリポジトリ内の `.agents/checks/` に置いておけます。各ファイルは1つの観点に絞ったプレーンな Markdown のチェックリストで、該当する領域に触れる変更をレビューする前にエージェントが読み込みます。

```
.agents/
  checks/
    security.md        # e.g. "grep the diff for shell interpolation; check subprocess calls quote args"
    migrations.md      # e.g. "every schema change ships a backfill and a rollback note"
    public-api.md      # e.g. "exported signatures changed? flag for semver review"
```

うまく機能させるための決まりごと:

- **1ファイルに1つの観点**とし、その観点の名前を付けます。小さなファイルは最後まで読まれますが、ひとまとめの `checklist.md` は流し読みされます。
- **チェック項目は検証できる行動として書きます**（「X を実行して Y を確認する」）。願望（「コードは安全であるべき」）にはしません。
- **冒頭に適用条件を書きます**。どのパスや変更の種類にそのチェックリストが当てはまるかを書いておけば、エージェント（や人間）が関係のないものを手軽に飛ばせます。
- チェックリストは、守る対象のコードの隣でバージョン管理します。コードベースと一緒に育ち、規則を変える PR は同じ diff でチェックリストも変えることになります。

`.agents/checks/` があるリポジトリで Hermes に PR のレビューを頼むときは、関係するチェックリストを先に読み、それに照らして報告するよう伝えてください（またはスキルで教えてください）。汎用のレビュー用プロンプトでは抜け落ちる、プロジェクト固有の基準をレビューエージェントに持たせられます。

## 問題の報告 {#reporting-issues}

- [GitHub Issues](https://github.com/NousResearch/hermes-agent/issues) を使ってください
- OS、Python のバージョン、Hermes のバージョン（`hermes --version`）、エラーのトレースバック全体を含めてください
- 再現手順を含めてください
- 重複を作らないよう、作成する前に既存の issue を確認してください
- セキュリティの脆弱性は、非公開で報告してください

## コミュニティ {#community}

- **Discord**: [discord.gg/NousResearch](https://discord.gg/NousResearch)
- **GitHub Discussions**: 設計の提案やアーキテクチャの議論向け
- **Skills Hub**: 専門的なスキルをアップロードして、コミュニティと共有できます

## ライセンス {#license}

コントリビュートした時点で、その内容が [MIT License](https://github.com/NousResearch/hermes-agent/blob/main/LICENSE) のもとでライセンスされることに同意したものとみなされます。
