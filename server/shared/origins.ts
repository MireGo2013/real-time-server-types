import type {RequestHandler} from 'express';
import cors from 'cors';

// адреса страниц клиента через запятую; по умолчанию — vite dev и vite preview.
// Открываете клиент по адресу в локальной сети — добавьте его: CLIENT_ORIGINS в .env
const DEFAULT_ORIGINS = 'http://localhost:5173,http://localhost:4173';

export const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS ?? DEFAULT_ORIGINS)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// Origin браузер ставит сам, и JS страницы его не подделает. Без Origin приходят не-браузерные
// клиенты (curl, Node): им заголовок подделать ничего не стоит, так что защищаться им бессмысленно
export const isAllowedOrigin = (origin: string | undefined) =>
    origin === undefined || CLIENT_ORIGINS.includes(origin);

// CORS только запрещает чужой странице читать ответ — сам запрос до сервера доходит.
// Поэтому чужой Origin отклоняем до маршрутов: висящий get-messages или /sse/connect не займёт слушателя
const rejectForeignOrigin: RequestHandler = (req, res, next) => {
    if (isAllowedOrigin(req.get('Origin'))) {
        next();
        return;
    }
    res.status(403).json({error: 'Origin not allowed'});
}

// вместо cors() без настроек, который отвечает Access-Control-Allow-Origin: * любому сайту
export const clientOriginOnly = [rejectForeignOrigin, cors({origin: CLIENT_ORIGINS, methods: ['GET', 'POST']})];
