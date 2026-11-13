# @bafx/logger

A TypeScript logger built on Winston. It adds trace and correlation IDs, operation names, a `security` level, and optional console, rotating file, and syslog output.

## Install

Requires Node.js 24.9 or newer.

```sh
npm install @bafx/logger
```

## Quick start

```ts
import { generateTraceId, getLogger } from '@bafx/logger';

const logger = getLogger({
  informationSystem: 'shop',
  environment: 'production',
  serviceName: 'orders-api',
  enableConsoleLog: true,
});

logger.info(generateTraceId(), 'request-123', 'Order created', 'createOrder', {
  orderId: '123',
});
```

The five arguments to a log method are `traceId`, `correlationId`, `eventName`, `operationName`, and `data`. The available methods are `debug`, `info`, `warn`, `error`, and `security`. Pass a string or an object for `data`; object values that are strings or numbers appear as `<key>:value` pairs in the log message.

Each message is a pipe-delimited line containing the timestamp, information system, environment, version, trace ID, correlation ID, service name, level, event name, operation name, and any data. Missing or empty trace and correlation IDs use `0`. Pass `undefined` in either ID position when calling a log method directly:

```ts
logger.info(undefined, undefined, 'Order created', 'createOrder', { orderId: '123' });
```

## Reuse request context

Bind IDs and an operation name once when several messages belong to the same request:

```ts
import { applyOperationName, applyTraceIdAndCorrelationId, generateTraceId, getLogger } from '@bafx/logger';

// Configure the service logger once when the application starts.
const serviceLogger = getLogger({
  informationSystem: 'shop',
  environment: 'production',
  serviceName: 'orders-api',
  enableConsoleLog: true,
});

// Bind IDs at the start of a request so its messages share the same context.
const requestLogger = applyTraceIdAndCorrelationId(generateTraceId(), 'request-123', serviceLogger);

// Bind the operation name for messages from this handler.
const orderLogger = applyOperationName('createOrder', requestLogger);

orderLogger.info('Order created', { orderId: '123' });
orderLogger.security('Order access checked', { userId: '456' });
```

You can also bind the context in separate steps, with or without a correlation ID:

```ts
import { applyCorrelationId, applyOperationName, applyTraceId } from '@bafx/logger';

const traceLogger = applyTraceId('trace-123', serviceLogger);
const operationLogger = applyOperationName('createOrder', traceLogger);
operationLogger.info('Order created');
operationLogger.info('Order created', { orderId: '123' });

const correlatedLogger = applyCorrelationId('request-123', traceLogger);
const correlatedOperationLogger = applyOperationName('createOrder', correlatedLogger);
correlatedOperationLogger.info('Order created');
```

You can bind only the operation name directly to a plain logger:

```ts
const operationOnlyLogger = applyOperationName('createOrder', serviceLogger);
operationOnlyLogger.info('Order created');
operationOnlyLogger.info('Order created', { orderId: '123' });
```

The curried form `applyOperationName('createOrder')(serviceLogger)` works too. Operation loggers accept an event name and optional data. To include a correlation ID, bind it with `applyCorrelationId` before applying the operation name, as shown above.


## Configuration

`getLogger(config)` accepts these options:

| Option                       | Description                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `informationSystem`          | Required name of the parent system.                                                                           |
| `environment`                | Required environment name, such as `production`.                                                              |
| `serviceName`                | Required name of the service producing the log.                                                               |
| `enableConsoleLog`           | Set to `true` to write to the console.                                                                        |
| `directory`                  | Enables daily rotating log files in this directory.                                                           |
| `fileName`                   | File name or pattern for rotating files; defaults to `log.%DATE%`. Used with `directory`.                     |
| `syslogServer`, `syslogPort` | Set both to enable UDP syslog output.                                                                         |
| `level`                      | Minimum log level for configured transports. Console defaults to `debug`; files and syslog default to `info`. |
| `version`                    | Build version included in each message; the output defaults to `0`.                                           |

Enable at least one destination: console, file, or syslog. Rotating files use UTC dates, are compressed after rotation, and are retained for 30 days.

## Development

Use the Node version in `.nvmrc`, then install dependencies and run the checks:

```sh
nvm use
npm ci
npm run build
npm test
npm run lint
```

`npm run build` compiles the package to `build/` and generates API documentation in `docs/`. `npm run testWithCoverage` also writes a Cobertura coverage report and JUnit test results.
