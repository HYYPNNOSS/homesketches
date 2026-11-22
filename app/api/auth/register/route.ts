import { NextRequest } from "next/server";
import { handle, limitAttempts, readEmail, readJson, readName, readPassword, register } from "../../../../lib/auth-server";

export const runtime = "nodejs";

export function POST(req: NextRequest) {
  return handle(async () => {
    limitAttempts(req);
    const body = await readJson(req);
    return register(readName(body.name), readEmail(body.email), readPassword(body.password));
  });
}
