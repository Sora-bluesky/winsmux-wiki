---
title: "Unreal Mcp — Unreal Engine のエディタでシーン・アクター・レンダリングを自動化する"
description: "Unreal Engine のエディタでシーン・アクター・レンダリングを自動化する"
upstream_path: user-guide/skills/optional/creative/creative-unreal-mcp.md
upstream_blob: 6e8ccc000e8f0f8ed21bf9d6a29ffde978e39f9d
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/creative/creative-unreal-mcp
---

# Unreal Mcp {#unreal-mcp}

Unreal Engine のエディタでシーン・アクター・レンダリングを自動化します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/creative/unreal-mcp` で導入します |
| パス | `optional-skills/creative\unreal-mcp` |
| バージョン | `1.0.0` |
| 作者 | Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `unreal`, `unreal-engine`, `ue5`, `3d`, `mcp`, `scenes`, `cinematics`, `lighting`, `gamedev` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Unreal Engine MCP Skill {#unreal-engine-mcp-skill}

Hermes の MCP カタログにある `unreal-engine` の項目と対になる skill です。この MCP サーバー
（Epic 公式の実験的プラグイン「Unreal MCP」、内部 id は `ModelContextProtocol`）は
Unreal Editor のプロセスの中で動き、エディタの機能を型の付いたツールとして外に出します。
この skill は、それをうまく操るやり方を教えます。動いているツールの顔ぶれを調べる、呼び出しを
安全な順番に並べる、普通の言葉で言われたことを本当に見栄えのするシーンに変える、そして
仕上がりを目で確かめる、という内容です。ユーザーはエディタを起動する以外、手を触れなくて
済むはずです。

## 使いどころ {#when-to-use}

Unreal Engine で何かをしたいと言われたときに使います。レベルを作る・飾る、アクターを
配置・移動・削除する、ライティングと空気感を整える、マテリアルインスタンスを作る・調整する、
カメラの画角を決める、スクリーンショットやレンダリングを取る、

エディタ。「太陽をゴールデンアワーの色に」といった単発の作業でも、「たき火のある薄暗い森の
広場を作って、そのショットをレンダリングして」といった複数工程のプロジェクトでも使えます。

向かないもの: DCC ツールでやるようなメッシュのモデリングや彫り込み（Blender でモデリング
して

コードの作業。ターミナルを使ってください。この skill は動いているエディタについてのものです。

## 前提条件 {#prerequisites}

大きく 2 つあり、順番が決まっています。Hermes が接続する前に、エディタ側が立ち上がって
いなければなりません。

### 一度だけ、エディタ側 {#one-time-editor-side}

1. Unreal Editor **5.8 以降**でプロジェクトを開いておきます。（macOS では Xcode の完全版が
   インストールされ、ライセンスに同意済みである必要があります。これがないとエディタは初回
   起動で終了します。つまずきどころを参照してください。）
2. **Edit > Plugins** で **Unreal MCP** を有効にします（依存する Toolset Registry も自動で
   有効になります）。求められたらエディタを再起動します。
3. 型の付いた toolset はサーバーとは別に配布されています。同じ Plugins のブラウザで
   **AllToolsets** プラグインも有効にしてください。Unreal MCP 自体はツールを 1 つも持って
   おらず、同梱の toolset（SceneTools、ActorTools、MaterialInstanceTools、ObjectTools など）は
   AllToolsets が提供します。これを飛ばすとサーバーには繋がるのに、エージェントから呼べる
   ものが何もありません。
4. **Edit > Editor Preferences > General > Model Context Protocol** で
   **Auto Start Server** を有効にします。既定の待ち受け先は `http://127.0.0.1:8000/mcp` です
   （ポートとパスは同じパネルで変えられます。サーバー名は `unreal-mcp` です）。
   手動で起動したい場合は、エディタのコンソール（バッククォートキー）で
   `ModelContextProtocol.StartServer` を実行します。

### 一度だけ、Hermes 側 {#one-time-hermes-side}

    hermes mcp install unreal-engine

これで `http://127.0.0.1:8000/mcp` を指す `mcp_servers.unreal-engine` の HTTP 設定が書き込まれ、
動いているサーバーに問い合わせてツールの一覧を取ります。エディタとサーバーが動いている
あいだに実行して、本物の顔ぶれを取らせてください。ユーザーが Editor Preferences で
ポートやパスを変えている場合は、`~/.hermes/config.yaml` の `mcp_servers.unreal-engine` の
`url` を合わせて書き換えます。

