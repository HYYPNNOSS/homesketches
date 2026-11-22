import { NextRequest } from "next/server";
import { getProfile, handle, readJson, readName, requireUserId, updateName } from "../../../../lib/auth-server";

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  return handle(async () => getProfile(await requireUserId(req)));
}

export function PATCH(req: NextRequest) {
  return handle(async () => {
    const id = await requireUserId(req);
    const body = await readJson(req);
    return updateName(id, readName(body.name));
  });
}
