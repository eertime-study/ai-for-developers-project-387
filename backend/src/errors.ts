import type { FastifyError, FastifyInstance } from 'fastify'
import type { ErrorCode } from './api/types.js'

type Kind = 'bad_request' | 'not_found' | 'conflict'

const STATUS: Record<Kind, number> = {
  bad_request: 400,
  not_found: 404,
  conflict: 409,
}

/** Доменная ошибка, отображаемая на тело ошибки контракта `{code, message, field?}`. */
export class DomainError extends Error {
  readonly kind: Kind
  readonly code: ErrorCode
  readonly field?: string

  constructor(kind: Kind, code: ErrorCode, message: string, field?: string) {
    super(message)
    this.name = 'DomainError'
    this.kind = kind
    this.code = code
    this.field = field
  }
}

export const badRequest = (code: ErrorCode, message: string, field?: string) =>
  new DomainError('bad_request', code, message, field)

export const notFound = (code: ErrorCode, message: string) =>
  new DomainError('not_found', code, message)

export const conflict = (code: ErrorCode, message: string) =>
  new DomainError('conflict', code, message)

interface ErrorBody {
  code: ErrorCode
  message: string
  field?: string
}

/** Best-effort извлечение пути поля из ошибки AJV-валидации Fastify. */
function fieldFromValidation(error: FastifyError): string | undefined {
  const first = error.validation?.[0]
  if (!first) return undefined
  if (first.instancePath) {
    const path = first.instancePath.replace(/^\//, '').replace(/\//g, '.')
    if (path) return path
  }
  const missing = (first.params as { missingProperty?: unknown } | undefined)?.missingProperty
  if (typeof missing === 'string') return missing
  return undefined
}

/**
 * Единый обработчик ошибок: любые ошибки приводятся к контрактному телу
 * `{code, message, field?}`, а не к дефолтному формату Fastify `{statusCode, error, message}`.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof DomainError) {
      const body: ErrorBody = { code: error.code, message: error.message }
      if (error.kind === 'bad_request' && error.field) body.field = error.field
      return reply.status(STATUS[error.kind]).send(body)
    }

    if (error.validation) {
      const body: ErrorBody = { code: 'VALIDATION_ERROR', message: error.message }
      const field = fieldFromValidation(error)
      if (field) body.field = field
      return reply.status(400).send(body)
    }

    // Непредвиденная ошибка — логируем и отдаём 500 (в контракте схемы для 500 нет).
    app.log.error(error)
    return reply.status(500).send({ message: 'Internal Server Error' })
  })
}
