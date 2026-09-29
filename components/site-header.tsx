import Link from "next/link"
import { KeyRound } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <KeyRound className="size-4" aria-hidden="true" />
          </span>
          License Store
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/success" className="hover:text-foreground">
            Retrieve license
          </Link>
          <Link href="/admin" className="hover:text-foreground">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  )
}