Hermes に対して `ModelContextProtocol.GenerateClientConfig` を使わないでください。あれは
Claude Code や Cursor などのための `.mcp.json` 形式のファイルを書くものです。Hermes は
カタログの項目を通じて `config.yaml` から接続します。

### 毎回のセッション {#every-session}

1. Unreal Editor を起動し、プロジェクトの読み込みが終わるまで待ちます。サーバーが起動した
   ことを確かめます（Output Log に待ち受け先が出ます。または
   `ModelContextProtocol.StartServer` を手動で実行します）。
2. Hermes のセッションを始めます。ツールは `mcp_unreal_engine_*` として登録されます。
   見当たらないなら順番が逆です。エディタを先に起動してから、新しい Hermes セッションを
   開いてください。
3. 動作確認として `mcp_unreal_engine_list_toolsets` を呼び、toolset が返ってくることを
   確かめます。

## ツールの顔ぶれ: 固定の一覧ではなく、調べて知るもの {#the-tool-surface-discovery-not-a-fixed-list}

既定でこのプラグインは**ツール検索モード**で動きます。`tools/list` はメタツールを 3 つ返すだけで、
本当のツールはすべてそれ越しに呼びます。Hermes からはこう見えます:

| Hermes のツール | 役割 |
|---|---|
| `mcp_unreal_engine_list_toolsets` | 登録されている全 toolset の名前と説明 |
| `mcp_unreal_engine_describe_toolset` | 指定した toolset のツールの JSON スキーマ一式 |
| `mcp_unreal_engine_call_tool` | 名前を指定してツールを引数付きで呼び、結果を受け取る |

調べる手順は、いつもこの順番です:

1. `list_toolsets` で、このプロジェクトに実際にどんな機能のまとまりがあるかを見ます
   （顔ぶれはプロジェクト次第です。有効なプラグイン、Game Feature Plugin、独自の toolset が
   すべて足されます）。名前は完全修飾で返ってきます
   （`editor_toolset.toolsets.scene.SceneTools`、`EditorToolset.EditorAppToolset`）。それを
   そのまま `toolset_name` に使ってください。
2. 必要なまとまりに `describe_toolset` をかけ、本物のパラメータのスキーマを読みます。
   パラメータ名を推測してはいけません。スキーマが取り決めそのものです。
3. `call_tool` を、完全修飾の toolset 名、**短いほうの**ツール名（ドット付きの形ではなく
   `find_actors`）、スキーマに合った引数で呼びます。

分かったことはそのセッションのあいだ覚えておき、一覧の取り直しはエディタ側が変わったとき
（プラグインを有効にした、toolset を書いた、`RefreshTools` を実行した）だけにします。

もう一方の先読みモード（Editor Preferences で `Enable Tool Search` を切った状態）は、すべての
ツールをそれぞれ `mcp_unreal_engine_<tool>` として並べます。この場合、顔ぶれを調べるのは
`hermes mcp install` や `configure` の時点になります。既定はツール検索モードで、この skill も
それを前提にしています。API 呼び出しのたびにスキーマのトークンを積まずに済むので、そちらを
選んでください。

同梱の toolset のカタログ、独自 toolset の書き方、プラグインの設定とコンソールコマンドの
一覧は `references/tool-surface.md` にあります。

## 作業のループ {#operating-loop}

Unreal の作業はどれも同じループで進みます:

1. **まず見る。** toolset の一覧を取り、何かに触る前にシーンやレベルの状態を問い合わせます。
   レベルが空っぽ、あるいは既定のままだと決めつけないでください。知らないプロジェクトでは、
   そのプロジェクトに登録された Agent Skills も確認します
   （`call_tool` → `AgentSkillToolset.ListSkills`）。当てはまるプロジェクト側の skill があれば、
   その指示がこの skill の一般的な既定より優先されます。
2. **小さく、1 つのことだけをする呼び出しで進める。** `call_tool` 1 回につき論理的な 1 手です。
   サーバーはツールを**ゲームスレッド上で順番に**実行するので、大きくまとめた処理は終わるまで
   エディタの UI を固まらせ、クライアント側がタイムアウトする恐れもあります。例外として、
   同じ形の処理を 5 回以上繰り返すループなら、`ProgrammaticToolset.execute_tool_script` の
   呼び出し 1 回でサーバー側にまとめさせられます。これは順次実行の原則を破りません
   （`references/advanced-workflows.md`）。
3. **重なる呼び出しは絶対に出さない。** `mcp_unreal_engine_*` を 1 ターンに複数まとめないで
   ください。Hermes はまとめた呼び出しを同時に走らせるため、ゲームスレッドに対する並行呼び出しは
   デッドロックするか失敗します。厳密に 1 回だけ呼び、結果を待ってから次を呼びます。これは
   ツールを並列で呼ぶという一般的な案内より優先されます。
