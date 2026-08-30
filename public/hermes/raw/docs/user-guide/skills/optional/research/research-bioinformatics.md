---
title: "Bioinformatics — ゲノム解析と計算生物学の 400 以上の skill への入口"
description: "ゲノム解析と計算生物学の 400 以上の skill への入口"
upstream_path: user-guide/skills/optional/research/research-bioinformatics.md
upstream_blob: dae339a0490b268e0424afd16068ed5e1b5cbfde
sources:
  - https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-bioinformatics
---

# Bioinformatics {#bioinformatics}

ゲノム解析と計算生物学の 400 以上の skill への入口です。

## skill の情報 {#skill-metadata}

| | |
|---|---|
| 提供元 | 追加で入れるもの — `hermes skills install official/research/bioinformatics` で導入します |
| パス | `optional-skills/research\bioinformatics` |
| バージョン | `1.0.0` |
| 作者 | Teknium（teknium1）、Hermes Agent |
| ライセンス | MIT |
| 対応プラットフォーム | linux, macos |
| タグ | `bioinformatics`, `genomics`, `sequencing`, `biology`, `research`, `science` |

## 参考: SKILL.md 全文 {#reference-full-skillmd}

:::info
以下は、この skill が呼び出されたときに Hermes が読み込む skill 定義の全文です。skill が有効なあいだ、エージェントはこれを指示として受け取ります。
:::

# バイオインフォマティクス skill への入口 {#bioinformatics-skills-gateway}

バイオインフォマティクス、ゲノム解析、シーケンシング、バリアントコール、遺伝子発現、シングルセル解析、タンパク質構造、薬理ゲノミクス、メタゲノミクス、系統解析など、計算生物学の作業について尋ねられたときに使います。

この skill は、公開されている 2 つのバイオインフォマティクス skill 集への入口です。何百もの専門 skill を丸ごと同梱するのではなく、目録を持っておいて、必要なものをそのつど取ってきます。

## 参照先 {#sources}

◆ **bioSkills** — 385 個の参考 skill（コードの書き方、パラメーターの手引き、判断の道筋）
  リポジトリ: https://github.com/GPTomics/bioSkills
  形式: 話題ごとに SKILL.md があり、コード例が付いています。Python / R / CLI です。

◆ **ClawBio** — 実行できる 33 個のパイプライン skill（実行できるスクリプト、再現用の一式）
  リポジトリ: https://github.com/ClawBio/ClawBio
  形式: デモ付きの Python スクリプトです。解析ごとに report.md + commands.sh + environment.yml を書き出します。

## skill の取ってき方と使い方 {#how-to-fetch-and-use-a-skill}

1. 下の目録から、分野と skill の名前を見つけます。
2. 該当のリポジトリを取ってきます（時間を節約するため浅いクローンにします）。
   ```bash
   # bioSkills (reference material)
   git clone --depth 1 https://github.com/GPTomics/bioSkills.git /tmp/bioSkills

   # ClawBio (runnable pipelines)
   git clone --depth 1 https://github.com/ClawBio/ClawBio.git /tmp/ClawBio
   ```
3. 目当ての skill を読みます。
   ```bash
   # bioSkills — each skill is at: <category>/<skill-name>/SKILL.md
   cat /tmp/bioSkills/variant-calling/gatk-variant-calling/SKILL.md

   # ClawBio — each skill is at: skills/<skill-name>/
   cat /tmp/ClawBio/skills/pharmgx-reporter/README.md
   ```
4. 取ってきた skill は参考資料として使ってください。これらは Hermes 形式の skill ではありません。その分野の専門家が書いた手引きとして扱います。正しいパラメーター、適切なツールの指定、検証済みのパイプラインが載っています。

## 分野ごとの skill 目録 {#skill-index-by-domain}

### 配列の基礎 {#sequence-fundamentals}
bioSkills:
  sequence-io/ — read-sequences, write-sequences, format-conversion, batch-processing, compressed-files, fastq-quality, filter-sequences, paired-end-fastq, sequence-statistics
  sequence-manipulation/ — seq-objects, reverse-complement, transcription-translation, motif-search, codon-usage, sequence-properties, sequence-slicing
ClawBio:
  seq-wrangler — 配列の品質確認、アライメント、BAM の処理（FastQC・BWA・SAMtools を包んだもの）

