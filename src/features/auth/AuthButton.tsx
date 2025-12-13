"use client";

import Button from "@/components/ui/Button/button";
import { supabaseBrowser } from "@/lib/supabase/browser";

const AuthButton = () => {
	const handleLogin = async () => {
		const { data, error } = await supabaseBrowser.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${location.origin}/auth/callback`,
			},
		});
		if (error) {
			console.error("Error logging in:", error);
		} else {
			console.log("User logged in:", data);
		}
	};

	return <Button onClick={handleLogin}>Google でログイン</Button>;
};

export default AuthButton;
