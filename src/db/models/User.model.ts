// src/db/models/User.model.ts (ПОВНИЙ КОД)

import { Document, Schema, model } from "mongoose";
import { transformUser } from "../utils/schemaTransform.js";

// 🔥 Інтерфейс об'єкта, який зберігається в колекції
export interface UserDocument extends Document {
  email: string;
  password: string;
  username: string;
  fullName: string;
  website: string;
  about: string;
  role: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  commentsCount: number;
  accessToken: string;
  refreshToken: string;
  avatarUrl: string | null;
  avatarPublicId: string | null;
}

// 🔥 Схема Mongoose
const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // <-- Залишаємо ТІЛЬКИ тут
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true, // <-- Залишаємо ТІЛЬКИ тут
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, "Full Name is required"],
    },
    website: {
      type: String,
      trim: true,
      default: "", // Опціонально
    },
    about: {
      type: String,
      trim: true,
      maxlength: 150, // Обмеження 150 символів
      default: "",
    },
    avatarUrl: {
      type: String,
      required: false,
      default:
        "https://res.cloudinary.com/demo/image/upload/w_150,h_150,c_thumb,g_face,r_max/sample.jpg",
    },
    avatarPublicId: {
      type: String,
      required: false,
      default: "sample",
    },
    role: {
      type: String,
      enum: ["User", "Admin", "Moderator"], // Можливі ролі
      default: "User",
      required: true,
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    postsCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    accessToken: {
      type: String,
      default: "",
    },
    refreshToken: {
      type: String,
      default: "",
    },
  },
  {
    versionKey: false,
    timestamps: true,
    // 💡 ВИПРАВЛЕННЯ: Тепер використовуємо функцію transformUser
    toJSON: { virtuals: true, transform: transformUser },
    toObject: { virtuals: true, transform: transformUser },
  },
);

// 🔥 Створення та експорт Mongoose-моделі
const User = model<UserDocument>("User", userSchema);
export default User;
