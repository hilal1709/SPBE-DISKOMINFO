import { auth } from "@/auth";
import { actorFor, can } from "@/lib/access";

/** Same permission and fresh session check as /keamanan; no demo or caller-supplied bypass. */
export async function canReadSecurity() {
  try {
    const session = await auth();
    if (!session?.user) return false;
    const actor = await actorFor(session.user);
    return !!actor && !actor.mustChangePassword && can.viewKeamanan(actor);
  } catch { return false; }
}
