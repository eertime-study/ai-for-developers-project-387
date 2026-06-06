import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { OwnerHeader } from '@/components/OwnerHeader'
import { EventTypeCard } from '@/components/EventTypeCard'
import { useEventTypes, useOwner } from '@/api/queries'

export default function EventTypesListPage() {
  const ownerQ = useOwner()
  const typesQ = useEventTypes()

  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        {ownerQ.isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ) : ownerQ.data ? (
          <OwnerHeader owner={ownerQ.data} subtitle="Консультации и созвоны" />
        ) : null}

        <div>
          <h2 className="mb-3 text-sm font-medium text-foreground">Выберите тип встречи</h2>

          {typesQ.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : typesQ.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Не удалось загрузить типы встреч</AlertTitle>
              <AlertDescription>
                {typesQ.error instanceof Error ? typesQ.error.message : 'Попробуйте обновить страницу.'}
              </AlertDescription>
            </Alert>
          ) : typesQ.data && typesQ.data.length > 0 ? (
            <div className="space-y-2">
              {typesQ.data.map((et) => (
                <EventTypeCard key={et.id} eventType={et} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Владелец ещё не создал ни одного типа встречи.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
