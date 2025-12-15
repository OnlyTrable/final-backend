// src/controllers/comments.controller.ts

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
    
    // 🔥 Зчитування даних зображення з req.file (після CloudinaryUpload)
    const file = req.file as any;
    const imageUrl: string | undefined = file?.path; 
    const imagePublicId: string | undefined = file?.filename;

    if (!userId) {
      return next(HttpError(401, "Not authenticated."));
    }

    const postObjectId = new Types.ObjectId(postId);
    const userObjectId = new Types.ObjectId(userId);

    // Створюємо об'єкт для нового коментаря
    const commentData: {
      post: Types.ObjectId;
      author: Types.ObjectId;
      content?: string;
      imageUrl?: string; // ✅ ДОДАНО
      imagePublicId?: string; // ✅ ДОДАНО
    } = {
      post: postObjectId,
      author: userObjectId,
    };
    
    // Ручна перевірка, щоб уникнути скарг ESLint/TypeScript
    if (content) commentData.content = content;
    if (imageUrl) commentData.imageUrl = imageUrl;
    if (imagePublicId) commentData.imagePublicId = imagePublicId;
    
    // ⚠️ Mongoose хук 'validate' вже повинен це робити, але додаємо додатковий захист
    if (!commentData.content && !commentData.imageUrl) {
        return next(HttpError(400, "A comment must contain either text content or an image."));
    }

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

    // 3. СТВОРЕННЯ СПОВІЩЕННЯ:
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
// ... (інші функції)