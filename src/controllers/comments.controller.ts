// src/controllers/comments.controller.ts (ОНОВЛЕНО createComment)

import type { Request, Response, NextFunction } from "express";
import Post from "../db/models/Post.model.js";
import Comment from "../db/models/Comment.model.js";
import Notification from "../db/models/Notification.model.js";
import { Types } from "mongoose";
import HttpError from "../utils/HttpError.js";
import type { CreateCommentPayload } from "../schemas/comment.schemas.js";

interface PostParams {
  postId: string;
}

/**
 * 🚀 Створює новий коментар до посту.
 * POST /api/posts/:postId/comments
 */
export const createComment = async (
  req: Request<PostParams, {}, CreateCommentPayload>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;
    const { content } = req.body;
    // Примітка: imageUrl/imagePublicId очікується, що буде додано Multer/Cloudinary
    // У цьому спрощеному прикладі ми припускаємо, що вони будуть додані в req.file
    // і оброблені перед викликом цього контролера.
    // Якщо ви не використовуєте Multer, цей контролер не зможе приймати зображення.
    // Для чистоти коду, я залишаю лише текстовий контент.

    if (!userId) {
      return next(HttpError(401, "Not authenticated."));
    }

    const postObjectId = new Types.ObjectId(postId);
    const userObjectId = new Types.ObjectId(userId);

    // Створюємо об'єкт для нового коментаря, щоб уникнути передачі `undefined`
    const commentData: {
      post: Types.ObjectId;
      author: Types.ObjectId;
      content?: string;
    } = {
      post: postObjectId,
      author: userObjectId,
    };
    if (content) commentData.content = content;

    // 1. Створення нового коментаря
    const newComment = await Comment.create(commentData);

    // 2. Оновлення лічильника коментарів у пості
    const updatedPost = await Post.findByIdAndUpdate(
      postObjectId,
      { $inc: { commentsCount: 1 } },
      { new: true },
    );

    if (!updatedPost) {
      await newComment.deleteOne();
      return next(HttpError(404, "Post not found."));
    }

    // 3. 🔥 СТВОРЕННЯ СПОВІЩЕННЯ:
    // Якщо коментатор не є автором поста
    if (updatedPost.author.toString() !== userId) {
      await Notification.create({
        recipient: updatedPost.author,
        sender: userObjectId,
        type: "comment",
        post: postObjectId,
        comment: newComment._id,
      });
    }

    // 4. Повертаємо новий коментар
    const commentWithAuthor = await newComment.populate({
      path: "author",
      select: "_id username fullName avatarUrl",
    });

    res.status(201).json({
      message: "Comment successfully created.",
      comment: commentWithAuthor,
      commentsCount: updatedPost.commentsCount,
    });
  } catch (error) {
    next(error);
  }
};

// ... (Додайте тут функції getCommentsByPostId, deleteComment, якщо вони у вас є) ...
