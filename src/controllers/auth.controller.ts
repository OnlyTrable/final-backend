import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../db/models/User.model.js";
import type { RegisterPayload, LoginPayload } from "../schemas/auth.schemas.js";

import { generateTokens } from "../services/token.service.js";
import type { TokenPayload } from "../services/token.service.js";

const SALT_ROUNDS = 12;

export const register = async (
  req: Request<{}, {}, RegisterPayload>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password, username, fullName, website, about } = req.body;
    
    // Покладаємося на унікальні індекси в схемі для обробки дублікатів.
    // Глобальний errorHandler перехопить помилку з кодом 11000 і поверне 409.
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await User.create({
      email,
      username,
      fullName,
      password: hashedPassword,
      ...(website !== undefined && { website }),
      ...(about !== undefined && { about }),
    });

    const { password: _, ...userResponse } = newUser.toObject();

    res.status(201).json({
      message: "User successfully created and saved to DB.",
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request<{}, {}, LoginPayload>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { loginId, password } = req.body;

    // 1. Пошук користувача за email АБО username
    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { username: { $regex: new RegExp(`^${loginId}$`, "i") } },
      ],
    }).select("+password");

    // 2. Перевірка існування користувача та його пароля
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid login ID or password.",
      });
    }

    // 3. ГЕНЕРУВАННЯ РЕАЛЬНИХ ТОКЕНІВ
    const payload: TokenPayload = { userId: user._id.toString() };
    const { accessToken, refreshToken } = generateTokens(payload);

    // 4. Оновлення користувача в базі (зберігаємо токени)
    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    await user.save();

    // 5. Очищення об'єкта перед відправленням відповіді
    const userResponse = user.toObject();
    
    // =========================================================================
    // ✅ FIX: Умовне встановлення sameSite та secure для dev/prod
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // Запобігає доступу через JavaScript (захист від XSS)
      // Встановлюємо secure: true ЛИШЕ в продакшені (на HTTPS)
      secure: isProduction, 
      // SameSite: None вимагає secure: true. На HTTP localhost sameSite: undefined
      sameSite: isProduction ? "none" : undefined, 
      maxAge: 24 * 60 * 60 * 1000, // 1 день
    });
    // =========================================================================

    // 6. Успішна відповідь (200 OK)
    res.status(200).json({
      message: "Login successful!",
      token: accessToken,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId; // Отримуємо ID від мідлвару authenticate

    if (!userId) {
      // Ця перевірка є запобіжником, оскільки мідлвар authenticate мав спрацювати
      return res.status(401).json({ message: "Not authenticated." });
    }

    // 1. Знаходимо користувача та скидаємо його токени
    const user = await User.findByIdAndUpdate(
      userId,
      {
        accessToken: "", // Очищаємо accessToken
        refreshToken: "", // Очищаємо refreshToken
      },
      { new: true }, // Повертає оновлений документ
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 2. Очищаємо куку
    res.clearCookie('refreshToken');

    // 3. Успішна відповідь
    res.status(200).json({
      message: "Successfully logged out. Tokens have been revoked.",
    });
  } catch (error) {
    next(error);
  }
};

const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "your_refresh_secret";

/**
 * Оновлює Access Token за допомогою Refresh Token.
 */
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const clientRefreshToken = req.cookies.refreshToken;

  if (!clientRefreshToken) {
    return res
      .status(401)
      .json({ message: "Refresh Token is missing in cookies." });
  }

  try {
    // 1. Верифікація Refresh Token
    const decoded = jwt.verify(
      clientRefreshToken,
      REFRESH_TOKEN_SECRET,
    ) as TokenPayload;
    const userId = decoded.userId;

    // 2. Пошук користувача та перевірка, чи токен збігається з токеном у базі даних
    const user = await User.findById(userId).select("+refreshToken");

    if (!user || user.refreshToken !== clientRefreshToken) {
      // Токен недійсний, відкликаний або користувача не знайдено
      return res
        .status(403)
        .json({ message: "Invalid or expired Refresh Token." });
    }

    // 3. Генерування нової пари токенів
    const payload: TokenPayload = { userId: user._id.toString() };
    // 👇 ВИПРАВЛЕНО: Використовуємо 'accessToken' та 'refreshToken'
    const { accessToken, refreshToken } = generateTokens(payload); 

    // 4. Оновлення токенів у базі даних
    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    await user.save();

    // =========================================================================
    // ✅ FIX: Умовне встановлення sameSite та secure для dev/prod
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction, // Встановлюємо secure: true ЛИШЕ в продакшені (на HTTPS)
      sameSite: isProduction ? "none" : undefined, // SameSite: None вимагає secure: true. На HTTP localhost sameSite: undefined
      maxAge: 24 * 60 * 60 * 1000,
    });
    // =========================================================================

    const userResponse = user.toObject();
    // 5. Повернення нового Access Token клієнту
    res.status(200).json({
      message: "Tokens successfully refreshed.",
      token: accessToken,
      user: userResponse, // 👈 Додаємо дані користувача до відповіді
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res
        .status(403)
        .json({ message: "Invalid or expired Refresh Token." });
    }
    next(error);
  }
};