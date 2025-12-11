# Contributing Guide

本リポジトリでは、Next.js App Router を前提とした Feature-first 構成 を採用しています。  
責務分離と依存方向の一貫性を保つため、以下のガイドラインに従って実装してください。

---

## アーキテクチャ概要

コードは次の 4 層で構成します。

### Routing 層（app/）
- URL と画面構造の管理  
- `page.tsx` / `layout.tsx` の配置のみ  
- ビジネスロジックは禁止  
- 役割：画面の「配置」

### Feature 層（features/）
- articles, auth など機能単位をまとめた層  
- UI（components）・hooks・server が共存  
- 他 feature への直接依存は禁止  
- 役割：機能のまとまりを作る

### UI コンポーネント層（components/ui）
- 再利用可能な UI コンポーネント  
- 例：Button, Card, Dialog  
- features → components/ui の一方向依存のみ  
- 役割：ドメインに依存しない UI の提供

### Server 基盤層（server/）
- 複数 features から使う server-only 処理  
- DB / 認証 / LLM / ファイル操作など  
- 役割：共通の安全なサーバーロジック

---

## ディレクトリ構成（例）

```
app/
  (app)/
    layout.tsx
    page.tsx
    articles/
      page.tsx

features/
  articles/
    components/
    hooks/
    server/
  auth/
    components/
    hooks/
    server/

components/
  ui/

server/
  db/
  auth/
  llm/

lib/
  schemas/
  types/
  hooks/
```

---

## Server Components と Client Components

### 原則
1. デフォルトは Server Component  
2. インタラクションが必要なときのみ Client Component  
3. server-only の処理は必ず server/ or features/<name>/server に置く

### ディレクトリごとの扱い

- app/：Server Component が基本。画面構造だけを書く。  
- features/：UI + hooks + server をまとめる最小単位。  
- components/ui/：共通 UI。必要なもののみ `use client`。  
- server/：DB / auth / LLM など基盤 server-only 処理。

### 推奨依存方向

```
app → features → server → lib
```

### アンチパターン

- `page.tsx` に安易に `use client`  
- Client Component で DB / 認証 / LLM を呼ぶ  
- server-only の処理を props でブラウザへ渡す  
- UI コンポーネントを全面的に Client Component 化  
- app/ にロジックを書く  

---

## Hooks / 状態管理 / schemas / types

### 基本方針

- hooks は feature 単位  
- store は feature 内に閉じる（必要最低限で lib に昇格）  
- zod スキーマは `schemas/` に統一  
- TypeScript-only の型は `types/`  
- 依存は一方向に保つ：

```
components/ui → features → server → lib (schemas/types)
```

---

### Hooks

#### Feature 専用 Hooks
```
features/articles/hooks/use-articles.ts
features/auth/hooks/use-auth.ts
```
- UI ロジック  
- 他 feature への依存は禁止

#### 共通 Hooks
```
lib/hooks/use-debounce.ts
lib/hooks/use-media-query.ts
```

---

### Store（状態管理）

#### Feature 内に閉じる store（推奨）
```
features/editor/store/editor-store.ts
features/articles/store/filter-store.ts
```

#### アプリ横断（最低限）
```
lib/store/theme-store.ts
```

---

### schemas（zod スキーマ）

#### lib（アプリ共通）
```
lib/schemas/article.ts
lib/schemas/user.ts
```

#### features（画面固有のフォーム等）
```
features/articles/schemas/article-form.ts
features/auth/schemas/login-form.ts
```

---

### types （TypeScript のみの型）

#### lib（共有型）
```
lib/types/ui.ts
lib/types/pagination.ts
```

#### features（機能固有）
```
features/articles/types/article-view.ts
```

---

### schemas と types の使い分け基準

schemas（zod）を使うべき場面：
- API / DB / フォームなど境界データ  
- LLM レスポンス  
- URL パラメータ  
- ランタイムバリデーションが必要なデータ  

types（TS-only）で十分な場面：
- UI 状態  
- コンポーネント props  
- 内部的にしか使わない型  
- パフォーマンス重視の軽量型  

---

## CSS / スタイルガイド

### 基本方針
- グローバルとコンポーネントでスタイルを分離  
- 各コンポーネントは CSS Modules を隣に置く  
- 共通値は CSS 変数（デザイントークン）で管理  

### 配置ルール

#### グローバル
```
styles/
  base.css
  tokens.css
  utilities.css
```
`app/globals.css` から読み込む。

#### コンポーネント固有
```
components/ui/button.tsx
components/ui/button.module.css

features/articles/components/article-card.tsx
features/articles/components/article-card.module.css
```

---

### CSS Modules （使い方）

```
import styles from "./button.module.css";

export function Button(props) {
  return <button className={styles.button} {...props} />;
}
```

対応 CSS:

```
.button {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}
```

---

### デザイントークン （CSS変数）

```
:root {
  --color-bg: #0b1020;
  --color-fg: #f8fafc;
  --color-accent: #4f46e5;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;

  --radius-sm: 4px;
  --radius-md: 8px;
}
```

利用例：

```
.card {
  background-color: var(--color-bg);
  padding: var(--space-3);
  border-radius: var(--radius-md);
}
```

---

### アンチパターン

- `globals.css` にコンポーネント固有の CSS  
- リテラル値（`#fff`, `12px`）を多用  
- 1つの module.css に複数コンポーネントを詰め込む  
- 別ディレクトリの module.css を import する  
