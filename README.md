# Real-time чат

Один и тот же чат на трёх способах доставки событий с сервера в браузер: долгий опрос (long polling), Server-Sent Events и WebSocket. WebSocket-версия дополнена комнатами.

**Стек:** React 19, TypeScript 6, react-router 8, Vite 8, SCSS-модули — клиент; Node 24, Express 5, `ws` 8, TypeScript 6 (запуск без сборки) — сервер.

## Возможности

- три вкладки — три способа связи с одним интерфейсом, их удобно сравнивать в двух окнах рядом;
- **long polling** с курсором: сообщения не теряются между запросами, таймаут ожидания — `204`;
- **SSE** с `id` событий: после обрыва `EventSource` переподключается, и сервер досылает пропущенное;
- **WebSocket** с комнатами: ссылку `/websocket/<комната>` можно отправить, участники видят вход и выход;
- переподключение WebSocket с нарастающей задержкой и строка статуса соединения;
- heartbeat ping/pong: пропавшие без закрытия клиенты отключаются за 30–60 с;
- проверка `Origin` для HTTP и WebSocket, проверка формы и длины всех входящих данных.

## Запуск

Два терминала:

```bash
cd server
npm install
npm start       # http://localhost:3001, WebSocket: ws://localhost:3001/ws
```

```bash
cd client
npm install
npm run dev     # http://localhost:5173
```

Откройте `http://localhost:5173` в двух окнах и пишите в одном: сообщения появятся в обоих.

С другого устройства в той же сети: `npm run dev -- --host` в `client`, адрес компьютера вместо `localhost` и этот же адрес в `CLIENT_ORIGINS` сервера (`server/.env`, образец — `server/.env.example`).

## Структура

```
client/      клиент: страницы трёх чатов, хуки подключения — подробнее в client/README.md
server/      сервер: общий и раздельный запуск каждого способа — подробнее в server/README.md
textbook.md  учебник по устройству приложения
```

## Материалы

[`textbook.md`](textbook.md) — учебник по приложению: long polling и курсор, формат `text/event-stream`, кадры и протокол WebSocket, heartbeat, переподключение, комнаты, Origin и CORS, проверка данных, диагностика.
