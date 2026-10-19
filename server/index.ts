import {createApp} from "./shared/createApp.ts";
import {longPollingRouter} from "./long-polling/router.ts";
import {sseRouter} from "./server-sent-events/router.ts";
import {createWebSocketServer} from "./websocket/webSocketServer.ts";

const PORT = Number(process.env.PORT) || 3001;

// все три способа на одном порту: HTTP-маршруты — Express, /ws — ws на том же http.Server
const app = createApp({
    '/long-polling': longPollingRouter,
    '/sse': sseRouter,
});

// app.listen возвращает http.Server — к нему ws и подключается.
// В Express 5 колбэк вызывается и при ошибке (порт занят): без проверки — «started» и тихий выход
const server = app.listen(PORT, (error) => {
    if (error) throw error;
    console.log(`Server started on port ${PORT}`);
})

createWebSocketServer({server});
