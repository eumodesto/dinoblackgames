import { redirect } from "next/navigation";

// O carrinho é a gaveta do header; esta rota antiga leva direto ao checkout.
export default function CartRedirect() {
  redirect("/checkout");
}
