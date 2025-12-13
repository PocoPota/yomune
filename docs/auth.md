# 認証システムドキュメント

## 概要

このプロジェクトでは、Supabase AuthとNext.js App Routerを使用した認証システムを実装しています。
Cookieベースのセッション管理により、Server ComponentsやServer Actionsでの認証状態の確認が可能です。

## アーキテクチャ

- **認証プロバイダー**: Supabase Auth
- **認証方式**: OAuth (Google)
- **セッション管理**: Cookieベース

## ファイル構成

```
src/
├── app/
│   ├── (app)/
│   │   └── layout.tsx           # 認証が必要なページのレイアウト
│   └── (auth)/
│       └── auth/
│           ├── callback/
│           │   └── route.ts     # OAuth認証コールバック
│           └── error/
│               └── page.tsx     # 認証エラーページ
├── features/
│   └── auth/
│       └── AuthButton.tsx       # ログインボタンコンポーネント
└── lib/
    └── supabase/
        ├── browser.ts           # ブラウザ用Supabaseクライアント
        └── server.ts            # サーバー用Supabaseクライアント
```

## 実装の詳細

### 1. ブラウザクライアント (`src/lib/supabase/browser.ts`)

クライアントサイド（React Components）で使用するSupabaseクライアントです。

```typescript
import { createBrowserClient } from "@supabase/ssr";

export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
);
```

**特徴**:
- `@supabase/ssr`の`createBrowserClient`を使用
- Cookieの自動管理
- クライアントサイドでのセッション管理

### 2. サーバークライアント (`src/lib/supabase/server.ts`)

Server Components、Server Actions、Route Handlersで使用するSupabaseクライアントです。

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Componentからの呼び出しの場合、setはエラーになるが問題ない
          }
        },
      },
    }
  );
}
```

**特徴**:
- Next.jsの`cookies()`関数を使用
- Server ComponentsとRoute Handlersの両方で使用可能
- Server Componentsではcookieの書き込みがエラーになるが、try-catchで処理

### 3. 認証コールバック (`src/app/(auth)/auth/callback/route.ts`)

OAuth認証後のコールバック処理を行うRoute Handlerです。

```typescript
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(...);

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, origin)
      );
    }

    return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(
    new URL("/auth/error?message=No code provided", origin)
  );
}
```

**フロー**:
1. URLパラメータから認証コード(`code`)を取得
2. `exchangeCodeForSession()`でコードをセッションに交換
3. Cookieにセッション情報を保存（自動）
4. 成功時は指定されたページ（`next`パラメータ）にリダイレクト
5. 失敗時はエラーページにリダイレクト

**パラメータ**:
- `code`: Supabaseから返される認証コード（必須）
- `next`: 認証後のリダイレクト先（デフォルト: `/`）

### 4. ログイン処理 (`src/features/auth/AuthButton.tsx`)

Google OAuthでのログインを行うボタンコンポーネントです。

```typescript
const handleLogin = async () => {
  const { data, error } = await supabaseBrowser.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${location.origin}/auth/callback`,
    },
  });
};
```

**フロー**:
1. `signInWithOAuth()`でGoogle認証画面にリダイレクト
2. ユーザーがGoogleで認証
3. `/auth/callback?code=xxx`にリダイレクト
4. コールバックハンドラーがセッションを確立

## セキュリティ

### Cookieのセキュリティ設定

Supabase `@supabase/ssr`は自動的に以下のセキュアな設定を適用します:

- `httpOnly: true` - JavaScriptからのアクセスを防ぎXSS攻撃を軽減
- `secure: true` - 本番環境ではHTTPSのみで送信
- `sameSite: 'lax'` - CSRF攻撃を緩和
- `path: '/'` - サイト全体でCookieを利用可能
- `maxAge: 604800` - 7日間の有効期限

### 推奨事項

1. **HTTPSの使用**: 本番環境では必ずHTTPSを使用してください
2. **環境変数の管理**: `.env.local`に機密情報を保存し、GitHubにコミットしないでください
3. **ミドルウェアの追加**: セッションの自動リフレッシュのためにミドルウェアを追加することを推奨します

## 使用方法

### Server Componentでユーザー情報を取得

```typescript
import { supabaseServer } from "@/lib/supabase/server";

export default async function MyPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <div>こんにちは、{user.email}さん</div>;
}
```

### Client Componentでログイン

```typescript
"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginButton() {
  const handleLogin = async () => {
    await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return <button onClick={handleLogin}>ログイン</button>;
}
```

### リダイレクト先を指定してログイン

```typescript
await supabaseBrowser.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${location.origin}/auth/callback?next=/dashboard`,
  },
});
```

## 環境変数

以下の環境変数を`.env.local`に設定してください:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

## 今後の改善

以下の機能を追加することを推奨します:

1. **ミドルウェアの追加**: セッションの自動リフレッシュ
2. **ログアウト機能**: Server Actionを使用したログアウト
3. **ユーティリティ関数**: `getCurrentUser()`、`requireAuth()`など
4. **型安全性の向上**: Supabase Database型の定義
5. **エラーハンドリング**: より詳細なエラーメッセージとUI

## 参考資料

- [Supabase Auth公式ドキュメント](https://supabase.com/docs/guides/auth)
- [Supabase SSR公式ドキュメント](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js App Router認証](https://nextjs.org/docs/app/building-your-application/authentication)
