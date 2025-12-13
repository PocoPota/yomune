import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // layoutでは基本書き込み不要
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return <>{children}</>;
}
