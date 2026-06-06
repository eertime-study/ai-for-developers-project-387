import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import addFormats from 'ajv-formats'
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import openapiGlue from 'fastify-openapi-glue'
import { systemClock, type Clock } from './clock.js'
import { registerErrorHandler } from './errors.js'
import { createService } from './service.js'
import { createStore } from './store.js'

const here = dirname(fileURLToPath(import.meta.url))

/** Тот же артефакт, что кормит фронт. Требует предварительного `spec compile`. */
const DEFAULT_SPEC_PATH = resolve(here, '../../spec/tsp-output/@typespec/openapi3/openapi.yaml')

const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:4173']

// ajv-formats и Fastify тянут собственные (несовпадающие по версии) типы Ajv,
// поэтому плагин кастуем к ожидаемому Fastify типу элемента plugins.
type AjvPlugin = NonNullable<NonNullable<FastifyServerOptions['ajv']>['plugins']>[number]

export interface BuildOptions {
  /** Источник времени; в тестах передаётся фиксированный clock. */
  clock?: Clock
  /** Уровень логирования Fastify (по умолчанию выключен — удобно для тестов). */
  logger?: boolean
  /** Перекрывает дефолтный CORS-список локалхост-портов (нужно для прод-домена). */
  corsOrigins?: string[]
  /** Если задан (например `/api`) — все API-роуты монтируются под этим префиксом. */
  apiPrefix?: string
  /** Если задан — Fastify раздаёт статику из этой директории и делает SPA-fallback. */
  staticDir?: string
  /** Перекрывает дефолтный путь до openapi.yaml (для Docker, где раскладка отличается). */
  openapiSpecPath?: string
}

function acceptsHtml(header: string | string[] | undefined): boolean {
  if (!header) return false
  const value = Array.isArray(header) ? header.join(',') : header
  return value.toLowerCase().includes('text/html')
}

export async function buildApp(options: BuildOptions = {}): Promise<FastifyInstance> {
  const clock = options.clock ?? systemClock
  const store = createStore()
  const corsOrigins = options.corsOrigins ?? DEFAULT_CORS_ORIGINS
  const specPath = options.openapiSpecPath ?? DEFAULT_SPEC_PATH
  const { apiPrefix, staticDir } = options

  const app = Fastify({
    logger: options.logger ?? false,
    // ajv-formats добавляет валидацию форматов контракта (date-time, int32, email).
    ajv: { plugins: [addFormats as unknown as AjvPlugin] },
  })

  registerErrorHandler(app)
  await app.register(cors, { origin: corsOrigins })

  const glueOpts = {
    specification: specPath,
    serviceHandlers: createService(store, clock),
  }

  if (apiPrefix) {
    await app.register(
      async (instance) => {
        await instance.register(openapiGlue, glueOpts)
      },
      { prefix: apiPrefix },
    )
  } else {
    await app.register(openapiGlue, glueOpts)
  }

  if (staticDir) {
    await app.register(fastifyStatic, { root: staticDir, prefix: '/' })

    app.setNotFoundHandler((request, reply) => {
      const isReadable = request.method === 'GET' || request.method === 'HEAD'
      const isApi = apiPrefix ? request.url.startsWith(apiPrefix) : false
      if (isReadable && !isApi && acceptsHtml(request.headers.accept)) {
        return reply.sendFile('index.html')
      }
      return reply
        .status(404)
        .send({ code: 'NOT_FOUND', message: `Route ${request.method}:${request.url} not found` })
    })
  }

  return app
}
