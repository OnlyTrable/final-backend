// src/db/hooks.ts

import { Schema, Query, Document } from 'mongoose'; // Додаємо Document для кращої типізації

// 🔥 1. Створюємо інтерфейс, який описує options, які ми змінюємо
interface QueryOptions {
    new?: boolean;
    runValidators?: boolean;
}

// 🔥 2. Створюємо CustomQuery, який розширює Query і додає options
// Тут ми використовуємо Document як загальний тип, оскільки Query повертає документ.
interface CustomQuery extends Query<any, Document> {
    options: QueryOptions;
}

// ... (handleSaveError залишається без змін)

export const setUpdateSettings: (next: (error?: any) => void) => void = function (this: CustomQuery, next) {
    // 🔥 Використовуємо наш новий тип CustomQuery для this
    this.options.new = true;
    this.options.runValidators = true;
    next();
};