4. **結果を毎回読む。** 多くのツール（Blueprint のコンパイル、マテリアルの編集、ウィジェットの
   作成など）は成否をレスポンスの本文で報告し、プロトコルの層では例外を出しません。はっきり
   成功と書かれていないものは、肩をすくめて流すのではなく、止まって原因を調べる合図です。
   プロパティを書いたあとは値を読み返してください。いくつかの書き込み経路は黙って何もしない
   ことがあります（つまずきどころを参照）。
5. **見た目と構造の両方で確かめる。** 節目ごとに、変更したアクターやプロパティを問い合わせて
   状態を確認し、構図が問題になる場面ではビューポートのスクリーンショットを撮ります
   （撮り方の選択肢は `references/tool-surface.md` にあります。画像は `vision_analyze` に
   かけてください。アートディレクターは自分です。自分で判断します）。
6. **こまめに保存する。** エディタの編集はパッケージやレベルを保存するまでメモリ上だけの
   ものです。エディタが落ちれば最後の保存以降がすべて消えますし、MCP による編集は確実に
   undo できるとは限りません。まとまった変更の前と後、そして節目ごとに保存してください。
7. **具体的に報告する。** アクターのラベル、アセットのパス（`/Game/...`）、撮影物や
   レンダリング結果の保存先です。

作業中に効いている、この世界の決まりごと:

- 単位は**センチメートル**、軸は **Z が上**で X が前、回転は度です（Rotator は X 回りが Roll、
  Y 回りが Pitch、Z 回りが Yaw）。人間の目の高さはおよそ 165 cm、ドアはおよそ 210×90 cm です。
  表の全体は `references/scene-craft.md` にあります。
- コンテンツのパスは長いパッケージ名を使います。プロジェクトの中身なら
  `/Game/Folder/Asset.Asset`、エンジンの基本形状なら `/Engine/BasicShapes/Cube.Cube` です。
- アクターの**ラベル**（Outliner に見えるもので、変更でき、重複してもよい）と、アクターの
  **名前**（内部のもので、一意）は別物です。アクターはラベルやクラスで検索して見つけ、
  ツールが返したハンドルのほうを持っておくのがよいやり方です。
- 明るさを適当な数字で決めるより、物理的にありえる値（lux / candela / ケルビン）を選んで
  ください。ただし先に、今ある太陽の intensity を読んで、そのシーンがどんな基準で調整されて
  いるかを知ってからにします。テンプレートのワールドは `intensity: 10` あたりを基準に
  していることが多く、物理的な値を入れると白飛びします（数値は
  `references/scene-craft.md`、基準合わせの決まりは `references/pitfalls.md` の #12b に
  あります）。

## 普通の言葉からシーンへ {#from-plain-english-to-a-scene}

ユーザーが渡してくるのは仕様ではなく意図です。作る前に翻訳してください:

1. **依頼の中身を取り出す。** 被写体、雰囲気、時間帯、屋内か屋外か、スタイル、成果物
   （スクリーンショット？ レンダリング？ 遊べるレベル？）。確認の質問は多くても 1 往復に
   とどめ、そこから先は決め切ります。技術ディレクターは自分です。Unreal の専門用語を
   ユーザーに投げ返さないでください。
2. **作る順番を決める。** うまくいく順番はこうです。レベルや環境の土台 → ブロッキング
   （主要な形状やメッシュを置く）→ ライティングと空気感 → マテリアル → 小物や細部 →
   カメラ → 撮影やレンダリング。工程の多い制作では、この計画を todo リストとして出します。
3. 上のループに沿って、**節目を 1 つずつ作り**、節目ごとにスクリーンショットを撮ります。
4. **自分でアートディレクションする。** スクリーンショットを依頼と見比べます。シルエットは
   読み取れるか。光の向きと強さは納得できるか。地平線が画面のど真ん中に来ていないか。
   人の背丈を基準にしてスケールは合っているか。直してから次へ進みます。
5. **渡す。** スクリーンショットやレンダリング結果をファイルとして（`MEDIA:` のパスで）渡し、
   レベルに何があり、どこに保存したかを短くまとめます。

`references/recipes.md` には、最後まで作り切った例（屋外の昼のシーン、薄暗い室内、
ゴールデンアワーのシネマティックとレンダリング、アセットの取り込みと配置）が、呼び出しの
並びと具体的な値付きで載っています。

## 参照ファイル {#reference-files}

