import express, {type ErrorRequestHandler, type Router} from 'express';
import {clientOriginOnly} from "./origins.ts";

// ошибка из middleware (битый JSON, слишком большое тело) или брошенная в обработчике.
// Без своего обработчика Express отвечает HTML-страницей со стеком и путями на диске
// (вне NODE_ENV=production), а клиент ждёт JSON, как во всех остальных ответах
const jsonErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
    // ответ уже начат (например, поток SSE) — дописать JSON нельзя, пусть Express оборвёт соединение
    if (res.headersSent) {
        next(err);
        return;
    }
    // ошибки body-parser приходят из http-errors: status — код, expose — можно ли показать message клиенту
    const status = typeof err?.status === 'number' ? err.status : 500;
    if (status >= 500) console.error(err);
    res.status(status).json({error: err?.expose ? err.message : 'Internal Server Error'});
}

// одно Express-приложение и для общего сервера, и для отдельных: { '/long-polling': longPollingRouter, ... }
export const createApp = (routes: Record<string, Router>) => {
    const app = express();
    // заголовок X-Powered-By: Express только сообщает, на чём сервер
    app.disable('x-powered-by');
    app.use(clientOriginOnly);
    for (const [path, router] of Object.entries(routes)) {
        app.use(path, router);
    }
    // обработчик ошибок — после маршрутов: Express передаёт ошибку следующему middleware с четырьмя параметрами
    app.use(jsonErrorHandler);
    return app;
}
