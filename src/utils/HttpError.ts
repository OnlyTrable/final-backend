// Визначаємо інтерфейс для нашого об'єкта помилки, щоб TypeScript знав про властивість 'status'
interface CustomHttpError extends Error {
    status: number;
}

const messageList: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict"
};

const HttpError = (status: number, message: string = messageList[status] || "An unknown error occurred"): CustomHttpError => {
    const error = new Error(message) as CustomHttpError;
    error.status = status;
    return error;
};

export default HttpError;