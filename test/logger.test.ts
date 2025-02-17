import { LoggerOptions } from "../src/types";
import { loggerManager } from "../src/logger";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";

describe("test Logger class", () => {
  let mongoServer:MongoMemoryServer;
  let mongoUri:string;
  let client: MongoClient;
  let option: LoggerOptions 
  let logManager: loggerManager;
  let db:any;
  let collection:any
 beforeAll(async() => {
   mongoServer = await MongoMemoryServer.create();
   mongoUri = mongoServer.getUri();
   // 创建 MongoDB 客户端并连接
   client = new MongoClient(mongoUri, {
     serverSelectionTimeoutMS: 5000, // 设置较短的连接超时，便于测试
   });
   await client.connect();

   db = client.db(); // 使用默认数据库
   collection = db.collection("log");
   option = {
     context: "test",
     mongoUri: mongoUri,
   };
   logManager = new loggerManager(option);
 })
 afterAll(async()=>{
  await client.close();
  await mongoServer.stop();
 })
  test("should be defined", async() => {

  const message = "This is an info log message";
  const data = { key: "value" };
    await logManager.info(message, data);
    await logManager.error("test error", new Error("test error"), data);
    // 检查 MongoDB 中是否成功保存日志
    // const savedLogs = await collection.find({}).toArray();
    // console.log(savedLogs,"查询到的数据")
    // expect(savedLogs.length).toHaveLength(1)
    // expect(savedLogs[0].message).toBe(message);
    // expect(savedLogs[0].level).toBe("info");
    // expect(savedLogs[0].data).toEqual(data);
    // expect(true).toBe(true);
  });
})