import { redirect } from "next/navigation";

export default function LegacySpendBudgetRedirectPage() {
  redirect("/spend-bucket");
}
