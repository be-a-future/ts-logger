/** @format */

import dgram from 'dgram';
import { compose } from '@bafx/utils';
import * as fs from 'fs';
import { EOL } from 'os';
import { applyCorrelationId, applyOperationName, applyTraceId, applyTraceIdAndCorrelationId, defaultUUID, generateTraceId, getLogger, IBaseLoggerData } from '../src';
import {
  createBasicTypedLogger,
  createTypedLoggerWithIdsAndOperationName,
  createTypedLoggerWithTraceId,
  createTypedLoggerWithTraceIdAndCorrelationId,
  createTypedLoggerWithTraceIdAndOperation,
  applyOperationNameToTypedLogger,
} from '../src';

const padTo2Digits = (num: number) => num.toString().padStart(2, '0');
const today = (): string => {
  const date = new Date();
  return [date.getFullYear(), padTo2Digits(date.getUTCMonth() + 1), padTo2Digits(date.getUTCDate())].join('-');
};

const tmpFolder = __dirname + '/tmp';
const delay = () => new Promise((resolve) => setTimeout(resolve, 100));
const deleteTmpFolder = () => fs.rmSync(tmpFolder, { force: true, recursive: true });

const directoryExists = () => fs.existsSync(tmpFolder);

const readLog = async (): Promise<string[]> => {
  await delay();
  const content = await fs.readFileSync(`${tmpFolder}/log.${today()}`);
  return content.toString().split('|');
};

