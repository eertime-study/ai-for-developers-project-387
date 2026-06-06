import { useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useEventType, useCreateBooking, useOwner } from '@/api/queries'
import { formatDateTime, formatRange, formatDate } from '@/lib/time'

const formSchema = z.object({
  guestName: z.string().min(1, 'Укажите имя'),
  guestEmail: z.email('Введите корректный email'),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export default function BookingFormPage() {
  const { eventTypeId } = useParams()
  const [params] = useSearchParams()
  const slotStart = params.get('slot') ?? ''
  const navigate = useNavigate()

  const ownerQ = useOwner()
  const eventTypeQ = useEventType(eventTypeId)
  const createBooking = useCreateBooking({
    onSuccess: (data) => {
      navigate('/bookings/success', { state: data })
    },
  })

  const timeZone = ownerQ.data?.timeZone ?? 'UTC'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })

  useEffect(() => {
    if (createBooking.error) {
      const failure = createBooking.error
      if (failure.code === 'INVALID_GUEST_EMAIL') {
        setError('guestEmail', { message: failure.message })
      } else if (failure.code === 'VALIDATION_ERROR' && failure.field) {
        const field = failure.field as keyof FormValues
        setError(field, { message: failure.message })
      }
    }
  }, [createBooking.error, setError])

  const onSubmit = (values: FormValues) => {
    if (!eventTypeId || !slotStart) return
    createBooking.mutate({
      eventTypeId,
      startTime: slotStart,
      guestName: values.guestName,
      guestEmail: values.guestEmail,
      notes: values.notes,
    })
  }

  const isConflict = createBooking.error?.code === 'SLOT_ALREADY_BOOKED'

  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <Link
          to={`/event-types/${eventTypeId}`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к выбору слота
        </Link>

        {eventTypeQ.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        ) : eventTypeQ.data ? (
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">
              {eventTypeQ.data.title}
            </h1>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{eventTypeQ.data.durationInMinutes} мин</span>
            </div>
            {slotStart ? (
              <div className="text-sm text-muted-foreground">
                {formatDate(slotStart, timeZone)} ·{' '}
                {formatRange(
                  slotStart,
                  new Date(
                    new Date(slotStart).getTime() +
                      eventTypeQ.data.durationInMinutes * 60_000,
                  ).toISOString(),
                  timeZone,
                )}
              </div>
            ) : null}
            <div className="text-xs text-muted-foreground">
              Часовой пояс: {timeZone}
            </div>
          </div>
        ) : null}

        {!slotStart ? (
          <Alert variant="destructive">
            <AlertTitle>Слот не выбран</AlertTitle>
            <AlertDescription>
              <Link to={`/event-types/${eventTypeId}`} className="underline">
                Выберите слот из сетки
              </Link>
            </AlertDescription>
          </Alert>
        ) : null}

        {isConflict ? (
          <Alert variant="destructive">
            <AlertTitle>Этот слот уже заняли</AlertTitle>
            <AlertDescription>
              Пожалуйста, выберите другое время.{' '}
              <Link
                to={`/event-types/${eventTypeId}`}
                className="underline underline-offset-2"
              >
                Выбрать другой слот
              </Link>
            </AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <h2 className="text-sm font-medium text-foreground">Ваши данные</h2>

          <div className="space-y-1.5">
            <Label htmlFor="guestName">
              Имя <span className="text-destructive">*</span>
            </Label>
            <Input
              id="guestName"
              autoComplete="name"
              aria-invalid={!!errors.guestName}
              aria-describedby={errors.guestName ? 'guestName-error' : undefined}
              {...register('guestName')}
            />
            {errors.guestName ? (
              <p id="guestName-error" className="text-xs text-destructive">
                {errors.guestName.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guestEmail">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="guestEmail"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.guestEmail}
              aria-describedby={errors.guestEmail ? 'guestEmail-error' : undefined}
              {...register('guestEmail')}
            />
            {errors.guestEmail ? (
              <p id="guestEmail-error" className="text-xs text-destructive">
                {errors.guestEmail.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Примечание</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!slotStart || isSubmitting || createBooking.isPending}
          >
            {createBooking.isPending ? 'Бронируем…' : 'Забронировать'}
          </Button>

          {slotStart ? (
            <p className="text-center text-xs text-muted-foreground">
              Выбранное время: {formatDateTime(slotStart, timeZone)}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}
