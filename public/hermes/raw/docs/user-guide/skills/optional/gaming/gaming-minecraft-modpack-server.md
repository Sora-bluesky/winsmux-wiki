---
title: "Minecraft Modpack Server — MOD 入りの Minecraft サーバーを立てる（CurseForge、Modrinth）"
description: "MOD 入りの Minecraft サーバーを立てる（CurseForge、Modrinth）"
upstream_path: user-guide/skills/optional/gaming/gaming-minecraft-modpack-server.md
upstream_blob: 4b8f0ec356c9f1fcb9fb26d9ca52f40ff9703df9
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/gaming/gaming-minecraft-modpack-server
---

# Minecraft Modpack Server {#minecraft-modpack-server}

MOD 入りの Minecraft サーバーを立てます（CurseForge、Modrinth）。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加 skill — `hermes skills install official/gaming/minecraft-modpack-server` で入れます |
| パス | `optional-skills/gaming/minecraft-modpack-server` |
| バージョン | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# MOD 入り Minecraft サーバーの構築 {#minecraft-modpack-server-setup}

## こんなときに使います {#when-to-use}
- サーバーパックの zip から、MOD 入りの Minecraft サーバーを立てたいとき
- NeoForge / Forge のサーバー設定で困っているとき
- Minecraft サーバーの動作を軽くしたい、バックアップを取りたいと聞かれたとき

## まずユーザーの希望を聞きます {#gather-user-preferences-first}
構築を始める前に、次の点を確認します。
- **サーバー名 / MOTD** — サーバー一覧にどう表示したいか
- **シード値** — 特定の値にするか、ランダムでよいか
- **難易度** — peaceful / easy / normal / hard のどれか
- **ゲームモード** — survival / creative / adventure のどれか
- **オンラインモード** — true（Mojang 認証あり、正規アカウント）か false（LAN やそうでない環境向け）か
- **人数** — 何人くらいが遊ぶ見込みか（RAM と描画距離の調整に効いてきます）
- **RAM の割り当て** — 指定するか、MOD の数と空きメモリからエージェントに決めさせるか
- **描画距離 / シミュレーション距離** — 指定するか、人数とマシン性能からエージェントに選ばせるか
- **PvP** — 有効にするか無効にするか
- **ホワイトリスト** — 誰でも入れるか、ホワイトリスト制にするか
- **バックアップ** — 自動バックアップを取るか、取るならどれくらいの頻度か

こだわりがなければ無難な既定値を使ってかまいませんが、設定ファイルを作る前に必ず一度は尋ねてください。

## 手順 {#steps}

### 1. パックを取得して中身を見る {#1-download-inspect-the-pack}
```bash
mkdir -p ~/minecraft-server
cd ~/minecraft-server
wget -O serverpack.zip "<URL>"
unzip -o serverpack.zip -d server
ls server/
```
`startserver.sh`、インストーラの jar（neoforge / forge）、`user_jvm_args.txt`、`mods/` フォルダがあるかを見ます。
スクリプトを読んで、MOD ローダーの種類、バージョン、必要な Java のバージョンを確かめます。

### 2. Java を入れる {#2-install-java}
- Minecraft 1.21 以降 → Java 21: `sudo apt install openjdk-21-jre-headless`
- Minecraft 1.18〜1.20 → Java 17: `sudo apt install openjdk-17-jre-headless`
- Minecraft 1.16 以前 → Java 8: `sudo apt install openjdk-8-jre-headless`
- 確認: `java -version`

### 3. MOD ローダーを入れる {#3-install-the-mod-loader}
たいていのサーバーパックにはインストール用のスクリプトが付いています。INSTALL_ONLY の環境変数を使うと、起動せずにインストールだけできます。
```bash
cd ~/minecraft-server/server
ATM10_INSTALL_ONLY=true bash startserver.sh
# Or for generic Forge packs:
# java -jar forge-*-installer.jar --installServer
```
ここでライブラリのダウンロードやサーバー jar へのパッチ当てが行われます。

### 4. EULA に同意する {#4-accept-eula}
```bash
echo "eula=true" > ~/minecraft-server/server/eula.txt
```

### 5. server.properties を設定する {#5-configure-serverproperties}
MOD 入り・LAN 環境で効いてくる主な設定です。
```properties
motd=\u00a7b\u00a7lServer Name \u00a7r\u00a78| \u00a7aModpack Name
server-port=25565
online-mode=true          # false for LAN without Mojang auth
enforce-secure-profile=true  # match online-mode
difficulty=hard            # most modpacks balance around hard
allow-flight=true          # REQUIRED for modded (flying mounts/items)
spawn-protection=0         # let everyone build at spawn
max-tick-time=180000       # modded needs longer tick timeout
enable-command-block=true
```

性能まわりの設定です（マシンの性能に合わせて調整します）。
```properties
# 2 players, beefy machine:
view-distance=16
simulation-distance=10

# 4-6 players, moderate machine:
view-distance=10
simulation-distance=6

# 8+ players or weaker hardware:
view-distance=8
simulation-distance=4
```