describe('logger', () => {
  const environment = 'test';
  const serviceName = 'test-app';
  const informationSystem = 'test-app';
  const defaultVersion = '0';

  // Common test data
  let traceId: string;
  let correlationId: string;
  let eventName: string;
  let operationName: string;
  let basicMetaData: { [key: string]: string };

  beforeEach(async () => {
    await deleteTmpFolder();

    // Initialize common test data
    traceId = 'test-trace-id';
    correlationId = 'test-correlation-id';
    eventName = 'test-event-name';
    operationName = 'test-function';
    basicMetaData = { key: 'value' };
  });

  const logger = () =>
    getLogger({
      level: 'info',
      serviceName,
      directory: tmpFolder,
      informationSystem,
      environment,
      enableConsoleLog: true,
    });

  it('logs something', async () => {
    const metaData = {
      key1: 'value1',
      key2: 'value2',
    };

    logger().info(traceId, correlationId, eventName, operationName, metaData);

    const [timestamp, ...rest] = await readLog();
    expect(timestamp).toEqual(expect.stringContaining(today()));

    expect(rest).toEqual([serviceName, environment, defaultVersion, traceId, correlationId, serviceName, 'info', eventName, operationName, `<key1>:value1;<key2>:value2${EOL}`]);
  });

  it('logs with default traceId', async () => {
    logger().info(undefined, correlationId, eventName, operationName, basicMetaData);

    const [timestamp, ...rest] = await readLog();
    expect(timestamp).toEqual(expect.stringContaining(today()));
    expect(rest).toEqual([serviceName, environment, defaultVersion, defaultUUID(), correlationId, serviceName, 'info', eventName, operationName, `<key>:value${EOL}`]);
  });

  it.each([undefined, ''])('logs correlation ID 0 when the supplied ID is %p', async (missingCorrelationId) => {
    logger().info(undefined, missingCorrelationId, eventName, operationName, basicMetaData);

    const [_, ...rest] = await readLog();
    expect(rest).toEqual([serviceName, environment, defaultVersion, defaultUUID(), '0', serviceName, 'info', eventName, operationName, `<key>:value${EOL}`]);
  });

  it('logs correlation ID 0 when the combined helper binds a missing ID', async () => {
    const requestLogger = applyTraceIdAndCorrelationId(traceId, undefined, logger());
    const operationLogger = applyOperationName(operationName, requestLogger);

    expect(operationLogger.correlationId).toBe('0');
    operationLogger.info(eventName, basicMetaData);

    const [_, ...rest] = await readLog();
    expect(rest).toEqual([serviceName, environment, defaultVersion, traceId, '0', serviceName, 'info', eventName, operationName, `<key>:value${EOL}`]);
  });

  it('should not log debug when log level is info', async () => {
    logger().debug(undefined, correlationId, eventName, operationName, basicMetaData);

    const log = await readLog();
    expect(log).toEqual(['']);
  });

  it('logs error with message', async () => {
    const error = new Error('System threw error');

    logger().error(traceId, correlationId, eventName, operationName, error);

    const [timestamp, ...rest] = await readLog();
    expect(timestamp).toEqual(expect.stringContaining(today()));
    expect(rest).toEqual([
      serviceName,
      environment,
      defaultVersion,
      traceId,
      correlationId,
      serviceName,
      'error',
      eventName,
      operationName,
      expect.stringContaining(`<message>:System threw error${EOL}`),
    ]);
  });

  it('logs error with stack trace', async () => {
    const error = new Error('System threw error');
    error.stack = 'fn1 -> fn2';

    logger().error(traceId, correlationId, eventName, operationName, error);

    const [timestamp, ...rest] = await readLog();
    expect(timestamp).toEqual(expect.stringContaining(today()));
    expect(rest).toEqual([
      serviceName,
      environment,
      defaultVersion,
      traceId,
      correlationId,
      serviceName,
      'error',
      eventName,
      operationName,
      expect.stringContaining(`<stack>:fn1 -> fn2;<message>:System threw error${EOL}`),
    ]);
  });

  it('logs with composed traceId, correlationId and operationName', async () => {
    const metaData = { key: 'value' };

    compose(applyOperationName(operationName), applyCorrelationId(correlationId), applyTraceId(traceId))(logger()).info(eventName, metaData);

    const [timestamp, ...rest] = await readLog();
    expect(timestamp).toEqual(expect.stringContaining(today()));
    expect(rest).toEqual([serviceName, environment, defaultVersion, traceId, correlationId, serviceName, 'info', eventName, operationName, `<key>:value${EOL}`]);
  });

  it('logs a message with only traceId and operationName bound', async () => {
    const operationLogger = applyOperationName(operationName, applyTraceId(traceId, logger()));

    operationLogger.info(eventName);

    const [_, ...rest] = await readLog();
    expect(rest).toEqual([serviceName, environment, defaultVersion, traceId, '0', serviceName, 'info', eventName, `${operationName}${EOL}`]);
  });

  it('logs a message with traceId, correlationId and operationName bound separately', async () => {
    const traceLogger = applyTraceId(traceId, logger());
    const correlatedLogger = applyCorrelationId(correlationId, traceLogger);
    const operationLogger = applyOperationName(operationName, correlatedLogger);

    operationLogger.info(eventName);

    const [_, ...rest] = await readLog();
    expect(rest).toEqual([serviceName, environment, defaultVersion, traceId, correlationId, serviceName, 'info', eventName, `${operationName}${EOL}`]);
  });

  it('logs object with string interpolation', async () => {
    const metaData = { id: 15 };

    logger().info(traceId, correlationId, eventName, operationName, `some object: ${metaData}`);

    const [timestamp, ...rest] = await readLog();
    expect(timestamp).toEqual(expect.stringContaining(today()));
    expect(rest).toEqual([serviceName, environment, defaultVersion, traceId, correlationId, serviceName, 'info', eventName, operationName, `some object: [object Object]${EOL}`]);
  });

  it('logs with generated traceId', async () => {
    const generatedTraceId = generateTraceId();
    const metaData = { id: 15 };

    logger().info(generatedTraceId, correlationId, eventName, operationName, metaData);

    const [timestamp, ...rest] = await readLog();
    expect(timestamp).toEqual(expect.stringContaining(today()));
    expect(rest).toEqual([serviceName, environment, defaultVersion, generatedTraceId, correlationId, serviceName, 'info', eventName, operationName, `<id>:15${EOL}`]);
    expect(generatedTraceId).toBeTruthy();
    expect(generatedTraceId).not.toEqual(defaultUUID());
  });

  it('does not create file when logging to file is NOT configured.', () => {
    const metaData = 'test-message';

    const logger = () =>
      getLogger({
        serviceName,
        level: 'info',
        environment,
        informationSystem: serviceName,
      });
    logger().info(traceId, correlationId, eventName, operationName, metaData);

    expect(!directoryExists()).toEqual(true);
  });

  it('does create file when logging to file IS configured.', () => {
    const metaData = 'test-message';

    const logger = () =>
      getLogger({
        serviceName,
        level: 'info',
        environment,
        informationSystem: serviceName,
        directory: tmpFolder,
      });
    logger().info(traceId, correlationId, eventName, operationName, metaData);

    expect(directoryExists()).toEqual(true);
  });

  it('creates file with correct file name.', async () => {
    const metaData = 'test-message';

    const logger = () =>
      getLogger({
        serviceName,
        level: 'info',
        environment,
        informationSystem: serviceName,
        directory: tmpFolder,
        fileName: 'abcdef.log',
      });
    logger().info(traceId, correlationId, eventName, operationName, metaData);

    await delay();

    const ls = (folder: string) => fs.readdirSync(folder);
    expect(ls(tmpFolder).findIndex((file) => file.startsWith('abcdef.log'))).toBeGreaterThan(-1);
  });

  it('creates file with default name when filename is not defined.', async () => {
    const metaData = 'test-message';

    const logger = () =>
      getLogger({
        serviceName,
        level: 'info',
        environment,
        informationSystem: serviceName,
        directory: tmpFolder,
      });
    logger().info(traceId, correlationId, eventName, operationName, metaData);

    await delay();

    const ls = (folder: string) => fs.readdirSync(folder);
    expect(ls(tmpFolder).findIndex((file) => file.startsWith('log.'))).toBeGreaterThan(-1);
  });

  /** This test cannot be used now, because winston syslogger does not close its UDP connection after logger use.*/
  xit('successfully sends logs to syslog when syslog config provided.', async () => {
    const metaData = {};

    const logger = () =>
      getLogger({
        serviceName,
        level: 'info',
        environment,
        informationSystem: serviceName,
        directory: tmpFolder,
        syslogServer: 'localhost',
        syslogPort: 10514,
      });

    let socketHasStarted = false;

    const socket = dgram.createSocket('udp4');

    let syslogMessage = '';
    socket.on('message', (msg) => {
      syslogMessage = msg.toString();
    });
    socket.on('listening', () => {
      socketHasStarted = true;
      logger().info(traceId, correlationId, eventName, operationName, metaData);
    });
    socket.bind(10514);

    while (!socketHasStarted) {
      await delay();
    }

    socket.close();

    const [timestamp, ...rest] = await readLog();
    expect(timestamp.startsWith(today())).toBe(true);
    expect(rest).toEqual([serviceName, environment, defaultVersion, traceId, correlationId, serviceName, 'info', eventName, operationName, `${EOL}`]);

    const [_syslogTimestamp, ...syslogRest] = syslogMessage.split('|');
    expect(syslogRest).toEqual([serviceName, environment, defaultVersion, traceId, correlationId, serviceName, 'info', eventName, operationName, '']);
  });

  it('logs security message successfully', async () => {
    eventName = 'Unauthorized access attempt';
    operationName = 'security-function';
    const metaData = { ip: '192.168.1.1' };

    logger().security(traceId, correlationId, eventName, operationName, metaData);
    const [_, ...loggedMessage] = await readLog();

    expect(loggedMessage).toEqual([serviceName, environment, defaultVersion, traceId, correlationId, serviceName, 'security', eventName, operationName, `<ip>:192.168.1.1${EOL}`]);
  });

  it('logs security message with traceId only', async () => {
    eventName = 'Suspicious activity detected';
    operationName = 'security-function';
    const metaData = { userId: '123' };

    const securityWithTrace = logger().security(traceId);
    securityWithTrace(correlationId, eventName, operationName, metaData);
    const [_, ...loggedMessage] = await readLog();

    expect(loggedMessage).toEqual([serviceName, environment, defaultVersion, traceId, correlationId, serviceName, 'security', eventName, operationName, `<userId>:123${EOL}`]);
  });

  it('logs security message with both traceId and correlationId', async () => {
    eventName = 'Security settings changed';
    operationName = 'security-function';
    const metaData = { userId: '123' };

    const securityFinal = logger().security(traceId, correlationId);
    securityFinal(eventName, operationName, metaData);
    const [_, ...loggedMessage] = await readLog();

    expect(loggedMessage).toEqual([serviceName, environment, defaultVersion, traceId, correlationId, serviceName, 'security', eventName, operationName, `<userId>:123${EOL}`]);
  });

  it('logs security message with default traceId', async () => {
    eventName = 'Security event occurred';
    operationName = 'security-function';
    const metaData = {};

    const securityWithTrace = logger().security(undefined);
    securityWithTrace(correlationId, eventName, operationName, metaData);

    const [_, ...rest] = await readLog();
    expect(rest[3]).toEqual(defaultUUID());
  });

  it('logs security message with generated traceId', async () => {
    const generatedTraceId = generateTraceId();
    eventName = 'Security event occurred';
    operationName = 'security-function';
    const metaData = {};

    logger().security(generatedTraceId, correlationId, eventName, operationName, metaData);

    const [_, ...rest] = await readLog();
    expect(rest[3]).toBeTruthy();
    expect(rest[3]).not.toEqual(defaultUUID());
  });

  describe('typed logger', () => {
    interface AppLoggerData extends IBaseLoggerData {
      dashboardId: string;
      userId: string;
    }

    const EVENT_NAMES = {
      CARD_DELETE: 'Card delete',
      CARD_CREATE: 'Card create',
    } as const;

    type EventKeys = keyof typeof EVENT_NAMES;

    const TEST_LOG_DATA: AppLoggerData = {
      action: 'test',
      userName: 'test',
      result: 'test',
      dashboardId: 'test',
      userId: 'test',
    };

    const EXPECTED_LOG_DATA_STRING = `<action>:test;<userName>:test;<result>:test;<dashboardId>:test;<userId>:test${EOL}`;

    const verifyLogOutput = (rest: string[], expectedCorrelationId = correlationId) => {
      expect(rest).toEqual([
        serviceName,
        environment,
        defaultVersion,
        traceId,
        expectedCorrelationId,
        serviceName,
        'info',
        EVENT_NAMES.CARD_DELETE,
        operationName,
        EXPECTED_LOG_DATA_STRING,
      ]);
    };

    it('creates a basic typed logger', async () => {
      const basicLogger = createBasicTypedLogger<EventKeys, typeof EVENT_NAMES, AppLoggerData>(logger());

      basicLogger.info(traceId, correlationId, EVENT_NAMES.CARD_DELETE, operationName, TEST_LOG_DATA);

      const [_, ...rest] = await readLog();
      verifyLogOutput(rest);
    });

    it('creates a typed logger with traceId', async () => {
      const loggerWithTraceId = applyTraceId(traceId)(logger());
      const typedLoggerWithTraceId = createTypedLoggerWithTraceId<EventKeys, typeof EVENT_NAMES, AppLoggerData>(loggerWithTraceId);

      typedLoggerWithTraceId.info(correlationId, EVENT_NAMES.CARD_DELETE, operationName, TEST_LOG_DATA);

      const [_, ...rest] = await readLog();
      verifyLogOutput(rest);
    });

    it('creates a typed logger with traceId and operationName', async () => {
      const loggerWithTraceIdAndOperationName = compose(applyOperationName(operationName), applyTraceId(traceId))(logger());

      const typedLoggerWithTraceIdAndOperationName = createTypedLoggerWithTraceIdAndOperation<EventKeys, typeof EVENT_NAMES, AppLoggerData>(loggerWithTraceIdAndOperationName);

      typedLoggerWithTraceIdAndOperationName.info(EVENT_NAMES.CARD_DELETE, TEST_LOG_DATA);

      const [_, ...rest] = await readLog();
      verifyLogOutput(rest, '0');
    });

    it('creates a typed logger with traceId, correlationId', async () => {
      const loggerWithTraceIdAndCorrelationId = applyTraceIdAndCorrelationId(traceId, correlationId)(logger());
      const typedLoggerWithTraceIdAndCorrelationId = createTypedLoggerWithTraceIdAndCorrelationId<EventKeys, typeof EVENT_NAMES, AppLoggerData>(loggerWithTraceIdAndCorrelationId);

      typedLoggerWithTraceIdAndCorrelationId.info(EVENT_NAMES.CARD_DELETE, operationName, TEST_LOG_DATA);

      const [_, ...rest] = await readLog();
      verifyLogOutput(rest);
    });

    it('creates a typed logger with traceId, correlationId and operationName', async () => {
      const loggerWithIds = applyTraceIdAndCorrelationId(traceId, correlationId)(logger());
      const loggerWithIdsAndOperationName = applyOperationName(operationName)(loggerWithIds);

      const typedLoggerWithIdsAndOperationName = createTypedLoggerWithIdsAndOperationName<EventKeys, typeof EVENT_NAMES, AppLoggerData>(loggerWithIdsAndOperationName);

      typedLoggerWithIdsAndOperationName.info(EVENT_NAMES.CARD_DELETE, TEST_LOG_DATA);

      const [_, ...rest] = await readLog();
      verifyLogOutput(rest);
    });

    it('creates a typed logger with traceID and correlationId, makes a typed logger from it and then applies operationName to it', async () => {
      const loggerWithIds = applyTraceIdAndCorrelationId(traceId, correlationId)(logger());

      const typedLoggerWithIds = createTypedLoggerWithTraceIdAndCorrelationId<EventKeys, typeof EVENT_NAMES, AppLoggerData>(loggerWithIds);

      const typedLoggerWithIdsAndOperationName = applyOperationNameToTypedLogger(operationName, typedLoggerWithIds);

      typedLoggerWithIdsAndOperationName.info(EVENT_NAMES.CARD_DELETE, TEST_LOG_DATA);

      const [_, ...rest] = await readLog();
      verifyLogOutput(rest);
    });
  });
});
