import { applyCorrelationId, applyOperationName, applyTraceId, applyTraceIdAndCorrelationId, createTypedLoggerWithTraceIdAndOperation, loggerMocked } from '../src';

describe.each(['debug', 'info', 'warn', 'error', 'security'] as const)('%s context logger', (level) => {
  const traceId = 'trace-id';
  const correlationId = 'correlation-id';
  const operationName = 'createOrder';
  const eventName = 'Order created';
  let output: jest.SpyInstance;

  beforeEach(() => {
    output = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    output.mockRestore();
  });

  it.each([undefined, 'order-123', { orderId: '123' }])('binds only an operation to a plain logger with data %p', (data) => {
    const logger = applyOperationName(operationName, loggerMocked);

    expect(logger).toMatchObject({ traceId: '0', operationName });
    expect(loggerMocked).not.toHaveProperty('operationName');
    expect(loggerMocked).not.toHaveProperty('traceId');

    if (data === undefined) {
      logger[level](eventName);
    } else {
      logger[level](eventName, data);
    }

    expect(output).toHaveBeenCalledTimes(1);
    expect(output).toHaveBeenCalledWith({ level, traceId: '0', correlationId: '0', eventName, operationName, data });
  });

  it('supports curried operation binding on a plain logger with independent contexts', () => {
    const first = applyOperationName(operationName)(loggerMocked);
    const second = applyOperationName('another-operation')(loggerMocked);

    first[level](eventName);
    second[level](eventName);

    expect(output).toHaveBeenCalledTimes(2);
    expect(output).toHaveBeenNthCalledWith(1, { level, traceId: '0', correlationId: '0', eventName, operationName, data: undefined });
    expect(output).toHaveBeenNthCalledWith(2, { level, traceId: '0', correlationId: '0', eventName, operationName: 'another-operation', data: undefined });
  });

  it.each([undefined, 'order-123', { orderId: '123' }])('logs with trace and operation context and data %p', (data) => {
    const logger = applyOperationName(operationName, applyTraceId(traceId, loggerMocked));

    if (data === undefined) {
      logger[level](eventName);
    } else {
      logger[level](eventName, data);
    }

    expect(output).toHaveBeenCalledTimes(1);
    expect(output).toHaveBeenCalledWith({ level, traceId, correlationId: '0', eventName, operationName, data });
  });

  it.each([undefined, 'order-123', { orderId: '123' }])('logs with trace, correlation and operation context and data %p', (data) => {
    const traceLogger = applyTraceId(traceId, loggerMocked);
    const correlatedLogger = applyCorrelationId(correlationId, traceLogger);
    const logger = applyOperationName(operationName, correlatedLogger);

    expect(logger).toMatchObject({ traceId, correlationId, operationName });
    expect(traceLogger).not.toHaveProperty('correlationId');
    expect(correlatedLogger).not.toHaveProperty('operationName');

    if (data === undefined) {
      logger[level](eventName);
    } else {
      logger[level](eventName, data);
    }

    expect(output).toHaveBeenCalledTimes(1);
    expect(output).toHaveBeenCalledWith({ level, traceId, correlationId, eventName, operationName, data });
  });

  it('supports curried helpers without changing the original context', () => {
    const traceLogger = applyTraceId(traceId)(loggerMocked);
    const first = applyCorrelationId(correlationId)(traceLogger);
    const second = applyCorrelationId('another-id')(traceLogger);

    first[level](eventName, operationName, undefined);
    applyOperationName(operationName)(second)[level](eventName);

    expect(output).toHaveBeenCalledTimes(2);
    expect(output).toHaveBeenNthCalledWith(1, { level, traceId, correlationId, eventName, operationName, data: undefined });
    expect(output).toHaveBeenNthCalledWith(2, { level, traceId, correlationId: 'another-id', eventName, operationName, data: undefined });
  });

  it.each([false, true])('preserves event and data in the typed operation wrapper (bound correlation ID: %p)', (withCorrelationId) => {
    const traceLogger = applyTraceId(traceId, loggerMocked);
    const operationLogger = withCorrelationId
      ? applyOperationName(operationName, applyCorrelationId(correlationId, traceLogger))
      : applyOperationName(operationName, traceLogger);
    const events = { CREATED: eventName } as const;
    const data = { action: 'create', orderId: '123' };
    const logger = createTypedLoggerWithTraceIdAndOperation<keyof typeof events, typeof events, typeof data>(operationLogger);

    logger[level](events.CREATED, data);

    expect(output).toHaveBeenCalledTimes(1);
    expect(output).toHaveBeenCalledWith({ level, traceId, correlationId: withCorrelationId ? correlationId : '0', eventName, operationName, data });
  });

  it('uses trace ID 0 when an empty string is bound', () => {
    const logger = applyOperationName(operationName, applyTraceId('', loggerMocked));

    expect(logger.traceId).toBe('0');
    logger[level](eventName);

    expect(output).toHaveBeenCalledWith({ level, traceId: '', correlationId: '0', eventName, operationName, data: undefined });
  });

  it('uses 0 for both missing IDs through the combined helper', () => {
    const logger = applyTraceIdAndCorrelationId(undefined, undefined, loggerMocked);

    expect(logger.traceId).toBe('0');
    expect(logger.correlationId).toBe('0');
    applyOperationName(operationName, logger)[level](eventName);

    expect(output).toHaveBeenCalledWith({ level, traceId: undefined, correlationId: undefined, eventName, operationName, data: undefined });
  });
});