### 6. JVM の引数を調整する（user_jvm_args.txt） {#6-tune-jvm-args-userjvmargstxt}
RAM は人数と MOD の数に合わせます。MOD 入りの目安はこれくらいです。
- MOD 100〜200 個: 6〜12GB
- MOD 200〜350 個以上: 12〜24GB
- OS や他の処理のために、8GB 以上は空けておきます

```
-Xms12G
-Xmx24G
-XX:+UseG1GC
-XX:+ParallelRefProcEnabled
-XX:MaxGCPauseMillis=200
-XX:+UnlockExperimentalVMOptions
-XX:+DisableExplicitGC
-XX:+AlwaysPreTouch
-XX:G1NewSizePercent=30
-XX:G1MaxNewSizePercent=40
-XX:G1HeapRegionSize=8M
-XX:G1ReservePercent=20
-XX:G1HeapWastePercent=5
-XX:G1MixedGCCountTarget=4
-XX:InitiatingHeapOccupancyPercent=15
-XX:G1MixedGCLiveThresholdPercent=90
-XX:G1RSetUpdatingPauseTimePercent=5
-XX:SurvivorRatio=32
-XX:+PerfDisableSharedMem
-XX:MaxTenuringThreshold=1
```

### 7. ファイアウォールを開ける {#7-open-firewall}
```bash
sudo ufw allow 25565/tcp comment "Minecraft Server"
```
確認はこうします: `sudo ufw status | grep 25565`

### 8. 起動スクリプトを作る {#8-create-launch-script}
```bash
cat > ~/start-minecraft.sh << 'EOF'
#!/bin/bash
cd ~/minecraft-server/server
java @user_jvm_args.txt @libraries/net/neoforged/neoforge/<VERSION>/unix_args.txt nogui
EOF
chmod +x ~/start-minecraft.sh
```
補足: NeoForge ではなく Forge の場合、引数ファイルのパスが変わります。正確なパスは `startserver.sh` で確かめてください。

### 9. 自動バックアップを仕込む {#9-set-up-automated-backups}
バックアップ用のスクリプトを作ります。
```bash
cat > ~/minecraft-server/backup.sh << 'SCRIPT'
#!/bin/bash
SERVER_DIR="$HOME/minecraft-server/server"
BACKUP_DIR="$HOME/minecraft-server/backups"
WORLD_DIR="$SERVER_DIR/world"
MAX_BACKUPS=24
mkdir -p "$BACKUP_DIR"
[ ! -d "$WORLD_DIR" ] && echo "[BACKUP] No world folder" && exit 0
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/world_${TIMESTAMP}.tar.gz"
echo "[BACKUP] Starting at $(date)"
tar -czf "$BACKUP_FILE" -C "$SERVER_DIR" world
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[BACKUP] Saved: $BACKUP_FILE ($SIZE)"
BACKUP_COUNT=$(ls -1t "$BACKUP_DIR"/world_*.tar.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    REMOVE=$((BACKUP_COUNT - MAX_BACKUPS))
    ls -1t "$BACKUP_DIR"/world_*.tar.gz | tail -n "$REMOVE" | xargs rm -f
    echo "[BACKUP] Pruned $REMOVE old backup(s)"
fi
echo "[BACKUP] Done at $(date)"
SCRIPT
chmod +x ~/minecraft-server/backup.sh
```

1 時間ごとの cron を追加します。
```bash
(crontab -l 2>/dev/null | grep -v "minecraft/backup.sh"; echo "0 * * * * $HOME/minecraft-server/backup.sh >> $HOME/minecraft-server/backups/backup.log 2>&1") | crontab -
```

## つまずきやすいところ {#pitfalls}
- MOD 入りでは `allow-flight=true` を必ず設定します。設定しないと、ジェットパックや飛行系の MOD でプレイヤーがキックされます
- `max-tick-time=180000` 以上にします。MOD 入りのサーバーは地形生成中に 1 tick が長くなりがちです
- 初回起動はとても遅くなります（大きなパックでは数分かかります）。慌てないでください
- 初回起動時の「Can't keep up!」の警告は正常です。最初のチャンク生成が終われば落ち着きます
- online-mode=false にするなら、enforce-secure-profile も false にします。そうしないとクライアントが弾かれます
- パック付属の startserver.sh には自動再起動のループが入っていることが多いので、それを含まない素直な起動スクリプトを別に作ります
- 新しいシードで作り直したいときは world/ フォルダを削除します
- パックによっては挙動を変える環境変数があります（たとえば ATM10 は ATM10_JAVA、ATM10_RESTART、ATM10_INSTALL_ONLY を使います）

## 確認 {#verification}
- 動いているかどうかは `pgrep -fa neoforge` か `pgrep -fa minecraft` で見ます
- ログの確認: `tail -f ~/minecraft-server/server/logs/latest.log`
- ログに「Done (Xs)!」が出ていれば、サーバーは受け入れ可能な状態です
- 接続テスト: プレイヤーがマルチプレイの画面でサーバーの IP を追加します
