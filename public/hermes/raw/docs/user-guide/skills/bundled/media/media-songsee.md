---
title: "Songsee — 音声のスペクトログラムや特徴量（mel, chroma, MFCC）を CLI で作る"
description: "音声のスペクトログラムや特徴量（mel, chroma, MFCC）を CLI で作る"
upstream_path: user-guide/skills/bundled/media/media-songsee.md
upstream_blob: dd1e1d3d5eec34513c887adcc96e3cd123ea57ed
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/media/media-songsee
---

# Songsee {#songsee}

音声のスペクトログラムや特徴量（mel, chroma, MFCC）を CLI で作ります。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 最初から入っています |
| パス | `skills/media/songsee` |
| バージョン | `1.0.0` |
| 作者 | community |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `Audio`, `Visualization`, `Spectrogram`, `Music`, `Analysis` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# songsee {#songsee}

音声ファイルからスペクトログラムや、複数のパネルに分けた音声特徴量の図を作ります。

## 事前に必要なもの {#prerequisites}

[Go](https://go.dev/doc/install) が必要です。次のコマンドで導入します。
```bash
go install github.com/steipete/songsee/cmd/songsee@latest
```

WAV / MP3 以外の形式を扱うなら `ffmpeg` もあると便利です。

## さっそく使う {#quick-start}

```bash
# Basic spectrogram
songsee track.mp3

# Save to specific file
songsee track.mp3 -o spectrogram.png

# Multi-panel visualization grid
songsee track.mp3 --viz spectrogram,mel,chroma,hpss,selfsim,loudness,tempogram,mfcc,flux

# Time slice (start at 12.5s, 8s duration)
songsee track.mp3 --start 12.5 --duration 8 -o slice.jpg

# From stdin
cat track.mp3 | songsee - --format png -o out.png
```

## 図の種類 {#visualization-types}

`--viz` にカンマ区切りで指定します。

| 種類 | 説明 |
|------|-------------|
| `spectrogram` | 標準的な周波数スペクトログラム |
| `mel` | メル尺度のスペクトログラム |
| `chroma` | 音名クラスの分布 |
| `hpss` | 調波成分と打楽器成分の分離 |
| `selfsim` | 自己相似行列 |
| `loudness` | 時間ごとのラウドネス |
| `tempogram` | テンポの推定 |
| `mfcc` | メル周波数ケプストラム係数 |
| `flux` | スペクトル変化量（オンセット検出） |

`--viz` を複数指定すると、1 枚の画像にグリッドとして並べて描画されます。

## よく使うフラグ {#common-flags}

| フラグ | 説明 |
|------|-------------|
| `--viz` | 図の種類（カンマ区切り） |
| `--style` | 配色: `classic`, `magma`, `inferno`, `viridis`, `gray` |
| `--width` / `--height` | 出力画像のサイズ |
| `--window` / `--hop` | FFT の窓幅とホップサイズ |
| `--min-freq` / `--max-freq` | 周波数の範囲を絞る |
| `--start` / `--duration` | 音声の切り出し範囲 |
| `--format` | 出力形式: `jpg` または `png` |
| `-o` | 出力先のファイルパス |

## 補足 {#notes}

- WAV と MP3 はそのままデコードできます。ほかの形式には `ffmpeg` が必要です
- 出力画像は `vision_analyze` で読み込ませれば、音声の分析を自動化できます
- 音声出力を比べたいとき、シンセシスの不具合を追いたいとき、音声処理の流れを記録したいときに役立ちます
