export type PlanType = "first" | "monthly" | "yearly"
export type PlanKey = "FULL" | "MONTHLY" | "YEARLY"

export interface PlanDetails {
  id: PlanType
  key: PlanKey
  nameAr: string
  label: string
  sublabel: string
  description: string
  amount: number // in DZD
  days: number
  periodAr: string
  badge?: string
}

export const PLANS: Record<PlanType, PlanDetails> = {
  first: {
    id: "first",
    key: "FULL",
    nameAr: "شراء تطبيق عطوري",
    label: "شراء تطبيق عطوري - 9900 دج = امتلاك دائم + 30 يوم مجاني",
    sublabel: "امتلاك دائم + 30 يوم مجاني",
    description: "شراء النسخة الكاملة لامتلاك البرنامج مدى الحياة مع تفعيل مجاني لمدة شهر كامل",
    amount: 9900,
    days: 30,
    periodAr: "دفعة واحدة",
    badge: "الشراء الأول",
  },
  monthly: {
    id: "monthly",
    key: "MONTHLY",
    nameAr: "تجديد شهري",
    label: "شهري 950 دج (30 يوم)",
    sublabel: "تجديد لمدة شهر (30 يوم)",
    description: "تجديد الاشتراك لمدة شهر كامل لجميع خدمات وتحديثات عطوري",
    amount: 950,
    days: 30,
    periodAr: "شهرياً",
    badge: "اشتراك شهري",
  },
  yearly: {
    id: "yearly",
    key: "YEARLY",
    nameAr: "تجديد سنوي",
    label: "سنوي 9500 دج (365 يوم - خصم 17%)",
    sublabel: "تجديد لمدة سنة (365 يوم)",
    description: "تجديد سنوي شامل مع تخفيض استثنائي بنسبة 17% (ما يعادل شهرين مجاناً)",
    amount: 9500,
    days: 365,
    periodAr: "سنوياً",
    badge: "وفر 17%",
  },
}

export const PLAN_KEY_TO_TYPE: Record<string, PlanType> = {
  FULL: "first",
  first: "first",
  FIRST: "first",
  MONTHLY: "monthly",
  monthly: "monthly",
  YEARLY: "yearly",
  yearly: "yearly",
}

export function normalizePlanType(plan: unknown): PlanType {
  const str = String(plan || "").trim().toLowerCase()
  if (str === "full" || str === "first" || str === "f") return "first"
  if (str === "monthly" || str === "month" || str === "m") return "monthly"
  if (str === "yearly" || str === "year" || str === "y") return "yearly"
  return "first"
}

export function formatDzd(amount: number) {
  return `${new Intl.NumberFormat("ar-DZ").format(amount)} دج`
}

export function formatDzdFr(amount: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(amount)} DZD`
}
