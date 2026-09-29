export const PLANS = {
  MONTHLY: { amount: 95000, days: 30, label: "تجديد شهري", period: "/ شهر" },
  YEARLY: { amount: 950000, days: 365, label: "تجديد سنوي", period: "/ سنة" },
  FULL: { amount: 990000, days: 30, label: "شراء تطبيق عطوري - مع شهر مجاني", period: "دفعة واحدة" },
} as const

export type PlanKey = keyof typeof PLANS

export const NEW_CUSTOMER_PLANS: PlanKey[] = ["FULL"]
export const RENEWAL_PLANS: PlanKey[] = ["MONTHLY", "YEARLY"]

export function formatDzd(cents: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(cents / 100)} DZD`
}
