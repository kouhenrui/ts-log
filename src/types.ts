
//日志级别
export interface LoggerType {
  debug(message: string, data?: Record<string, any>): Promise<void>;
  info(message: string, data?: Record<string, any>): Promise<void>;
  warn(message: string, data?: Record<string, any>): Promise<void>;
  error(
    message: string,
    error?: Error,
    data?: Record<string, any>
  ): Promise<void>;
  fatal(message: string, data?: Record<string, any>): Promise<void>;
}

//日志内容
export interface Log {
  level: string;//"info" | "warn" | "error" | "debug"| "fatal"; // 日志级别，严格限定为固定值
  timestamp: string; // 时间戳，使用 ISO 8601 格式的字符串
  message: string; // 必填字段，描述日志的主要信息
  data?: Record<string, any>; // 可选字段，记录附加的数据结构
  error?: {
    name?: string; // 错误名称
    message?: string; // 错误信息
    stack?: string; // 错误堆栈
  }; // 可选字段，用于记录错误信息
  ip?: string; // 可选字段，记录 IP 地址
  context?: string; // 可选字段，记录日志的上下文来源（如模块名、功能名称）
  metadata?: Record<string, any>; // 可选字段，用于存储额外的上下文信息
  requestId?: string; // 可选字段，用于追踪请求 ID
  userId?: string; // 可选字段，记录用户标识
}

//实例化日志连接需要的参数
export interface LoggerOptions {
  context: string;
  mongoUri: string;
  logFilePath?: string;
  dbName?: string;
}