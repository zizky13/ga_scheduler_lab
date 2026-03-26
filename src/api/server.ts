import app from "./app.js";
import { prisma } from "../db/client.js";

const PORT = Number(process.env.PORT ?? 3000);

async function startServer() {
  try {
    // Verify DB connectivity on startup
    await prisma.$connect();
    console.log("✅ Database connected");

    const server = app.listen(PORT, () => {
      console.log(`🚀 GA Scheduler API running at http://localhost:${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
      console.log(`   Environment: ${process.env.NODE_ENV ?? "development"}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n⚠️  Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log("✅ Server closed. Database disconnected.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));

  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

void startServer();
