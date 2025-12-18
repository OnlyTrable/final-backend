// src/controllers/user.controller.ts

import type { Request, Response, NextFunction } from "express";
import mongoose from 'mongoose';
import User from "../db/models/User.model.js";
import type { UpdateProfilePayload } from "../schemas/user.schemas.js";
import HttpError from "../utils/HttpError.js";
import { uploadImageStream, deleteImage } from "../services/cloudinary.service.js";


/**
 * Отримує дані профілю аутентифікованого користувача.
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Отримуємо ID. Використовуємо оператор "!" або явну перевірку, 
    // оскільки authenticate гарантує наявність userId.
    const currentUserId = req.userId;
    const targetId = req.params.id || currentUserId;

    // Перевірка для TypeScript: якщо раптом ID відсутні — видаємо помилку
    if (!targetId || !currentUserId) {
        return res.status(401).json({ message: "User ID is required" });
    }

    const user = await User.findById(targetId);

    if (!user) {
      return res.status(404).json({ message: "User profile not found." });
    }

    const userResponse = user.toObject();

    // Тепер TS впевнений, що обидва значення існують
    const isOwner = targetId.toString() === currentUserId.toString();

    res.status(200).json({
      message: "User profile retrieved successfully.",
      user: userResponse,
      isOwner: isOwner
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

    // Опції для завантаження аватара
    const uploadOptions = {
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
    };

    // Завантажуємо новий аватар
    const uploadResult = await uploadImageStream(req.file.buffer, uploadOptions);

    // Видаляємо старий аватар з Cloudinary, якщо він існує і не є дефолтним.
    if (user.avatarPublicId) {
      await deleteImage(user.avatarPublicId);
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
 * Видаляє аватар користувача та встановлює зображення за замовчуванням.
 */
export const deleteAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return next(HttpError(404, "User not found"));
    }

    // Видаляємо старий аватар з Cloudinary, якщо він існує.
    if (user.avatarPublicId) {
      await deleteImage(user.avatarPublicId);
    }

    // Встановлюємо аватар за замовчуванням
    user.avatarUrl =
      "https://res.cloudinary.com/demo/image/upload/w_150,h_150,c_thumb,g_face,r_max/sample.jpg";
    user.avatarPublicId = null;

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Avatar deleted and reset to default.",
      user: user.toObject(),
    });
  } catch (error) {
    // Якщо виникає помилка при видаленні з Cloudinary, ми все одно можемо
    // спробувати оновити користувача, але краще залогувати помилку.
    console.error("Error deleting avatar from Cloudinary:", error);
    next(HttpError(500, "Could not delete avatar."));
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
/**
 * @route   GET /api/users/search
 * @desc    Пошук користувачів за username або email
 * @access  Private
 */
export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Отримуємо пошуковий запит 'q' з query-параметрів
        // і перетворюємо його на рядок для безпеки
        const searchQuery = req.query.q as string;
        const userId = req.userId; // Отримуємо ID поточного користувача

        // Якщо запит порожній або відсутній, повертаємо порожній масив
        if (!searchQuery || !searchQuery.trim()) {
            return res.json([]);
        }

        // Створюємо регулярний вираз для пошуку без урахування регістру
        const regex = new RegExp(searchQuery, 'i');

        // Створюємо базовий фільтр для пошуку
        const filter: any = {
            _id: { $ne: userId }, // Виключаємо поточного користувача
            $or: [{ username: { $regex: regex } }, { email: { $regex: regex } }],
        };

        // Шукаємо користувачів в базі даних
        const users = await User.find(filter)
        .limit(10) // Обмежуємо кількість результатів до 10
        .select('username avatarUrl'); // Вибираємо тільки потрібні поля (використовуємо avatarUrl, як в інших контролерах)

        // Логуємо знайденних користувачів в консоль бекенду
        console.log('Search Result (Users Found):', users);

        res.json(users);

    } catch (error) {
        next(error);
    }
};

/**
 * Перемикає стан підписки (Follow/Unfollow) між поточним та цільовим користувачем.
 */
export const toggleFollow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.userId; // Хто підписується
    const { id: targetUserId } = req.params; // На кого підписується

    if (!currentUserId || !targetUserId) {
      return res.status(401).json({ message: "User IDs are required." });
    }

    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: "You cannot follow yourself." });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Перевіряємо, чи вже є підписка (порівнюємо як рядки)
    const isFollowing = currentUser.following.some(
      (id: any) => id.toString() === targetUserId.toString()
    );

    if (isFollowing) {
      // --- UNFOLLOW ---
      // Видаляємо ID з масивів
      currentUser.following = currentUser.following.filter(
        (id: any) => id.toString() !== targetUserId.toString()
      );
      targetUser.followers = targetUser.followers.filter(
        (id: any) => id.toString() !== currentUserId.toString()
      );

      // Оновлюємо лічильники
      currentUser.followingCount = Math.max(0, currentUser.followingCount - 1);
      targetUser.followersCount = Math.max(0, targetUser.followersCount - 1);
    } else {
      // --- FOLLOW ---
      // Додаємо ID в масиви
      currentUser.following.push(targetUserId as any);
      targetUser.followers.push(currentUserId as any);

      // Збільшуємо лічильники
      currentUser.followingCount += 1;
      targetUser.followersCount += 1;
    }

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({
      message: isFollowing ? "Unfollowed successfully" : "Followed successfully",
      isFollowing: !isFollowing,
      followersCount: targetUser.followersCount, // Повертаємо для оновлення UI
    });
  } catch (error) {
    next(error);
  }
};