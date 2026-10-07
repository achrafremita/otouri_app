import Link from "next/link"
import { Sparkles, ShieldCheck, UserCheck } from "lucide-react"

export function SiteHeader() {
  return (
    <header dir="rtl" className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-90 transition-opacity">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-emerald-400 text-primary-foreground shadow-md shadow-primary/20">
            <Sparkles className="size-5" />
          </span>
          <div className="flex flex-col">
            <span className="leading-tight text-foreground">تطبيق عطوري</span>
            <span className="text-[10px] font-normal text-muted-foreground">بوابة التفعيل الرسمية</span>
          </div>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            التفعيل
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-3 py-1.5 rounded-lg border border-border/60 transition-colors"
          >
            <ShieldCheck className="size-3.5 text-primary" />
            لوحة الإدارة
          </Link>
        </nav>
      </div>
    </header>
  )
}
