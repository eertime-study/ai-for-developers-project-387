const items: Array<{ label: string; color: string }> = [
  { label: 'Доступно', color: 'bg-emerald-500' },
  { label: 'Занято', color: 'bg-blue-500' },
  { label: 'Прошедшее', color: 'bg-muted' },
  { label: 'Вне окна', color: 'bg-transparent border border-dashed border-border' },
]

export function SlotLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${it.color}`} />
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  )
}
