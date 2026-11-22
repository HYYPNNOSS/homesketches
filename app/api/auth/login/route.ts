import { NextRequest } from "next/server";
import { handle, limitAttempts, login, readEmail, readJson, readPassword } from "../../../../lib/auth-server";

export const runtime = "nodejs";

export function POST(req: NextRequest) {
  return handle(async () => {
    limitAttempts(req);
    const body = await readJson(req);
    return login(readEmail(body.email), readPassword(body.password, false));
  });
}
