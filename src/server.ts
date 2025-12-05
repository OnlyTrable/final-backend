import express from "express"; // Використовуємо Application після виправлення
import type {
  Request,
  Response,
  NextFunction,
  Application as ExpressApplication,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import notFoundHandler from "./middlewares/notFoundHandler.js";
import errorHandler from "./middlewares/errorHandler.js";

// 🔥 1. ІМПОРТ РОУТЕРІВ
import authRouter from "./routers/auth.router.js";
import userRouter from "./routers/user.router.js";
import { configurePostsRouter } from "./routers/posts.router.js";
import healthRouter from "./routers/health.routes.js"; 

// *** ДОДАЄМО ВИЗНАЧЕННЯ ДОМЕНІВ ДЛЯ КРАЩОГО КОНТРОЛЮ CORS ***
const allowedOrigins = [
  "https://only-trable-final-frontend.vercel.app", // Frontend на Vercel
  "https://final-backend-odkb.onrender.com",     // ✅ ДОДАНО: Backend на Render (без порту) і запам'ятати, що в Environments НЕ ВКАЗУВАТИ ПОРТ. запит буде йти по замовчуванню 443(HTTPS)
  "http://localhost:5173", // Локальна розробка
];

const startServer = (): void => {
  const app: ExpressApplication = express();
  app.use(cookieParser());

  // ✅ ВИКОРИСТОВУЄМО CORS З ФУНКЦІЄЮ ПЕРЕВІРКИ
  app.use(
    cors({
      origin: (origin, callback) => {
        // Дозволяємо запити без Origin (наприклад, Postman, мобільні додатки або запити з того ж походження)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
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
  
  app.use("/health", healthRouter); 
  app.use("/api/posts", postsRouter); 
  app.use("/api/auth", authRouter); 
  app.use("/api/user", userRouter); 

  // ...
  
  // Обробка неіснуючих маршрутів (повинна бути в кінці)
  app.use(notFoundHandler);
  app.use(errorHandler);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

export default startServer;