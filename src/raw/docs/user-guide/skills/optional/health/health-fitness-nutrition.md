---
title: "Fitness Nutrition — wger / USDA を使ったトレーニング計画・マクロ栄養素・身体指標の計算"
description: "wger / USDA を使ったトレーニング計画・マクロ栄養素・身体指標の計算"
upstream_path: user-guide/skills/optional/health/health-fitness-nutrition.md
upstream_blob: 1ff5827959027f87731bc131dd7491453ed2e22a
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/health/health-fitness-nutrition
---

# Fitness Nutrition {#fitness-nutrition}

wger / USDA を使って、トレーニング計画・マクロ栄養素・身体指標を計算します。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加インストール — `hermes skills install official/health/fitness-nutrition` で入れます |
| パス | `optional-skills/health\fitness-nutrition` |
| バージョン | `1.0.0` |
| 作者 | Hailey Marshall (haileymarshall), Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `health`, `fitness`, `nutrition`, `gym`, `workout`, `diet`, `exercise` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# Fitness & Nutrition {#fitness-nutrition}

フィットネスコーチとスポーツ栄養士の役割をこなす skill です。2 つのデータ提供元と
オフライン計算をまとめてあり、ジムに通う人が必要とするものはひととおり揃います。

**データの提供元（どれも無料で、pip の追加インストールは要りません）:**

