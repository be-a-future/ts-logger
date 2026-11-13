import { Optional } from '@bafx/utils';

export type ILogWithTraceId = {
  (correlationId: Optional<string>, eventName: string, operationName: string, data: Optional<object | string>): void;
};

export type ILogWithTraceIdAndCorrelationId = {
  (eventName: string, operationName: string, data: Optional<object | string>): void;
};

export type ILogWithTraceIdAndCorrelationIdAndOperationName = {
  (eventName: string, data?: object | string): void;
};

export type ILogWithTraceIdAndOperationName = {
  (eventName: string, data?: object | string): void;
};

export type ILog = {
  (traceId: Optional<string>, correlationId: Optional<string>, eventName: string, operationName: string, data: Optional<object | string>): void;
  (traceId: Optional<string>, correlationId: Optional<string>): ILogWithTraceIdAndCorrelationId;
  (traceId: Optional<string>): ILogWithTraceId;
};

export type LogLevel = 'debug' | 'warn' | 'info' | 'error' | 'security';

export interface ILogger<TLog = ILog> {
  /**
   * **debug** level - Vhodný pro logování debugovacích informací, které se vetšinou neobjeví v produkčních log souborech
   */
  debug: TLog;
  /**
   * **warn** level - Vhodný pro logování chyb se kterými se za běhu aplikace počítá
   */
  warn: TLog;
  /**
   * **info** level - Vhodný pro logování běžných informativních zpráv o tom, že se něco stalo
   */
  info: TLog;
  /**
   * **error** level - Vhodný pro logování chyb, které by se běžně neměli stávat. Tyto log záznamy by se následně měli řešit jako incident
   */
  error: TLog;
  /**
   * **security** level - Vhodný pro logování bezpečnostních událostí jako jsou pokusy o neoprávněný přístup, podezřelé aktivity, nebo změny v bezpečnostních nastaveních.
   */
  security: TLog;
}

export interface ILoggerWithTraceId<TLog = ILogWithTraceId> extends ILogger<TLog> {
  traceId: string;
}

export interface ILoggerWithTraceIdAndCorrelationId extends ILoggerWithTraceId<ILogWithTraceIdAndCorrelationId> {
  correlationId: string;
}

export interface ILoggerWithTraceIdAndCorrelationIdAndOperationName extends ILoggerWithTraceIdAndOperationName<ILogWithTraceIdAndCorrelationIdAndOperationName> {
  correlationId: string;
}

export interface ILoggerWithTraceIdAndOperationName<TLog = ILogWithTraceIdAndOperationName> extends ILoggerWithTraceId<TLog> {
  operationName: string;
}

export interface IBaseLoggerData {
  action: string;
  userName?: string;
  result?: string;
}

export interface IConfig {
  /**
   * Název informačního systému
   */
  informationSystem: string;
  /**
   * Prostředí, ve kterém loguje aplikace
   */
  environment: string;
  /**
   * Cesta ke složce, kde se ukládají logovací soubory.
   */
  directory?: string;
  /**
   * Název souboru v případě, že se loguje do souboru.
   */
  fileName?: string;
  /**
   * Název služby v daném {@link hostname}
   */
  serviceName: string;
  /**
   * Úroveň logování (defaultně "info")
   */
  level?: string;
  /**
   * Označení verze buildu
   */
  version?: string;
  /**
   * Adresa syslog serveru
   */
  syslogServer?: string;
  /**
   * Port syslog serveru
   */
  syslogPort?: number;
  /**
   * Pokud false, tak logger nebude logovat do console.
   * Užitečné pro šetření místa na disku pokud už loguji do souboru.
   */
  enableConsoleLog?: boolean;
}
