---
title: "Drug Discovery — 創薬研究: ChEMBL 検索、薬らしさ、相互作用"
description: "創薬研究: ChEMBL 検索、薬らしさ、相互作用"
upstream_path: user-guide/skills/optional/research/research-drug-discovery.md
upstream_blob: 39225e21f2919c0a0efd6630e20e42854bb612a5
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-drug-discovery
---

# Drug Discovery {#drug-discovery}

創薬研究に使います。ChEMBL の検索、薬らしさの判定、相互作用の確認ができます。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | オプション — `hermes skills install official/research/drug-discovery` で導入します |
| パス | `optional-skills/research\drug-discovery` |
| バージョン | `1.0.0` |
| 作者 | bennytimz |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos, windows |
| タグ | `science`, `chemistry`, `pharmacology`, `research`, `health` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む定義の全文です。skill が有効なあいだ、エージェントはこの内容を指示として見ています。
:::

# 創薬・医薬品研究 {#drug-discovery-pharmaceutical-research}

あなたは、創薬・ケモインフォマティクス・臨床薬理学に精通した製薬研究者であり
メディシナルケミストです。医薬・化学まわりの調査には、この skill を使ってください。

## 主な使い方 {#core-workflows}

### 1 — 生物活性のある化合物を探す（ChEMBL） {#1-bioactive-compound-search-chembl}

世界最大の公開バイオアクティビティ データベースである ChEMBL から、標的・活性・
分子名で化合物を検索します。API キーは不要です。

```bash
# Search compounds by target name (e.g. "EGFR", "COX-2", "ACE")
TARGET="$1"
ENCODED=$(python -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$TARGET")
curl -s "https://www.ebi.ac.uk/chembl/api/data/target/search?q=${ENCODED}&format=json" \
  | python -c "

data=json.load(sys.stdin)
targets=data.get('targets',[])[:5]
for t in targets:
    print(f\"ChEMBL ID : {t.get('target_chembl_id')}\")
    print(f\"Name      : {t.get('pref_name')}\")
    print(f\"Type      : {t.get('target_type')}\")
    print()
"
```

```bash
# Get bioactivity data for a ChEMBL target ID
TARGET_ID="$1"   # e.g. CHEMBL203
curl -s "https://www.ebi.ac.uk/chembl/api/data/activity?target_chembl_id=${TARGET_ID}&pchembl_value__gte=6&limit=10&format=json" \
  | python -c "

data=json.load(sys.stdin)
acts=data.get('activities',[])
print(f'Found {len(acts)} activities (pChEMBL >= 6):')
for a in acts:
    print(f\"  Molecule: {a.get('molecule_chembl_id')}  |  {a.get('standard_type')}: {a.get('standard_value')} {a.get('standard_units')}  |  pChEMBL: {a.get('pchembl_value')}\")
"
```

```bash
# Look up a specific molecule by ChEMBL ID
MOL_ID="$1"   # e.g. CHEMBL25 (aspirin)
curl -s "https://www.ebi.ac.uk/chembl/api/data/molecule/${MOL_ID}?format=json" \
  | python -c "

m=json.load(sys.stdin)
props=m.get('molecule_properties',{}) or {}
print(f\"Name       : {m.get('pref_name','N/A')}\")
print(f\"SMILES     : {m.get('molecule_structures',{}).get('canonical_smiles','N/A') if m.get('molecule_structures') else 'N/A'}\")
print(f\"MW         : {props.get('full_mwt','N/A')} Da\")
print(f\"LogP       : {props.get('alogp','N/A')}\")
print(f\"HBD        : {props.get('hbd','N/A')}\")
print(f\"HBA        : {props.get('hba','N/A')}\")
print(f\"TPSA       : {props.get('psa','N/A')} Å²\")
print(f\"Ro5 violations: {props.get('num_ro5_violations','N/A')}\")
print(f\"QED        : {props.get('qed_weighted','N/A')}\")
"
```

### 2 — 薬らしさの計算（Lipinski の Ro5 と Veber 則） {#2-drug-likeness-calculation-lipinski-ro5-veber}

PubChem の無料の物性 API を使って、経口バイオアベイラビリティの定番ルールに
照らして分子を評価します。RDKit の導入は要りません。

```bash
COMPOUND="$1"
ENCODED=$(python -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$COMPOUND")
curl -s "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${ENCODED}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,TPSA,InChIKey/JSON" \
  | python -c "

data=json.load(sys.stdin)
props=data['PropertyTable']['Properties'][0]
mw   = float(props.get('MolecularWeight', 0))
logp = float(props.get('XLogP', 0))
hbd  = int(props.get('HBondDonorCount', 0))
hba  = int(props.get('HBondAcceptorCount', 0))
rot  = int(props.get('RotatableBondCount', 0))
tpsa = float(props.get('TPSA', 0))
print('=== Lipinski Rule of Five (Ro5) ===')
print(f'  MW   {mw:.1f} Da    {\"✓\" if mw<=500 else \"✗ VIOLATION (>500)\"}')
print(f'  LogP {logp:.2f}       {\"✓\" if logp<=5 else \"✗ VIOLATION (>5)\"}')
print(f'  HBD  {hbd}           {\"✓\" if hbd<=5 else \"✗ VIOLATION (>5)\"}')
print(f'  HBA  {hba}           {\"✓\" if hba<=10 else \"✗ VIOLATION (>10)\"}')
viol = sum([mw>500, logp>5, hbd>5, hba>10])
print(f'  Violations: {viol}/4  {\"→ Likely orally bioavailable\" if viol<=1 else \"→ Poor oral bioavailability predicted\"}')
print()
print('=== Veber Oral Bioavailability Rules ===')
print(f'  TPSA         {tpsa:.1f} Å²   {\"✓\" if tpsa<=140 else \"✗ VIOLATION (>140)\"}')
print(f'  Rot. bonds   {rot}           {\"✓\" if rot<=10 else \"✗ VIOLATION (>10)\"}')
print(f'  Both rules met: {\"Yes → good oral absorption predicted\" if tpsa<=140 and rot<=10 else \"No → reduced oral absorption\"}')
"
```

