import { handle, json, readJson } from "@/lib/server/api";
import { createOrder } from "@/lib/server/checkout";
import type { OrderRequest } from "@/lib/checkout-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handle(async () => {
    const body = (await readJson(req)) as unknown as OrderRequest;
    return json(await createOrder(body), 201);
  });
}
