import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import type { ReactNode } from 'react'

export function AppShell({
  children,
  ownerTimeZone,
}: {
  children: ReactNode
  ownerTimeZone?: string
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/[0.04] via-background to-background">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8">
        <header className="mb-6 flex items-center gap-2.5">
          <Link to="/" className="group flex items-center gap-2.5 text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30 transition group-hover:shadow-primary/40">
              <CalendarDays className="h-5 w-5" />
            </span>
            <span className="text-xl font-semibold tracking-tight">
              Call <span className="text-primary">Calendar</span>
            </span>
          </Link>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>© Call Calendar</span>
          {ownerTimeZone ? (
            <span>Все время указано в часовом поясе владельца: {ownerTimeZone}</span>
          ) : null}
        </footer>
      </div>
    </div>
  )
}
