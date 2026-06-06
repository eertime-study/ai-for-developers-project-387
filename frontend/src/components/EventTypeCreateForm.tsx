import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useCreateEventType } from '@/api/queries'

const formSchema = z.object({
  id: z.string().min(1, 'Укажите идентификатор'),
  title: z.string().min(1, 'Укажите название'),
  description: z.string().min(1, 'Добавьте описание'),
  durationInMinutes: z
    .number({ error: 'Введите длительность' })
    .int('Длительность должна быть целым числом')
    .positive('Длительность должна быть положительным числом'),
})

type FormValues = z.infer<typeof formSchema>

export function EventTypeCreateForm() {
  const create = useCreateEventType()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitSuccessful, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '',
      title: '',
      description: '',
      durationInMinutes: 30,
    },
  })

  useEffect(() => {
    if (create.error) {
      const failure = create.error
      if (failure.code === 'EVENT_TYPE_ALREADY_EXISTS') {
        setError('id', { message: 'Такой идентификатор уже занят' })
      } else if (failure.code === 'VALIDATION_ERROR' && failure.field) {
        const field = failure.field as keyof FormValues
        setError(field, { message: failure.message })
      }
    }
  }, [create.error, setError])

  useEffect(() => {
    if (isSubmitSuccessful && create.isSuccess) {
      reset()
    }
  }, [isSubmitSuccessful, create.isSuccess, reset])

  const onSubmit = (values: FormValues) => {
    create.mutate(values)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h2 className="text-sm font-medium text-foreground">Создать тип встречи</h2>

      {create.isSuccess && !isDirty ? (
        <Alert>
          <AlertTitle>Тип встречи создан</AlertTitle>
          <AlertDescription>
            Гости теперь могут забронировать встречу этого типа.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="id">
          ID <span className="text-destructive">*</span>
        </Label>
        <Input
          id="id"
          placeholder="consultation-30"
          aria-invalid={!!errors.id}
          aria-describedby={errors.id ? 'id-error' : undefined}
          {...register('id')}
        />
        {errors.id ? (
          <p id="id-error" className="text-xs text-destructive">{errors.id.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">
          Название <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Консультация"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
          {...register('title')}
        />
        {errors.title ? (
          <p id="title-error" className="text-xs text-destructive">{errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">
          Описание <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="30-минутная консультация по вашему запросу."
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
          {...register('description')}
        />
        {errors.description ? (
          <p id="description-error" className="text-xs text-destructive">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="durationInMinutes">
          Длительность (минуты) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="durationInMinutes"
          type="number"
          min={1}
          aria-invalid={!!errors.durationInMinutes}
          aria-describedby={errors.durationInMinutes ? 'durationInMinutes-error' : undefined}
          {...register('durationInMinutes', { valueAsNumber: true })}
        />
        {errors.durationInMinutes ? (
          <p id="durationInMinutes-error" className="text-xs text-destructive">
            {errors.durationInMinutes.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={create.isPending}>
        {create.isPending ? 'Создаём…' : 'Создать тип встречи'}
      </Button>
    </form>
  )
}