### リードの品質確認とアライメント {#read-qc-alignment}
bioSkills:
  read-qc/ — quality-reports, fastp-workflow, adapter-trimming, quality-filtering, umi-processing, contamination-screening, rnaseq-qc
  read-alignment/ — bwa-alignment, star-alignment, hisat2-alignment, bowtie2-alignment
  alignment-files/ — sam-bam-basics, alignment-sorting, alignment-filtering, bam-statistics, duplicate-handling, pileup-generation

### バリアントコールと注釈付け {#variant-calling-annotation}
bioSkills:
  variant-calling/ — gatk-variant-calling, deepvariant, variant-calling (bcftools), joint-calling, structural-variant-calling, filtering-best-practices, variant-annotation, variant-normalization, vcf-basics, vcf-manipulation, vcf-statistics, consensus-sequences, clinical-interpretation
ClawBio:
  vcf-annotator — VEP + ClinVar + gnomAD による注釈付け（祖先集団の違いも踏まえます）
  variant-annotation — バリアントに注釈を付けるパイプライン

### 発現変動解析（バルク RNA-seq） {#differential-expression-bulk-rna-seq}
bioSkills:
  differential-expression/ — deseq2-basics, edger-basics, batch-correction, de-results, de-visualization, timeseries-de
  rna-quantification/ — alignment-free-quant (Salmon/kallisto), featurecounts-counting, tximport-workflow, count-matrix-qc
  expression-matrix/ — counts-ingest, gene-id-mapping, metadata-joins, sparse-handling
ClawBio:
  rnaseq-de — 品質確認・正規化・可視化まで含めた発現変動解析の一式
  diff-visualizer — 発現変動の結果を手厚く図にしてまとめるもの

### シングルセル RNA-seq {#single-cell-rna-seq}
bioSkills:
  single-cell/ — preprocessing, clustering, batch-integration, cell-annotation, cell-communication, doublet-detection, markers-annotation, trajectory-inference, multimodal-integration, perturb-seq, scatac-analysis, lineage-tracing, metabolite-communication, data-io
ClawBio:
  scrna-orchestrator — Scanpy を使った一式（品質確認、クラスタリング、マーカー、細胞の同定）
  scrna-embedding — scVI による潜在表現とバッチ統合

### 空間トランスクリプトミクス {#spatial-transcriptomics}
bioSkills:
  spatial-transcriptomics/ — spatial-data-io, spatial-preprocessing, spatial-domains, spatial-deconvolution, spatial-communication, spatial-neighbors, spatial-statistics, spatial-visualization, spatial-multiomics, spatial-proteomics, image-analysis

### エピゲノミクス {#epigenomics}
bioSkills:
  chip-seq/ — peak-calling, differential-binding, motif-analysis, peak-annotation, chipseq-qc, chipseq-visualization, super-enhancers
  atac-seq/ — atac-peak-calling, atac-qc, differential-accessibility, footprinting, motif-deviation, nucleosome-positioning
  methylation-analysis/ — bismark-alignment, methylation-calling, dmr-detection, methylkit-analysis
  hi-c-analysis/ — hic-data-io, tad-detection, loop-calling, compartment-analysis, contact-pairs, matrix-operations, hic-visualization, hic-differential
ClawBio:
  methylation-clock — メチル化から生物学的な年齢を見積もるもの

### 薬理ゲノミクスと臨床 {#pharmacogenomics-clinical}
bioSkills:
  clinical-databases/ — clinvar-lookup, gnomad-frequencies, dbsnp-queries, pharmacogenomics, polygenic-risk, hla-typing, variant-prioritization, somatic-signatures, tumor-mutational-burden, myvariant-queries
ClawBio:
  pharmgx-reporter — 23andMe / AncestryDNA のデータから薬理ゲノミクスの報告書を作るもの（12 遺伝子、31 SNP、51 薬剤）
  drug-photo — 薬の写真から、その人向けの薬理ゲノミクスの用量カードを作るもの（画像認識を使います）
  clinpgx — 遺伝子と薬の関係、CPIC の指針を ClinPGx の API から取るもの
  gwas-lookup — 9 つのゲノムデータベースをまたいでバリアントを調べるもの
  gwas-prs — 一般向け遺伝子検査のデータからポリジェニックリスクスコアを出すもの
  nutrigx_advisor — 一般向け遺伝子検査のデータから、その人向けの栄養の提案を出すもの