必要になったときに読んでください。SKILL.md の水準の決まりは常に頭に置いておきます。

| 参照先 | 内容 |
|---|---|
| `references/tool-surface.md` | 同梱 toolset のカタログ、調べ方の詳しい手順、プラグインのコンソールコマンド / CVar / フラグ、スクリーンショットと撮影の保存先、MCP Inspector でのデバッグ、Python や C++ の独自 toolset による拡張 |
| `references/advanced-workflows.md` | 実機で確認済みの、踏み込んだ進め方。ProgrammaticToolset でのまとめ実行、Blueprint DSL を書くループ（作成→DSL→コンパイル→配置）、PIE のテストセッション、Sequencer の見取り図（140 個のツール）、LogsToolset による自己デバッグ、自動テスト、意味での検索によるアセット探し、config の設定、場面ごとの判断表 |
| `references/scene-craft.md` | 数値の早見表。物理的な光の強さ、色温度、露出と EV100、フォグの濃さ、雰囲気ごとのレシピ（真昼 / ゴールデンアワー / 曇天 / 夜 / 室内）、スケールの表、コンテンツのパスの決まり |
| `references/recipes.md` | 呼び出しの並びまで書き切った、通しの制作例 |
| `references/pitfalls.md` | 導入時・実行時・作業中のつまずきどころと直し方。最初のセッションの前と、何かおかしいときに読んでください |

## つまずきどころ（要点のみ。全体は references/pitfalls.md） {#pitfalls-top-of-mind-full-list-in-referencespitfallsmd}

- **起動の順番が効きます。** エディタとサーバーが先、そのあとに Hermes のセッションです。
  `mcp_unreal_engine_*` が見当たらないのは順番が逆だからです。
- **一度に 1 回だけ呼ぶ。** ゲームスレッドは順次実行です。まとめて呼ばない、重ねない。
- **呼び出しのあいだエディタの UI は固まります。** これは仕様です（ゲームスレッドで実行される
  ため）。長い処理のあいだはユーザーに伝え、呼び出しは小さく保ってください。
- **モーダルダイアログはすべてを止めます。** モーダルのエディタダイアログを開く（またはそれと
  ぶつかる）ツール呼び出しは、人が閉じるまで止まったままです。呼び出しがいつまでも返って
  こないときは、エディタにダイアログが出ていないか確かめてもらってください。
- **長い処理でのタイムアウト。** Hermes の 1 回あたりの既定は 120 秒です。アセットの取り込み、
  大きなレベルの保存、レンダリングはこれを超えることがあります。レンダリングや取り込みの多い
  セッションでは、`~/.hermes/config.yaml` の `mcp_servers.unreal-engine.timeout` を上げて
  ください。
- **古いツールのスキーマ。** toolset を書いたりホットリロードしたり、プラグインを有効にしたら、
  エディタのコンソールで `ModelContextProtocol.RefreshTools` を実行し、`list_toolsets` を
  取り直します。新しい C++ の `UFUNCTION` はエディタの完全な再起動が必要です。Live Coding
  では出てきません。
- **実験的なプラグインです。** API やツールの形はエンジンのバージョン間で変わり得ます。
  記憶（この skill の例も含めて）より `describe_toolset` を信じてください。ドキュメントと
  実物のスキーマが食い違ったら、実物のスキーマが正です。
- **サーバーを localhost の外に出さないでください。** ループバック限定・認証なしという設計です。
  もっと広く待ち受けさせる提案は決してしないでください。
- **ライセンスについて。** サーバーは起動時にログを出します。このプラグインを通じて接続先の
  LLM サービスへ送られるデータは、UE EULA（§6(e)）でいう Licensed Technology にあたります。
  LLM の提供元がそれを学習に使わないようにする責任はユーザー側にあります。データの扱いに
  ついて聞かれたら、この点を伝えてください。

## 検証のチェックリスト {#verification-checklist}

- [ ] セッションの最初に `list_toolsets` が toolset を返す（接続は正常）
- [ ] 最初の編集の前にシーンの状態を問い合わせた（空だと決めつけていない）
- [ ] 節目ごとに、変更したアクターやプロパティを問い合わせ直し、スクリーンショットを依頼と
      見比べた
- [ ] 節目ごとと最後に、レベルと未保存のパッケージを保存した
- [ ] 成果物がディスク上に存在し（スクリーンショットやレンダリングのパスを確認した）、
      絶対パスでユーザーに伝えた
- [ ] エディタをきれいな状態で残した。開いたままのモーダルなし、思わぬ未保存なし、何を作り
      何を変えてどこに置いたかをユーザーに正確に伝えた
