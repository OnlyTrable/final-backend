import express from "express";
import type {
  Request,
  Response,
  NextFunction,
  Application as ExpressApplication,
} from "express";
import cors from "cors";
import http from 'http'; // 🔥 Імпортовано для Socket.IO
import { Server as SocketIOServer } from 'socket.io'; // 🔥 Імпортовано для Socket.IO
import cookieParser from "cookie-parser";
import notFoundHandler from "./middlewares/notFoundHandler.js";
import errorHandler from "./middlewares/errorHandler.js";

// 🔥 1. ІМПОРТ РОУТЕРІВ
import authRouter from "./routers/auth.router.js";
import userRouter from "./routers/user.router.js";
import { configurePostsRouter } from "./routers/posts.router.js";
import healthRouter from "./routers/health.routes.js"; 
import followRouter from "./routers/follow.router.js";
import messagesRouter from "./routers/messages.router.js";
import notificationRouter from "./routers/notification.router.js";

// *** ДОМЕНИ ДЛЯ CORS ***
const allowedOrigins = [
  "https://only-trable-final-frontend.vercel.app", 
  "https://final-backend-odkb.onrender.com",     
  "http://localhost:5173", 
];

const startServer = (): void => {
  const app: ExpressApplication = express();
  app.use(cookieParser());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
      optionsSuccessStatus: 204,
    }),
  );

  app.use(express.json({ limit: "10kb" }));
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (
      err instanceof SyntaxError &&
      (err as any).status === 400 &&
      "body" in err
    ) {
      console.error("JSON parsing error:", err.message);
      return res.status(400).json({
        message:
          "Invalid JSON format in request body. Check Postman settings (raw, JSON type selected).",
      });
    }
    next(err);
  });
  app.use(express.static("public"));
  
  // 🔥 1. СТВОРЕННЯ HTTP-СЕРВЕРА З EXPRESS-ДОДАТКУ
  const httpServer = http.createServer(app);

  // 🔥 2. ІНІЦІАЛІЗАЦІЯ SOCKET.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins, 
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // 🔥 3. ЗБЕРІГАННЯ IO В ОБ'ЄКТІ APP для доступу в контролерах
  app.set('io', io); 

  // 4. КОНФІГУРАЦІЯ РОУТЕРІВ
  const postsRouter = configurePostsRouter();
  
  app.use("/health", healthRouter); 
  app.use("/api/posts", postsRouter); 
  app.use("/api/auth", authRouter); 
  app.use("/api/user", userRouter); 
  app.use("/api/follow", followRouter); 
  app.use("/api/messages", messagesRouter);
  app.use("/api/notifications", notificationRouter);
  
  // Обробка помилок
  app.use(notFoundHandler);
  app.use(errorHandler);

  // 5. ОСНОВНА ЛОГІКА SOCKET.IO 
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Логіка, де клієнт приєднується до кімнат (наприклад, socket.join(userId))
    // має бути реалізована тут або в окремому файлі
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
  });

  // 6. ЗАПУСК HTTP СЕРВЕРА
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

export default startServer;