### 集団遺伝学と GWAS {#population-genetics-gwas}
bioSkills:
  population-genetics/ — association-testing (PLINK GWAS), plink-basics, population-structure, linkage-disequilibrium, scikit-allel-analysis, selection-statistics
  causal-genomics/ — mendelian-randomization, fine-mapping, colocalization-analysis, mediation-analysis, pleiotropy-detection
  phasing-imputation/ — haplotype-phasing, genotype-imputation, imputation-qc, reference-panels
ClawBio:
  claw-ancestry-pca — SGDP の参照パネルに対する祖先集団の主成分分析

### メタゲノミクスとマイクロバイオーム {#metagenomics-microbiome}
bioSkills:
  metagenomics/ — kraken-classification, metaphlan-profiling, abundance-estimation, functional-profiling, amr-detection, strain-tracking, metagenome-visualization
  microbiome/ — amplicon-processing, diversity-analysis, differential-abundance, taxonomy-assignment, functional-prediction, qiime2-workflow
ClawBio:
  claw-metagenomics — ショットガン法によるメタゲノム解析（分類群、薬剤耐性、機能経路）

### ゲノムの構築と注釈付け {#genome-assembly-annotation}
bioSkills:
  genome-assembly/ — hifi-assembly, long-read-assembly, short-read-assembly, metagenome-assembly, assembly-polishing, assembly-qc, scaffolding, contamination-detection
  genome-annotation/ — eukaryotic-gene-prediction, prokaryotic-annotation, functional-annotation, ncrna-annotation, repeat-annotation, annotation-transfer
  long-read-sequencing/ — basecalling, long-read-alignment, long-read-qc, clair3-variants, structural-variants, medaka-polishing, nanopore-methylation, isoseq-analysis

### 構造生物学とケモインフォマティクス {#structural-biology-chemoinformatics}
bioSkills:
  structural-biology/ — alphafold-predictions, modern-structure-prediction, structure-io, structure-navigation, structure-modification, geometric-analysis
  chemoinformatics/ — molecular-io, molecular-descriptors, similarity-searching, substructure-search, virtual-screening, admet-prediction, reaction-enumeration
ClawBio:
  struct-predictor — 手元で AlphaFold / Boltz / Chai を動かして構造を予測し、見比べるもの

### プロテオミクス {#proteomics}
bioSkills:
  proteomics/ — data-import, peptide-identification, protein-inference, quantification, differential-abundance, dia-analysis, ptm-analysis, proteomics-qc, spectral-libraries
ClawBio:
  proteomics-de — プロテオミクスの発現変動解析

### パスウェイ解析と遺伝子ネットワーク {#pathway-analysis-gene-networks}
bioSkills:
  pathway-analysis/ — go-enrichment, gsea, kegg-pathways, reactome-pathways, wikipathways, enrichment-visualization
  gene-regulatory-networks/ — scenic-regulons, coexpression-networks, differential-networks, multiomics-grn, perturbation-simulation

### 免疫インフォマティクス {#immunoinformatics}
bioSkills:
  immunoinformatics/ — mhc-binding-prediction, epitope-prediction, neoantigen-prediction, immunogenicity-scoring, tcr-epitope-binding
  tcr-bcr-analysis/ — mixcr-analysis, scirpy-analysis, immcantation-analysis, repertoire-visualization, vdjtools-analysis

### CRISPR とゲノム編集 {#crispr-genome-engineering}
bioSkills:
  crispr-screens/ — mageck-analysis, jacks-analysis, hit-calling, screen-qc, library-design, crispresso-editing, base-editing-analysis, batch-correction
  genome-engineering/ — grna-design, off-target-prediction, hdr-template-design, base-editing-design, prime-editing-design

### ワークフローの管理 {#workflow-management}
bioSkills:
  workflow-management/ — snakemake-workflows, nextflow-pipelines, cwl-workflows, wdl-workflows
ClawBio:
  repro-enforcer — どんな解析でも再現用の一式として書き出すもの（Conda 環境 + Singularity + チェックサム）
  galaxy-bridge — usegalaxy.org の 8,000 以上の Galaxy ツールを使うもの