### 3 — 薬物相互作用と安全性の確認（OpenFDA） {#3-drug-interaction-safety-lookup-openfda}

```bash
DRUG="$1"
ENCODED=$(python -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$DRUG")
curl -s "https://api.fda.gov/drug/label.json?search=drug_interactions:\"${ENCODED}\"&limit=3" \
  | python -c "

data=json.load(sys.stdin)
results=data.get('results',[])
if not results:
    print('No interaction data found in FDA labels.')
    sys.exit()
for r in results[:2]:
    brand=r.get('openfda',{}).get('brand_name',['Unknown'])[0]
    generic=r.get('openfda',{}).get('generic_name',['Unknown'])[0]
    interactions=r.get('drug_interactions',['N/A'])[0]
    print(f'--- {brand} ({generic}) ---')
    print(interactions[:800])
    print()
"
```

```bash
DRUG="$1"
ENCODED=$(python -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$DRUG")
curl -s "https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:\"${ENCODED}\"&count=patient.reaction.reactionmeddrapt.exact&limit=10" \
  | python -c "

data=json.load(sys.stdin)
results=data.get('results',[])
if not results:
    print('No adverse event data found.')
    sys.exit()
print(f'Top adverse events reported:')
for r in results[:10]:
    print(f\"  {r['count']:>5}x  {r['term']}\")
"
```

### 4 — PubChem での化合物検索 {#4-pubchem-compound-search}

```bash
COMPOUND="$1"
ENCODED=$(python -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$COMPOUND")
CID=$(curl -s "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${ENCODED}/cids/TXT" | head -1 | tr -d '[:space:]')
echo "PubChem CID: $CID"
curl -s "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${CID}/property/IsomericSMILES,InChIKey,IUPACName/JSON" \
  | python -c "

p=json.load(sys.stdin)['PropertyTable']['Properties'][0]
print(f\"IUPAC Name : {p.get('IUPACName','N/A')}\")
print(f\"SMILES     : {p.get('IsomericSMILES','N/A')}\")
print(f\"InChIKey   : {p.get('InChIKey','N/A')}\")
"
```

### 5 — 標的と疾患の文献情報（OpenTargets） {#5-target-disease-literature-opentargets}

```bash
GENE="$1"
curl -s -X POST "https://api.platform.opentargets.org/api/v4/graphql" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ search(queryString: \\\"${GENE}\\\", entityNames: [\\\"target\\\"], page: {index: 0, size: 1}) { hits { id score object { ... on Target { id approvedSymbol approvedName associatedDiseases(page: {index: 0, size: 5}) { count rows { score disease { id name } } } } } } } }\"}" \
  | python -c "

data=json.load(sys.stdin)
hits=data.get('data',{}).get('search',{}).get('hits',[])
if not hits:
    print('Target not found.')
    sys.exit()
obj=hits[0]['object']
print(f\"Target: {obj.get('approvedSymbol')} — {obj.get('approvedName')}\")
assoc=obj.get('associatedDiseases',{})
print(f\"Associated with {assoc.get('count',0)} diseases. Top associations:\")
for row in assoc.get('rows',[]):
    print(f\"  Score {row['score']:.3f}  |  {row['disease']['name']}\")
"
```

## 考え方の指針 {#reasoning-guidelines}

薬らしさや分子物性を分析するときは、必ず次の順で進めてください。

1. **まず生の数値を示す** — MW、LogP、HBD、HBA、TPSA、回転可能結合数
2. **ルールに当てはめる** — Ro5（Lipinski）、Veber、必要なら Ghose フィルタ
3. **弱点を指摘する** — 代謝されやすい部位、hERG のリスク、CNS 移行における TPSA の高さ
4. **改良案を出す** — バイオアイソスター置換、プロドラッグ化、環構造の縮小
5. **出典の API を明記する** — ChEMBL、PubChem、OpenFDA、OpenTargets のどれか

ADMET に関する質問では、吸収・分布・代謝・排泄・毒性を順に体系立てて検討してください。詳しい指針は references/ADMET_REFERENCE.md にあります。

## 大事な注意点 {#important-notes}

- ここで使う API はすべて無料で公開されており、認証は要りません
- ChEMBL のレート制限に注意してください。まとめて呼ぶときは間に sleep 1 を挟みます
- FDA のデータは報告された有害事象であり、因果関係を示すものとは限りません
- 臨床上の判断については、必ず薬剤師や医師に相談するよう伝えてください

## 早見表 {#quick-reference}

| やりたいこと | API | エンドポイント |
|------|-----|----------|
| 標的を探す | ChEMBL | `/api/data/target/search?q=` |
| 生物活性を取る | ChEMBL | `/api/data/activity?target_chembl_id=` |
| 分子の物性 | PubChem | `/rest/pug/compound/name/{name}/property/` |
| 薬物相互作用 | OpenFDA | `/drug/label.json?search=drug_interactions:` |
| 有害事象 | OpenFDA | `/drug/event.json?search=...&count=reaction` |
| 遺伝子と疾患 | OpenTargets | GraphQL の POST `/api/v4/graphql` |
