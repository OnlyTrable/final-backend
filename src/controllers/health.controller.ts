import type { Request, Response } from 'express';
import PostCounter from '../db/models/PostCounter.model.js'; // Шлях до вашої нової моделі

/**
 * @route GET /health/db
 * @description Перевірка стану з'єднання з MongoDB. 
 * Запускає "холодний старт" бази даних (якщо вона "спить").
 * @access Public
 */
export const checkDbHealth = async (req: Request, res: Response): Promise<Response> => {
  try {
    // 1. Надлегка операція: Пошук або підрахунок одного документа.
    // Це примушує Mongoose/MongoDB відновити з'єднання.
    const counter = await PostCounter.findOne({}); 

    if (counter === null) {
      // Якщо лічильника ще немає (перший запуск), створюємо його.
      // Ця операція також гарантує, що з'єднання працює.
      await PostCounter.create({ totalPosts: 0 });
    }

    // 2. Якщо операція успішна, повертаємо 200 OK.
    return res.status(200).json({ 
      status: 'OK', 
      dbActive: true,
      totalPosts: counter?.totalPosts || 0 // Необов'язково, але інформативно
    });

  } catch (error) {
    // 3. Якщо DB не прокинулася або є помилка з'єднання, повертаємо 503
    console.error('DB Health Check Failed:', error);
    return res.status(503).json({ 
      status: 'Service Unavailable', 
      dbActive: false,
      message: 'MongoDB connection is not ready or has failed.' 
    });
  }
};

// 💡 Не забудьте додати цей маршрут до вашого роутера Express:
// router.get('/health/db', checkDbHealth);