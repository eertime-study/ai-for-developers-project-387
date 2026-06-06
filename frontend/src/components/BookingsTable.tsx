import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime, formatTime } from '@/lib/time'
import type { components } from '@/api/schema'

type AdminBooking = components['schemas']['AdminBooking']

export function BookingsTable({
  bookings,
  timeZone,
}: {
  bookings: AdminBooking[]
  timeZone: string
}) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Пока нет ни одного бронирования.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Дата и время</TableHead>
          <TableHead>Тип встречи</TableHead>
          <TableHead>Длительность</TableHead>
          <TableHead>Гость</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Создано</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((b) => (
          <TableRow key={b.id}>
            <TableCell className="whitespace-nowrap">
              <div>{formatDateTime(b.startTime, timeZone)}</div>
              <div className="text-xs text-muted-foreground">
                до {formatTime(b.endTime, timeZone)}
              </div>
            </TableCell>
            <TableCell>{b.eventTypeTitle}</TableCell>
            <TableCell className="whitespace-nowrap">{b.durationInMinutes} мин</TableCell>
            <TableCell>{b.guestName}</TableCell>
            <TableCell className="text-muted-foreground">{b.guestEmail}</TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
              {formatDateTime(b.createdAt, timeZone)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
