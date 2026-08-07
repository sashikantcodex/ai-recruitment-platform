/**
 * Must run before any module that imports config.ts (Zod-parsed env).
 */
process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.MONGODB_URI = "mongodb://localhost:27017/ai-ats-test";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.AI_SERVICE_URL = "http://localhost:8000";
process.env.AI_SERVICE_TOKEN = "test-token";
process.env.UPLOAD_DIR = "./uploads-test";
process.env.STORAGE_DRIVER = "local";
