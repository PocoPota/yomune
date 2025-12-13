import AuthButton from "@/features/auth/AuthButton";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Home() {
	const supabase = await supabaseServer();
	const {data: {user}} = await supabase.auth.getUser();

	return (
		<>
			<p>{user ? `Hello, ${user.email ?? "Logged-in User"}!` : "Please Login!"}</p>
			<h1>Welcome to Yomune!</h1>
			<AuthButton />
		</>
	);
}
