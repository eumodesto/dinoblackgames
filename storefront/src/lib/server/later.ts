import "server-only";
import { after } from "next/server";

/**
 * Roda uma tarefa depois de responder ao cliente. Em funções serverless, uma promessa solta pode ser cortada
 * quando a resposta sai; `after` mantém a função viva até terminar. Fora de uma requisição, roda direto.
 */
export function later(task: () => Promise<unknown>) {
  const run = () => task().catch((e) => console.error("[later]", e instanceof Error ? e.message : e));
  try {
    after(run);
  } catch {
    void run();
  }
}
