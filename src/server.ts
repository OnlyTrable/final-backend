import express from "express"; // Використовуємо Application після виправлення
import type {
  Request,
  Response,
  NextFunction,
  Application as ExpressApplication,
} from "express"; // Якщо виникне помилка, використовуйте цей синтаксис
import cors from "cors";
import cookieParser from "cookie-parser";
// import mongoSanitize from 'express-mongo-sanitize';

import notFoundHandler from "./middlewares/notFoundHandler.js";
import errorHandler from "./middlewares/errorHandler.js";

// 🔥 1. ІМПОРТ РОУТЕРА АУТЕНТИФІКАЦІЇ
import authRouter from "./routers/auth.router.js";
import userRouter from "./routers/user.router.js";
import { configurePostsRouter } from "./routers/posts.router.js";

// *** ДОДАЄМО ВИЗНАЧЕННЯ ДОМЕНІВ ДЛЯ КРАЩОГО КОНТРОЛЮ CORS ***
const allowedOrigins = [
  "https://only-trable-final-frontend.vercel.app", // Ваш продакшн-домен
  "http://localhost:5173", // Локальна розробка
  // Якщо ви деплоїте бекенд на Vercel, також додайте його домен
];

const startServer = (): void => {
  const app: ExpressApplication = express();
  app.use(cookieParser());

  // ✅ ВИКОРИСТОВУЄМО CORS З ФУНКЦІЄЮ ПЕРЕВІРКИ
  app.use(
    cors({
      origin: (origin, callback) => {
        // Дозволяємо, якщо джерело знаходиться у списку allowedOrigins,
        // АБО якщо `origin` є undefined (що буває для Postman або деяких серверних запитів)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          // Якщо джерело не дозволено
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true, // Це КРИТИЧНО для відправки куків (refreshToken)
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
      optionsSuccessStatus: 204,
    }),
  );

  app.use(express.json({ limit: "10kb" }));
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Тип 'err' встановлюємо як 'any', тому що помилка парсингу JSON містить нестандартні поля
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

    // Якщо це не помилка парсингу JSON, передаємо її далі
    next(err);
  });
  app.use(express.static("public"));
  const postsRouter = configurePostsRouter();
  // 2. ЗАХИСТ ВІД NOSQL ІН'ЄКЦІЙ
  // app.use(mongoSanitize());
  app.use("/api/posts", postsRouter);
  // 🔥 2. ПІДКЛЮЧЕННЯ РОУТЕРІВ
  // Всі запити, що починаються з /api/auth, будуть оброблені у authRouter
  app.use("/api/auth", authRouter);
  app.use("/api/user", userRouter);
  // Обробники помилок мають бути ПІСЛЯ роутів
  app.use(notFoundHandler);
  app.use(errorHandler);

  const port: number = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Server running on ${port} port`));
};

export default startServer;