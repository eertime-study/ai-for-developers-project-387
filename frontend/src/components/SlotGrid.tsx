import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { dayKey, formatDayMonth, formatWeekday, timeKey } from '@/lib/time'
import type { components } from '@/api/schema'

type Slot = components['schemas']['Slot']
type SlotStatus = components['schemas']['SlotStatus']

type Cell = { slot: Slot } | null

function buildMatrix(slots: Slot[], timeZone: string) {
  const dayMap = new Map<string, { iso: string }>()
  const timeMap = new Map<string, { iso: string }>()
  const cells = new Map<string, Slot>()

  for (const s of slots) {
    const d = dayKey(s.startTime, timeZone)
    const t = timeKey(s.startTime, timeZone)
    if (!dayMap.has(d)) dayMap.set(d, { iso: s.startTime })
    if (!timeMap.has(t)) timeMap.set(t, { iso: s.startTime })
    cells.set(`${d}|${t}`, s)
  }

  const days = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b))
  const times = [...timeMap.entries()].sort(([a], [b]) => a.localeCompare(b))

  const matrix: Cell[][] = times.map(([t]) =>
    days.map(([d]) => {
      const s = cells.get(`${d}|${t}`)
      return s ? { slot: s } : null
    }),
  )

  return { days, times, matrix }
}

const cellStyles: Record<SlotStatus, string> = {
  available:
    'cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-100',
  booked:
    'cursor-not-allowed border-blue-300 bg-blue-50 bg-[repeating-linear-gradient(45deg,_transparent_0_4px,_rgba(59,130,246,0.15)_4px_8px)] text-blue-600',
  past: 'cursor-not-allowed border-muted bg-muted text-muted-foreground',
  outside_window: 'cursor-not-allowed border-dashed border-border bg-transparent text-muted-foreground/40',
}

export function SlotGrid({
  slots,
  timeZone,
}: {
  slots: Slot[]
  timeZone: string
}) {
  const navigate = useNavigate()
  const { eventTypeId } = useParams()
  const { days, times, matrix } = useMemo(
    () => buildMatrix(slots, timeZone),
    [slots, timeZone],
  )

  if (days.length === 0 || times.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        В ближайшие 14 дней доступных слотов нет.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-12" />
            {days.map(([d, info]) => (
              <th key={d} className="px-1 py-1 text-center font-normal text-muted-foreground">
                <div className="capitalize">{formatWeekday(info.iso, timeZone)}</div>
                <div className="text-foreground">{formatDayMonth(info.iso, timeZone)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map(([t], rowIdx) => (
            <tr key={t}>
              <td className="pr-1 text-right text-muted-foreground">{t}</td>
              {matrix[rowIdx]!.map((cell, colIdx) => {
                if (!cell) {
                  return (
                    <td key={colIdx}>
                      <div className="h-7 rounded border border-dashed border-border/50" />
                    </td>
                  )
                }
                const { slot } = cell
                const isClickable = slot.status === 'available'
                return (
                  <td key={colIdx}>
                    <button
                      type="button"
                      disabled={!isClickable}
                      onClick={() =>
                        navigate(
                          `/event-types/${encodeURIComponent(eventTypeId!)}/book?slot=${encodeURIComponent(slot.startTime)}`,
                        )
                      }
                      aria-label={`${formatDayMonth(slot.startTime, timeZone)} ${timeKey(slot.startTime, timeZone)} (${slot.status})`}
                      className={`h-7 w-full rounded-md border text-[10px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${cellStyles[slot.status]}`}
                    >
                      <span className="sr-only">{slot.status}</span>
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