- **wger** (https://wger.de/api/v2/) — 公開されている種目データベースです。690 種類以上の種目に、鍛える筋肉・器具・画像が付いています。公開エンドポイントは認証なしで使えます。
- **USDA FoodData Central** (https://api.nal.usda.gov/fdc/v1/) — アメリカ政府の栄養データベースで、38 万件以上の食品が登録されています。`DEMO_KEY` ならすぐ使えますし、無料登録すれば上限が上がります。

**オフライン計算（Python の標準ライブラリだけで動きます）:**

- BMI、TDEE（Mifflin-St Jeor 式）、1 回挙上できる最大重量（Epley / Brzycki / Lombardi 式）、マクロ栄養素の配分、体脂肪率（US Navy 法）

---

## いつ使うか {#when-to-use}

次のような話題が出たら、この skill を呼び出します。

- 種目、トレーニングメニュー、ジムでの流れ、筋肉の部位、分割法
- 食品のマクロ栄養素、カロリー、たんぱく質量、献立作り、カロリー計算
- 体組成、つまり BMI・体脂肪・TDEE・摂取カロリーの過不足
- 1 回挙上できる最大重量の推定、トレーニング強度の割合、漸進性過負荷
- 減量期・増量期・維持期それぞれのマクロ栄養素の比率

---

## 手順 {#procedure}

### 種目を調べる（wger API） {#exercise-lookup-wger-api}

wger の公開エンドポイントはすべて JSON を返し、認証は要りません。種目を検索するときは
必ず `format=json` と `language=2`（英語）を付けてください。

**手順 1 — 何を知りたいのかを見極めます:**

- 筋肉から探す → `/api/v2/exercise/?muscles={id}&language=2&status=2&format=json`
- カテゴリから探す → `/api/v2/exercise/?category={id}&language=2&status=2&format=json`
- 器具から探す → `/api/v2/exercise/?equipment={id}&language=2&status=2&format=json`
- 名前から探す → `/api/v2/exercise/search/?term={query}&language=english&format=json`
- 詳細を見る → `/api/v2/exerciseinfo/{exercise_id}/?format=json`

**手順 2 — ID の一覧（余計な API 呼び出しをしなくて済みます）:**

種目のカテゴリ:

| ID | Category    |
|----|-------------|
| 8  | 腕          |
| 9  | 脚          |
| 10 | 腹          |
| 11 | 胸          |
| 12 | 背中        |
| 13 | 肩          |
| 14 | ふくらはぎ  |
| 15 | 有酸素      |

筋肉:

| ID | Muscle                    | ID | Muscle                  |
|----|---------------------------|----|-------------------------|
| 1  | 上腕二頭筋                | 2  | 三角筋前部              |
| 3  | 前鋸筋                    | 4  | 大胸筋                  |
| 5  | 外腹斜筋                  | 6  | 腓腹筋                  |
| 7  | 腹直筋                    | 8  | 大殿筋                  |
| 9  | 僧帽筋                    | 10 | 大腿四頭筋              |
| 11 | 大腿二頭筋                | 12 | 広背筋                  |
| 13 | 上腕筋                    | 14 | 上腕三頭筋              |
| 15 | ヒラメ筋                  |    |                         |

器具:

| ID | Equipment      |
|----|----------------|
| 1  | バーベル       |
| 3  | ダンベル       |
| 4  | ジムマット     |
| 5  | バランスボール |
| 6  | 懸垂バー       |
| 7  | なし（自重）   |
| 8  | ベンチ         |
| 9  | インクラインベンチ |
| 10 | ケトルベル     |

**手順 3 — 取得して見せます:**

```bash
# Search exercises by name
QUERY="$1"
ENCODED=$(python -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$QUERY")
curl -s "https://wger.de/api/v2/exercise/search/?term=${ENCODED}&language=english&format=json" \
  | python -c "

data=json.load(sys.stdin)
for s in data.get('suggestions',[])[:10]:
    d=s.get('data',{})
    print(f\"  ID {d.get('id','?'):>4} | {d.get('name','N/A'):<35} | Category: {d.get('category','N/A')}\")
"
```

```bash
# Get full details for a specific exercise
EXERCISE_ID="$1"
curl -s "https://wger.de/api/v2/exerciseinfo/${EXERCISE_ID}/?format=json" \
  | python -c "

data=json.load(sys.stdin)
trans=[t for t in data.get('translations',[]) if t.get('language')==2]
t=trans[0] if trans else data.get('translations',[{}])[0]
desc=re.sub('<[^>]+>','',html.unescape(t.get('description','N/A')))
print(f\"Exercise  : {t.get('name','N/A')}\")
print(f\"Category  : {data.get('category',{}).get('name','N/A')}\")
print(f\"Primary   : {', '.join(m.get('name_en','') for m in data.get('muscles',[])) or 'N/A'}\")
print(f\"Secondary : {', '.join(m.get('name_en','') for m in data.get('muscles_secondary',[])) or 'none'}\")
print(f\"Equipment : {', '.join(e.get('name','') for e in data.get('equipment',[])) or 'bodyweight'}\")
print(f\"How to    : {desc[:500]}\")
imgs=data.get('images',[])
if imgs: print(f\"Image     : {imgs[0].get('image','')}\")
"
```

```bash
# List exercises filtering by muscle, category, or equipment
# Combine filters as needed: ?muscles=4&equipment=1&language=2&status=2
FILTER="$1"  # e.g. "muscles=4" or "category=11" or "equipment=3"
curl -s "https://wger.de/api/v2/exercise/?${FILTER}&language=2&status=2&limit=20&format=json" \
  | python -c "

data=json.load(sys.stdin)
print(f'Found {data.get(\"count\",0)} exercises.')
for ex in data.get('results',[]):
    print(f\"  ID {ex['id']:>4} | muscles: {ex.get('muscles',[])} | equipment: {ex.get('equipment',[])}\")
"
```

### 栄養を調べる（USDA FoodData Central） {#nutrition-lookup-usda-fooddata-central}

環境変数 `USDA_API_KEY` があればそれを使い、なければ `DEMO_KEY` で動きます。
DEMO_KEY は 1 時間あたり 30 リクエストまで、無料登録した鍵なら 1 時間あたり 1,000 リクエストまでです。

```bash
# Search foods by name
FOOD="$1"
API_KEY="${USDA_API_KEY:-DEMO_KEY}"
ENCODED=$(python -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$FOOD")
curl -s "https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${API_KEY}&query=${ENCODED}&pageSize=5&dataType=Foundation,SR%20Legacy" \
  | python -c "

data=json.load(sys.stdin)
foods=data.get('foods',[])
if not foods: print('No foods found.'); sys.exit()
for f in foods:
    n={x['nutrientName']:x.get('value','?') for x in f.get('foodNutrients',[])}
    cal=n.get('Energy','?'); prot=n.get('Protein','?')
    fat=n.get('Total lipid (fat)','?'); carb=n.get('Carbohydrate, by difference','?')
    print(f\"{f.get('description','N/A')}\")
    print(f\"  Per 100g: {cal} kcal | {prot}g protein | {fat}g fat | {carb}g carbs\")
    print(f\"  FDC ID: {f.get('fdcId','N/A')}\")
    print()
"
```

```bash
# Detailed nutrient profile by FDC ID
FDC_ID="$1"
API_KEY="${USDA_API_KEY:-DEMO_KEY}"
curl -s "https://api.nal.usda.gov/fdc/v1/food/${FDC_ID}?api_key=${API_KEY}" \
  | python -c "

d=json.load(sys.stdin)
print(f\"Food: {d.get('description','N/A')}\")
print(f\"{'Nutrient':<40} {'Amount':>8} {'Unit'}\")
print('-'*56)
for x in sorted(d.get('foodNutrients',[]),key=lambda x:x.get('nutrient',{}).get('rank',9999)):
    nut=x.get('nutrient',{}); amt=x.get('amount',0)
    if amt and float(amt)>0:
        print(f\"  {nut.get('name',''):<38} {amt:>8} {nut.get('unitName','')}\")
"
```

### オフラインで計算する {#offline-calculators}

まとめて処理したいときは `scripts/` にある補助スクリプトを使い、
1 件だけならその場で実行します。

- `python scripts/body_calc.py bmi <weight_kg> <height_cm>`
- `python scripts/body_calc.py tdee <weight_kg> <height_cm> <age> <M|F> <activity 1-5>`
- `python scripts/body_calc.py 1rm <weight> <reps>`
- `python scripts/body_calc.py macros <tdee_kcal> <cut|maintain|bulk>`
- `python scripts/body_calc.py bodyfat <M|F> <neck_cm> <waist_cm> [hip_cm] <height_cm>`

それぞれの式の根拠は `references/FORMULAS.md` にまとめてあります。

---

## つまずきやすいところ {#pitfalls}

- wger の種目エンドポイントは、既定では**すべての言語**を返します。英語だけにするには `language=2` を必ず付けてください
- wger には**未確認の投稿**も含まれます。承認済みのものだけを取るには `status=2` を付けます
- USDA の `DEMO_KEY` は**1 時間あたり 30 リクエスト**までです。まとめて叩くときはあいだに `sleep 2` を入れるか、無料の鍵を取得してください
- USDA のデータは**100g あたり**の値です。実際に食べる量に換算するよう伝えてください
- BMI は筋肉と脂肪を区別しません。筋肉質な人の高い BMI が、そのまま不健康を意味するわけではありません
- 体脂肪率の計算式はあくまで**目安**（±3〜5%）です。正確に測りたいなら DEXA スキャンをすすめてください
- 1RM の式は 10 回を超えると精度が落ちます。3〜5 回のセットで測ると推定が安定します
- wger の `exercise/search` エンドポイントは、引数の名前が `query` ではなく `term` です

---

## 確認のしかた {#verification}

種目検索を実行したあと: 結果に種目名・鍛える筋肉・器具が含まれているか確かめます。
栄養を調べたあと: 100g あたりのカロリー・たんぱく質・脂質・炭水化物が返っているか確かめます。
計算したあと: 出てきた値が妥当か見直します（たとえば TDEE は成人ならおおむね 1500〜3500 に収まります）。

---

## 早見表 {#quick-reference}

| Task | Source | Endpoint |
|------|--------|----------|
| 名前で種目を検索する | wger | `GET /api/v2/exercise/search/?term=&language=english` |
| 種目の詳細を見る | wger | `GET /api/v2/exerciseinfo/{id}/` |
| 筋肉で絞り込む | wger | `GET /api/v2/exercise/?muscles={id}&language=2&status=2` |
| 器具で絞り込む | wger | `GET /api/v2/exercise/?equipment={id}&language=2&status=2` |
| カテゴリの一覧を見る | wger | `GET /api/v2/exercisecategory/` |
| 筋肉の一覧を見る | wger | `GET /api/v2/muscle/` |
| 食品を検索する | USDA | `GET /fdc/v1/foods/search?query=&dataType=Foundation,SR Legacy` |
| 食品の詳細を見る | USDA | `GET /fdc/v1/food/{fdcId}` |
| BMI / TDEE / 1RM / マクロ栄養素 | オフライン | `python scripts/body_calc.py` |
