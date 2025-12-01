// src/db/utils/schemaTransform.ts

// Типи Mongoose
import type { Document, ToObjectOptions } from 'mongoose';

/**
 * Функція трансформації, яка видаляє чутливі поля перед перетворенням в об'єкт/JSON.
 * @param doc - оригінальний документ Mongoose.
 * @param ret - об'єкт, який буде повернуто (з якого ми видаляємо поля).
 * @param options - опції Mongoose.
 */
export function transformUser(_doc: any, ret: any, _options: any) {
      // 'ret' (return object) - це об'єкт, який ми трансформуємо

    // 1. Видаляємо пароль
    delete ret.password;

    // 2. Якщо потрібно, видаляємо версію (V)
    delete ret.__v; 
    
    // 3. Також можна видалити токени, якщо вони не потрібні для відповіді.
    delete ret.accessToken;
    delete ret.refreshToken;
    
    return ret;
}