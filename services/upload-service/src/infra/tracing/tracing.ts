import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { hostname } from 'node:os'

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_COLLECTOR_URL || 'http://tempo:4318/v1/traces',
})

const resource = resourceFromAttributes({
  'service.name': 'upload-service',
  'service.namespace': 'backend',
  'service.version': '1.0.0',
  'service.instance.id': process.pid.toString(),
  'host.name': hostname(),
})

const ignorePaths = ['/health', '/metrics']

const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) => {
          return ignorePaths.some((path) => (req.url || '').startsWith(path))
        },
      },
    }),
  ],
})

sdk.start()

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((err) => console.error('Error terminating tracing', err))
})
