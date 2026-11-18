import { handle, json } from "@/lib/server/api";
import { currentUser } from "@/lib/server/supabase-auth";

export async function GET() {
  return handle(async () => {
    const user = await currentUser();
    return json({ user: user ? { id: user.id, email: user.email, name: user.user_metadata?.full_name ?? "" } : null });
  });
}
