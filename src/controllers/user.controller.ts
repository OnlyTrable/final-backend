// src/controllers/user.controller.ts

import type { Request, Response, NextFunction } from "express";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import streamifier from "streamifier";
import User from "../db/models/User.model.js";
import type { UpdateProfilePayload } from "../schemas/user.schemas.js";
import HttpError from "../utils/HttpError.js";


/**
 * Отримує дані профілю аутентифікованого користувача.
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Ми впевнені, що req.userId існує завдяки authenticate middleware
    const userId = req.userId;

    // 1. Шукаємо користувача, але цього разу БЕЗ пароля та токенів
    const user = await User.findById(userId);

    if (!user) {
      // Теоретично, цього не повинно статися, якщо токен валідний і не відкликаний
      return res.status(404).json({ message: "User profile not found." });
    }

    // 2. Повертаємо дані профілю
    // user.toObject() автоматично видалить пароль, токени та __v (завдяки transformUser)
    const userResponse = user.toObject();

    res.status(200).json({
      message: "User profile retrieved successfully.",
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Оновлює аватар користувача, завантажуючи його на Cloudinary.
 */
export const updateAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.file) {
    return next(HttpError(400, "No file uploaded. Please select an image."));
  }

  const userId = req.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return next(HttpError(404, "User not found"));
    }

    // Допоміжна функція для завантаження буфера на Cloudinary
    const uploadToCloudinary = (buffer: Buffer): Promise<UploadApiResponse> => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "avatars",
            transformation: [
              {
                width: 150,
                height: 150,
                crop: "thumb",
                gravity: "face",
                radius: "max",
              },
            ],
          },
          (error, result: UploadApiResponse | undefined) => {
            if (result) {
              resolve(result);
            } else if (error) {
              reject(error);
            } else {
              reject(new Error("Cloudinary upload failed to return a result."));
            }
          },
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    // Завантажуємо новий аватар
    const uploadResult = await uploadToCloudinary(req.file.buffer);

    // Видаляємо старий аватар з Cloudinary, якщо він існує і не є дефолтним.
    // Дефолтний аватар "sample.jpg" не має public_id в нашій базі.
    if (
      user.avatarPublicId &&
      user.avatarUrl !==
        "https://res.cloudinary.com/demo/image/upload/w_150,h_150,c_thumb,g_face,r_max/sample.jpg"
    ) {
      await cloudinary.uploader.destroy(user.avatarPublicId);
    }

    // Оновлюємо дані користувача
    user.avatarUrl = uploadResult.secure_url;
    user.avatarPublicId = uploadResult.public_id;
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Avatar updated successfully",
      user: user.toObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Оновлює дані профілю аутентифікованого користувача.
 */
export const updateProfile = async (
  req: Request<{}, {}, UpdateProfilePayload>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId; // ID від мідлвару authenticate
    const updateData = req.body; // Дані для оновлення (валідовані Zod)

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    // ОНОВЛЕННЯ КОРИСТУВАЧА
    // Покладаємося на унікальний індекс в схемі для обробки дублікатів username.
    // Глобальний errorHandler перехопить помилку з кодом 11000 і поверне 409.
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData }, // $set оновлює лише ті поля, які присутні в updateData
      {
        new: true, // Повернути оновлений документ
        runValidators: true, // Запустити валідатори схеми Mongoose (наприклад, для max length)
      },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User profile not found." });
    }

    // Відповідь
    const userResponse = updatedUser.toObject();

    res.status(200).json({
      message: "User profile updated successfully.",
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};
