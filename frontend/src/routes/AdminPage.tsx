import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { BookingsTable } from '@/components/BookingsTable'
import { EventTypeCreateForm } from '@/components/EventTypeCreateForm'
import { useAdminBookings, useOwner } from '@/api/queries'

export default function AdminPage() {
  const ownerQ = useOwner()
  const bookingsQ = useAdminBookings()
  const timeZone = ownerQ.data?.timeZone ?? 'UTC'

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardContent className="space-y-4 p-6 sm:p-8">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Предстоящие бронирования
            </h1>
            <p className="text-sm text-muted-foreground">
              Все предстоящие встречи в вашем часовом поясе.
            </p>
          </div>

          {bookingsQ.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : bookingsQ.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Не удалось загрузить бронирования</AlertTitle>
              <AlertDescription>Попробуйте обновить страницу.</AlertDescription>
            </Alert>
          ) : bookingsQ.data ? (
            <BookingsTable bookings={bookingsQ.data} timeZone={timeZone} />
          ) : null}

          {bookingsQ.data ? (
            <div className="text-xs text-muted-foreground">
              Показано {bookingsQ.data.length} бронирований
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <EventTypeCreateForm />
        </CardContent>
      </Card>
    </div>
  )
}
