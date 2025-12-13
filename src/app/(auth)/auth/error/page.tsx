"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function AuthErrorPage() {
	const searchParams = useSearchParams();
	const message = searchParams.get("message") || "認証エラーが発生しました";

	return (
		<div>
			<h1>認証エラー</h1>
			<p>{message}</p>
			<Link href="/">ホームに戻る</Link>
		</div>
	);
}
