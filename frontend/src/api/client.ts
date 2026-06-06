import createClient from 'openapi-fetch'
import type { paths, components } from './schema'

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4010'

export const api = createClient<paths>({ baseUrl })

export type ApiError =
  | components['schemas']['BadRequestError']
  | components['schemas']['NotFoundError']
  | components['schemas']['ConflictError']

export type ApiErrorCode = components['schemas']['ErrorCode']

export class ApiFailure extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly field?: string
  readonly raw: ApiError

  constructor(status: number, body: ApiError) {
    super(body.message)
    this.name = 'ApiFailure'
    this.status = status
    this.code = body.code
    this.field = (body as { field?: string }).field
    this.raw = body
  }
}

export function isApiFailure(err: unknown): err is ApiFailure {
  return err instanceof ApiFailure
}
