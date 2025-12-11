import multer from 'multer';
import HttpError from '../utils/HttpError.js';

// Налаштовуємо сховище в пам'яті
const storage = multer.memoryStorage();

// Фільтр для перевірки типу файлу
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(HttpError(400, 'Not an image! Please upload only images.') as any, false);
  }
};

// Створюємо middleware для завантаження одного файлу
const upload = multer({ storage, fileFilter });

export default upload;
