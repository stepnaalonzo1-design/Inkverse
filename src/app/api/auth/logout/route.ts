import { endCurrentSession } from "@/lib/auth";
import { fail, isSameOrigin, success } from "@/lib/http";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-site request blocked.", 403);
  await endCurrentSession(request);
  return success({ message: "You have been signed out." });
}
