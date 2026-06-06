import { Link, Navigate, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useOwner } from '@/api/queries'
import { formatDate, formatRange } from '@/lib/time'
import type { components } from '@/api/schema'

type Confirmation = components['schemas']['GuestBookingConfirmation']

export default function BookingSuccessPage() {
  const location = useLocation()
  const ownerQ = useOwner()
  const data = location.state as Confirmation | null

  if (!data) {
    return <Navigate to="/" replace />
  }

  const timeZone = ownerQ.data?.timeZone ?? 'UTC'

  return (
    <Card>
      <CardContent className="space-y-6 p-6 text-center sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-7 w-7" strokeWidth={3} />
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Встреча забронирована!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Мы получили ваши данные и добавили встречу в расписание.
          </p>
        </div>

        <div className="space-y-1 text-sm">
          <div className="font-medium text-foreground">{data.eventTypeTitle}</div>
          <div className="text-muted-foreground">
            {formatDate(data.startTime, timeZone)} ·{' '}
            {formatRange(data.startTime, data.endTime, timeZone)}
          </div>
          <div className="text-xs text-muted-foreground">
            {data.durationInMinutes} мин · {timeZone}
          </div>
        </div>

        <Separator />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-left text-sm">
          <dt className="text-muted-foreground">Имя</dt>
          <dd className="text-foreground">{data.guestName}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="text-foreground">{data.guestEmail}</dd>
          {data.notes ? (
            <>
              <dt className="text-muted-foreground">Примечание</dt>
              <dd className="text-foreground">{data.notes}</dd>
            </>
          ) : null}
        </dl>

        <Button asChild variant="outline" className="w-full">
          <Link to="/">Вернуться к типам встреч</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