### 個別の分野 {#specialized-domains}
bioSkills:
  alternative-splicing/ — splicing-quantification, differential-splicing, isoform-switching, sashimi-plots, single-cell-splicing, splicing-qc
  ecological-genomics/ — edna-metabarcoding, landscape-genomics, conservation-genetics, biodiversity-metrics, community-ecology, species-delimitation
  epidemiological-genomics/ — pathogen-typing, variant-surveillance, phylodynamics, transmission-inference, amr-surveillance
  liquid-biopsy/ — cfdna-preprocessing, ctdna-mutation-detection, fragment-analysis, tumor-fraction-estimation, methylation-based-detection, longitudinal-monitoring
  epitranscriptomics/ — m6a-peak-calling, m6a-differential, m6anet-analysis, merip-preprocessing, modification-visualization
  metabolomics/ — xcms-preprocessing, metabolite-annotation, normalization-qc, statistical-analysis, pathway-mapping, lipidomics, targeted-analysis, msdial-preprocessing
  flow-cytometry/ — fcs-handling, gating-analysis, compensation-transformation, clustering-phenotyping, differential-analysis, cytometry-qc, doublet-detection, bead-normalization
  systems-biology/ — flux-balance-analysis, metabolic-reconstruction, gene-essentiality, context-specific-models, model-curation
  rna-structure/ — secondary-structure-prediction, ncrna-search, structure-probing

### データの可視化と報告 {#data-visualization-reporting}
bioSkills:
  data-visualization/ — ggplot2-fundamentals, heatmaps-clustering, volcano-customization, circos-plots, genome-browser-tracks, interactive-visualization, multipanel-figures, network-visualization, upset-plots, color-palettes, specialized-omics-plots, genome-tracks
  reporting/ — rmarkdown-reports, quarto-reports, jupyter-reports, automated-qc-reports, figure-export
ClawBio:
  profile-report — 解析のプロファイルを報告書にするもの
  data-extractor — 科学論文の図の画像から数値を取り出すもの（画像認識を使います）
  lit-synthesizer — PubMed / bioRxiv の検索、要約、引用関係の図示
  pubmed-summariser — 遺伝子や疾患について PubMed を調べ、決まった形にまとめるもの

### データベースの利用 {#database-access}
bioSkills:
  database-access/ — entrez-search, entrez-fetch, entrez-link, blast-searches, local-blast, sra-data, geo-data, uniprot-access, batch-downloads, interaction-databases, sequence-similarity
ClawBio:
  ukb-navigator — UK Biobank の 12,000 以上の項目を意味で検索するもの
  clinical-trial-finder — 臨床試験を探すもの

### 実験の計画 {#experimental-design}
bioSkills:
  experimental-design/ — power-analysis, sample-size, batch-design, multiple-testing

### オミクスのための機械学習 {#machine-learning-for-omics}
bioSkills:
  machine-learning/ — omics-classifiers, biomarker-discovery, survival-analysis, model-validation, prediction-explanation, atlas-mapping
ClawBio:
  claw-semantic-sim — 疾患に関する文献の意味的な類似度をまとめた索引（PubMedBERT）
  omics-target-evidence-mapper — 複数のオミクスをまたいで、標的ごとの根拠をまとめるもの

## 環境の準備 {#environment-setup}

これらの skill は、バイオインフォマティクス向けに整えた作業環境を前提にしています。よく使うものは次のとおりです。

```bash
# Python
pip install biopython pysam cyvcf2 pybedtools pyBigWig scikit-allel anndata scanpy mygene

# R/Bioconductor
Rscript -e 'BiocManager::install(c("DESeq2","edgeR","Seurat","clusterProfiler","methylKit"))'

# CLI tools (Ubuntu/Debian)
sudo apt install samtools bcftools ncbi-blast+ minimap2 bedtools

# CLI tools (macOS)
brew install samtools bcftools blast minimap2 bedtools

# Or via Conda (recommended for reproducibility)
conda install -c bioconda samtools bcftools blast minimap2 bedtools fastp kraken2
```

## つまずきやすいところ {#pitfalls}

- 取ってきた skill は Hermes の SKILL.md 形式ではありません。それぞれ独自の作りになっています（bioSkills はコード例集、ClawBio は README + Python スクリプト）。専門家の参考資料として読んでください。
- bioSkills は手引きです。正しいパラメーターやコードの書き方は載っていますが、そのまま動くパイプラインではありません。
- ClawBio の skill は実行できます。`--demo` を付けられるものが多く、そのまま動かせます。
- どちらのリポジトリも、バイオインフォマティクスのツールが入っている前提です。パイプラインを動かす前に、必要なものがそろっているか確かめてください。
- ClawBio では、クローンしたリポジトリでまず `pip install -r requirements.txt` を実行してください。
- ゲノムのデータファイルはとても大きくなります。参照ゲノムや SRA のデータを落とすとき、索引を作るときは、ディスクの空きに気を付けてください。
