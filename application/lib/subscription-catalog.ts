import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

export type BillingCycle = "weekly" | "monthly" | "3-monthly" | "6-monthly" | "annual";
export type SubscriptionPlan = { id: string; label: string; amount: number; cycle: BillingCycle };

export const BILLING_CYCLES: readonly BillingCycle[] = ["weekly", "monthly", "3-monthly", "6-monthly", "annual"];
export const DEFAULT_SUBSCRIPTION_PLANS: readonly SubscriptionPlan[] = [
  { id: "basic", label: "Basic", amount: 5, cycle: "annual" },
  { id: "pro", label: "Pro", amount: 10, cycle: "annual" },
  { id: "elite", label: "Elite", amount: 20, cycle: "annual" },
  { id: "sovereign", label: "Sovereign", amount: 30, cycle: "annual" },
  { id: "multiverse", label: "Multiverse", amount: 50, cycle: "annual" },
];

export function formatPlanAmount(plan: SubscriptionPlan): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: Number.isInteger(plan.amount) ? 0 : 2 }).format(plan.amount);
}

export function formatPlanCycle(cycle: BillingCycle): string {
  return cycle === "3-monthly" ? "every 3 months" : cycle === "6-monthly" ? "every 6 months" : `per ${cycle.replace("-", " ")}`;
}

export function subscriptionEndpoint(): string {
  return Platform.OS === "web" ? "/app/plan-catalog.php" : "https://performai.co.uk/app/plan-catalog.php";
}

function validPlans(value: unknown): value is SubscriptionPlan[] {
  return Array.isArray(value) && value.length === 5 && value.every((plan) => {
    const candidate = plan as Partial<SubscriptionPlan>;
    return typeof candidate.id === "string" && typeof candidate.label === "string" && typeof candidate.amount === "number" && BILLING_CYCLES.includes(candidate.cycle as BillingCycle);
  });
}

async function parse(response: Response): Promise<{ ok: boolean; plans?: SubscriptionPlan[]; error?: string }> {
  try {
    return await response.json() as { ok: boolean; plans?: SubscriptionPlan[]; error?: string };
  } catch {
    return { ok: false, error: "Subscription service returned an unexpected response." };
  }
}

export function useSubscriptionCatalog() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([...DEFAULT_SUBSCRIPTION_PLANS]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${subscriptionEndpoint()}?action=list`, { credentials: "include", headers: { Accept: "application/json" } });
      const payload = await parse(response);
      if (response.ok && payload.ok && validPlans(payload.plans)) setPlans(payload.plans);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = useCallback(async (nextPlans: SubscriptionPlan[], csrfToken: string | null): Promise<{ ok: boolean; error?: string }> => {
    const response = await fetch(`${subscriptionEndpoint()}?action=update`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Perform-AI-CSRF": csrfToken ?? "" },
      body: JSON.stringify({ plans: nextPlans }),
    });
    const payload = await parse(response);
    if (!response.ok || !payload.ok || !validPlans(payload.plans)) return { ok: false, error: payload.error ?? "Subscription settings could not be saved." };
    setPlans(payload.plans);
    return { ok: true };
  }, []);

  return { plans, loading, refresh, save };
}
