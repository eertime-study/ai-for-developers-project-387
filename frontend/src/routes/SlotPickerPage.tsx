import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SlotGrid } from '@/components/SlotGrid'
import { SlotLegend } from '@/components/SlotLegend'
import { useEventType, useSlots } from '@/api/queries'
import { formatDate } from '@/lib/time'

export default function SlotPickerPage() {
  const { eventTypeId } = useParams()
  const eventTypeQ = useEventType(eventTypeId)
  const slotsQ = useSlots(eventTypeId)

  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к типам встреч
        </Link>

        {eventTypeQ.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : eventTypeQ.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Тип встречи не найден</AlertTitle>
            <AlertDescription>
              <Link to="/" className="underline">Вернуться к списку</Link>
            </AlertDescription>
          </Alert>
        ) : eventTypeQ.data ? (
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {eventTypeQ.data.title}
            </h1>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{eventTypeQ.data.durationInMinutes} мин</span>
            </div>
            {eventTypeQ.data.description ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {eventTypeQ.data.description}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">Выберите дату и время</h2>
            {slotsQ.data ? (
              <div className="text-xs text-muted-foreground">
                {formatDate(slotsQ.data.windowStart, slotsQ.data.timeZone)}
                {' — '}
                {formatDate(slotsQ.data.windowEnd, slotsQ.data.timeZone)}
              </div>
            ) : null}
          </div>

          <SlotLegend />

          {slotsQ.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : slotsQ.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Не удалось загрузить слоты</AlertTitle>
              <AlertDescription>
                Попробуйте обновить страницу.
              </AlertDescription>
            </Alert>
          ) : slotsQ.data ? (
            <SlotGrid slots={slotsQ.data.slots} timeZone={slotsQ.data.timeZone} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
