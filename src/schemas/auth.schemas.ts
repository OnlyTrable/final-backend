import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, passwordRegexp } from './constants/auth.constants.js'; 

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required") 
    .email('Please enter a valid email address'), 
  
  username: z
    .string()
    .min(4, "Username must be at least 4 characters long")
    .max(30, "Username must be no longer than 30 characters."),

  fullName: z
    .string()
    .min(3, "Full name is required, minimum length 3 characters")
    .max(100, "Full Name must be no longer than 100 characters."),

  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must have at least ${PASSWORD_MIN_LENGTH} symbols`) 
    .regex(passwordRegexp, "Password must have at least 1 letter and 1 number"),
  
  website: z
    .string()
    .max(255)
    .optional(),

  about: z
    .string()
    .max(150)
    .optional(),
});

export type RegisterPayload = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
    // ЗМІНЕНО: тепер це може бути email АБО username
    loginId: z.string().min(1, "Email or Username is required"), 
    password: z.string().min(1, "Password is required"),
});

export type LoginPayload = z.infer<typeof loginSchema>;