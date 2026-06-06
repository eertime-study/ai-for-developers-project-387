import { buildApp } from './app.js'
import { fixedClock, systemClock, type Clock } from './clock.js'

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'

const clock: Clock = process.env.FIXED_CLOCK_ISO
  ? fixedClock(process.env.FIXED_CLOCK_ISO)
  : systemClock

function parseList(value: string | undefined): string[] | undefined {
  if (!value) return undefined
  const items = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return items.length > 0 ? items : undefined
}

const app = await buildApp({
  logger: true,
  clock,
  corsOrigins: parseList(process.env.CORS_ORIGINS),
  apiPrefix: process.env.API_PREFIX || undefined,
  staticDir: process.env.STATIC_DIR || undefined,
  openapiSpecPath: process.env.OPENAPI_SPEC_PATH || undefined,
})

try {
  await app.listen({ port: PORT, host: HOST })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
