import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { api, ApiFailure, type ApiError } from './client'
import type { components } from './schema'

type Owner = components['schemas']['Owner']
type EventType = components['schemas']['EventType']
type SlotListResponse = components['schemas']['SlotListResponse']
type GuestBookingConfirmation = components['schemas']['GuestBookingConfirmation']
type AdminBooking = components['schemas']['AdminBooking']
type BookingRequest = components['schemas']['BookingRequest']
type EventTypeCreateRequest = components['schemas']['EventTypeCreateRequest']

export const queryKeys = {
  owner: ['owner'] as const,
  eventTypes: ['event-types'] as const,
  eventType: (id: string) => ['event-types', id] as const,
  slots: (id: string) => ['event-types', id, 'slots'] as const,
  adminBookings: ['admin', 'bookings'] as const,
}

type FetchResult<T> = {
  data?: T
  error?: ApiError
  response: Response
}

async function unwrap<T>(p: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await p
  if (error || !response.ok || data === undefined) {
    throw new ApiFailure(response.status, error ?? ({ code: 'VALIDATION_ERROR', message: response.statusText } as ApiError))
  }
  return data
}

export function useOwner() {
  return useQuery<Owner>({
    queryKey: queryKeys.owner,
    queryFn: () => unwrap(api.GET('/owner')),
  })
}

export function useEventTypes() {
  return useQuery<EventType[]>({
    queryKey: queryKeys.eventTypes,
    queryFn: () => unwrap(api.GET('/event-types')),
  })
}

export function useEventType(id: string | undefined) {
  return useQuery<EventType>({
    queryKey: queryKeys.eventType(id ?? ''),
    enabled: !!id,
    queryFn: () =>
      unwrap(api.GET('/event-types/{id}', { params: { path: { id: id! } } })),
  })
}

export function useSlots(id: string | undefined) {
  return useQuery<SlotListResponse>({
    queryKey: queryKeys.slots(id ?? ''),
    enabled: !!id,
    queryFn: () =>
      unwrap(api.GET('/event-types/{id}/slots', { params: { path: { id: id! } } })),
  })
}

export function useCreateBooking(
  options?: Omit<
    UseMutationOptions<GuestBookingConfirmation, ApiFailure, BookingRequest>,
    'mutationFn'
  >,
) {
  const qc = useQueryClient()
  return useMutation<GuestBookingConfirmation, ApiFailure, BookingRequest>({
    ...options,
    mutationFn: (body) => unwrap(api.POST('/bookings', { body })),
    onSuccess: (...args) => {
      const [, variables] = args
      qc.invalidateQueries({ queryKey: queryKeys.slots(variables.eventTypeId) })
      qc.invalidateQueries({ queryKey: queryKeys.adminBookings })
      options?.onSuccess?.(...args)
    },
  })
}

export function useAdminBookings() {
  return useQuery<AdminBooking[]>({
    queryKey: queryKeys.adminBookings,
    queryFn: () => unwrap(api.GET('/admin/bookings')),
  })
}

export function useCreateEventType(
  options?: Omit<
    UseMutationOptions<EventType, ApiFailure, EventTypeCreateRequest>,
    'mutationFn'
  >,
) {
  const qc = useQueryClient()
  return useMutation<EventType, ApiFailure, EventTypeCreateRequest>({
    ...options,
    mutationFn: (body) => unwrap(api.POST('/admin/event-types', { body })),
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: queryKeys.eventTypes })
      options?.onSuccess?.(...args)
    },
  })
}
