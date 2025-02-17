import { MongoClient, Collection } from "mongodb";
import * as fs from "fs";
import * as path from "path";
import { Log, LoggerOptions, LoggerType } from "./types";
import { createLogger, format, transports } from "winston";
import "winston-mongodb";
import os from 'os';
export class loggerManager {
  private log: LoggerType;

  constructor(option:LoggerOptions) {
    this.log = new Logger(option);
  }

  public async info(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    console.log(data,message,"接口方法打印")
    await this.log.info(message, data);
    // throw new Error("Method not implemented.");
  }
  public async warn(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.log.warn(message,data)
    throw new Error("Method not implemented.");
  }
  public async error(
    message: string,
    error?: Error,
    data?: Record<string, any>
  ): Promise<void> {
    await this.log.error(message, error, data);
    // throw new Error("Method not implemented.");
  }
  public async debug(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.log.debug(message,data);
    // throw new Error("Method not implemented.");
  }
  public async fatal(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.log.fatal(message,data);
    // throw new Error("Method not implemented.");
  }
}

// 日志管理类
export class Logger implements LoggerType {
  private context: string;
  private collection: Collection | null = null;
  private logQueue: Log[] = [];
  private isProcessing = false; //并发锁
  // private logFilePath: string;
  private mongoUri: string;

  private logger: any;
  constructor (option:LoggerOptions) {
    this.context = option.context || "default";
    // this.logFilePath = option.logFilePath
    //   ? option.logFilePath
    //   : path.resolve(__dirname, "../logs.json");
    this.mongoUri = option.mongoUri;
    //  this.connectToMongo(this.mongoUri, option.dbName || "log")
    // 初始化 winston logger
    this.logger = createLogger({
      level: "info", // 默认日志级别
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.colorize(),
        format.simple()
        // format.printf((info) => {
        //   const log: Log = this.formatLog(info);
        //   return JSON.stringify(log, null, 2); // 将日志转化为 JSON 字符串
        // })
      ),
      transports: [
        new transports.Console(),
        // new transports.MongoDB({
        //   level: "info", // 存储的最低日志级别
        //   db: this.mongoUri
        // }),
      ],
    });
  }

  /**
   * 生成json文件
   */
  // private async makeFile() {
  //   try {
  //     if (!fs.existsSync(this.logFilePath)) {
  //       // 如果文件不存在，则创建并写入数据
  //       const jsonContent = JSON.stringify({}, null, 2);
  //       fs.writeFileSync(this.logFilePath, jsonContent);
  //     }
  //   } catch (error: any) {
  //     console.error(error);
  //   }
  // }

  /**
   * 连接到 MongoDB
   */
  private async connectToMongo(uri: string, dbName: string): Promise<void> {
    try {
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db(dbName);
      this.collection = db.collection("logs");
    } catch (err:any) {
      console.error("Failed to connect to MongoDB:", err);
      throw new Error( err);
    }
  }

  /**
   * 格式化日志，并自动生成时间戳
   */
  private formatLog(log: any): Log {
    return {
      timestamp: new Date().toISOString(),
      context: log.context || this.context,
      level: log.level || "info", // 默认级别为 info
      message: log.message || "",
      data: log.data || {},
      error: log.error || {},
      ip: this.getLocalIPAddress(),
      metadata: log.metadata || {},
      requestId: log.requestId || "",
      userId: log.userId || "",
    };
  }

  /**
   * 判断日志是否需要输出
   */
  private shouldLog(level: string): boolean {
const levels: Record<string, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};
return levels[level] <= levels['info'];
  }

  /**
   * 保存日志到 MongoDB，支持异步批量插入
   */
  private async saveToMongo(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      while (this.collection && this.logQueue.length > 0) {
        const batch = this.logQueue.splice(0, 10); // 每次处理 10 条日志

        try {
          await this.collection.insertMany(batch);
          console.log(`Saved ${batch.length} logs to MongoDB.`);
        } catch (err) {
          console.error("Failed to save logs to MongoDB:", err);
          // 回退到文件保存
          // for (const log of batch) {
          //   await this.saveToFile(log);
          // }
        }

        // 控制批量写入频率，防止 MongoDB 压力过大
        await new Promise((resolve) => setTimeout(resolve, 100)); // 延迟 100 毫秒
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 保存日志到文件
   */
  // private async saveToFile(log: Log): Promise<void> {
  //   try {
  //     const logs = fs.existsSync(this.logFilePath)
  //       ? JSON.parse(fs.readFileSync(this.logFilePath, "utf-8"))
  //       : [];
  //     logs.push(log);
  //     fs.writeFileSync(this.logFilePath, JSON.stringify(logs, null, 2));
  //     console.log("Log saved to file.");
  //   } catch (err) {
  //     console.error("Failed to save log to file:", err);
  //   }
  // }

  //获取IP地址
  private  getLocalIPAddress():string {
  const networkInterfaces = os.networkInterfaces();
  let ipAddress = '';

  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];

    for (const interfaceInfo of interfaces!) {
      if (!interfaceInfo.internal && interfaceInfo.family === 'IPv4') {
        ipAddress = interfaceInfo.address;
        break;
      }
    }

    if (ipAddress) break;
  }

  return ipAddress;
}


  /**
   * 输出日志
   */
  private enqueueLog(log: Partial<Log>): void {
    const formattedLog = this.formatLog(log); 
    if (this.shouldLog(formattedLog.level)) {
      this.logQueue.push(formattedLog);

      console.log(formattedLog,"格式化的日志信息")
      switch (formattedLog.level) {
        case 'info':
          this.logger.info(formattedLog);
          break;
        case 'warn':
          this.logger.warn(formattedLog);
          break
        case 'error':
          this.logger.error(formattedLog);
          break
        case 'debug':
          this.logger.debug(formattedLog);
          break
        case 'fatal':
          this.logger.fatal(formattedLog);
          break      
      }
      // this.saveToMongo(); // 异步处理
    }
  }

  public async info(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    this.enqueueLog({ level: "info", message, data });
  }

  public async warn(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    this.enqueueLog({ level: "warn", message, data });
  }

  public async error(
    message: string,
    error?: Error,
    data?: Record<string, any>
  ): Promise<void> {
    this.enqueueLog({
      level: "error",
      message,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      data,
      timestamp: "",
    });
  }

  public async debug(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    this.enqueueLog({
      level: "debug",
      message,
      data,
      timestamp: "",
    });
  }

  public async fatal(
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    this.enqueueLog({
      level: "fatal",
      message,
      data,
      timestamp: "",
    });
  }
}

// 全局 Logger 实例
let loggerInstance: Logger | null = null;

/**
 * 初始化 Logger 实例
 * @param context 日志上下文
 * @param mongoUri MongoDB 连接字符串
 * @param dbName 数据库名称
 */
export function initLogger(
  context: string,
  mongoUri: string,
  dbName?: string
): void {
  if (loggerInstance) {
    console.warn(
      "Logger has already been initialized. Skipping reinitialization."
    );
    return;
  }

  const option: LoggerOptions = {
    context,
    mongoUri,
    dbName,
  }
  loggerInstance = new Logger(option);
}

/**
 * 获取全局 Logger 实例
 * @returns Logger 实例
 */
export function getLogger(): Logger {
  if (!loggerInstance) {
    throw new Error(
      "Logger has not been initialized. Call initLogger() first."
    );
  }
  return loggerInstance;
}

// 导出默认单例
// const logger = new Logger("defaultLog");
// export default logger;
