import express from "express";
import type {
  Request,
  Response,
  NextFunction,
  Application as ExpressApplication,
} from "express";
import type { Socket } from "socket.io"; // 🔥 Імпортуємо тип Socket
import cors from "cors";
import http from "http"; // 🔥 Імпортовано для Socket.IO
import { Server as SocketIOServer } from "socket.io"; // 🔥 Імпортовано для Socket.IO
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken"; // 🔥 Імпортуємо для верифікації токена
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

// 🔥 Розширюємо інтерфейс Socket для типізації userId
interface ServerSocket extends Socket {
  userId?: string;
}

// *** ДОМЕНИ ДЛЯ CORS ***
const allowedOrigins = [
  "https://only-trable-final-frontend.vercel.app",
  "https://final-backend-odkb.onrender.com",
  "http://localhost:5173",
];

const startServer = (): void => {
  const app: ExpressApplication = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        // Дозволяємо запити без origin (наприклад, Postman) або ті, що є в списку
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true, // Дозволити передачу cookies
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"], // Явно дозволяємо необхідні заголовки
      optionsSuccessStatus: 204,
    }),
  );

  app.use(express.json({ limit: "10mb" })); // ✅ Збільшуємо ліміт для JSON-запитів
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

  // Ініціалізуємо cookieParser ПІСЛЯ cors
  app.use(cookieParser());
  app.use(express.static("public"));

  // 🔥 1. СТВОРЕННЯ HTTP-СЕРВЕРА З EXPRESS-ДОДАТКУ
  const httpServer = http.createServer(app);

  // 🔥 2. ІНІЦІАЛІЗАЦІЯ SOCKET.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://only-trable-final-frontend.vercel.app",
      ],
      // methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"], // Дозволяємо обидва типи для стабільності
    allowEIO3: true, // Для кращої сумісності
  });

  // 🔥 3. ЗБЕРІГАННЯ IO В ОБ'ЄКТІ APP для доступу в контролерах
  app.set("io", io);

  // 4. КОНФІГУРАЦІЯ ТА ГРУПУВАННЯ API РОУТЕРІВ
  const apiRouter = express.Router();
  const postsRouter = configurePostsRouter();

  apiRouter.use("/health", healthRouter); // Тепер доступний на /api/health
  apiRouter.use("/posts", postsRouter);
  apiRouter.use("/auth", authRouter);
  apiRouter.use("/user", userRouter);
  apiRouter.use("/follow", followRouter);
  apiRouter.use("/messages", messagesRouter);
  apiRouter.use("/notifications", notificationRouter);

  // Монтуємо всі API роути під єдиним префіксом /api
  app.use("/api", apiRouter);

  // Обробка помилок
  app.use(notFoundHandler);
  app.use(errorHandler);

  // 5. АВТЕНТИФІКАЦІЯ ТА ЛОГІКА SOCKET.IO
  io.use((socket: ServerSocket, next) => {
    const rawCookie = socket.handshake.headers.cookie;
    const token = socket.handshake.auth.token || 
                  rawCookie?.split('; ')
                  .find(row => row.trim().startsWith('refreshToken='))
                  ?.split('=')[1]
                  ?.trim();

    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string, (err: any, decoded: any) => {
      if (err) return next(new Error('Authentication error'));
      socket.userId = decoded.userId;
      next();
    });
  });

  io.on('connection', (socket: ServerSocket) => {
    if (socket.userId) {
      socket.join(socket.userId);
    }

    socket.on('join_conversation', (conversationId: string) => {
      if (conversationId) {
        socket.join(conversationId);
      }
    });

    socket.on('disconnect', () => {});
  });

  io.on("connection", (socket: ServerSocket) => {

    if (socket.userId) {
      socket.join(socket.userId); // Кожен користувач приєднується до своєї власної кімнати
    }

    // Клієнт присилає подію join_conversation, коли відкриває чат
    socket.on("join_conversation", (conversationId: string) => {
      if (conversationId) {
        socket.join(conversationId);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // 6. ЗАПУСК HTTP СЕРВЕРА
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

export default startServer;
