# Real-time чат — сервер

Сервер чата: long polling и Server-Sent Events на Express, WebSocket на `ws`. Все три способа работают на одном порту в общем сервере или каждый отдельно.

**Стек:** Node 24, Express 5, `ws` 8, `cors`, ESM, TypeScript 6 (запуск без сборки: Node 24 сам удаляет типы).

```bash
npm install
npm start           # общий сервер, node --watch, порт 3001 (или PORT)
npm run start:lp    # только long polling
npm run start:sse   # только SSE
npm run start:ws    # только WebSocket
npm run typecheck   # проверка типов: tsc
```

Все варианты слушают один порт — запускайте по очереди. Переменные окружения берутся из `.env`, если он есть (образец — `.env.example`):

| Переменная | По умолчанию | Что задаёт |
|---|---|---|
| `PORT` | `3001` | порт |
| `CLIENT_ORIGINS` | `http://localhost:5173,http://localhost:4173` | разрешённые адреса клиента через запятую |

## API

| Запрос | Ответ |
|---|---|
| `GET /long-polling/get-messages` | сразу `{ messages: [], cursor }` |
| `GET /long-polling/get-messages?since=N` | сообщения новее `N` — сразу; иначе ждать до 25 с, потом `204` |
| `POST /long-polling/new-messages` `{ message }` | `201` — сообщение с `id` |
| `GET /sse/connect` | поток `text/event-stream`: `id: <номер>`, `data: <сообщение>`; по `Last-Event-ID` досылает пропущенное, `: ping` раз в 15 с |
| `POST /sse/new-messages` `{ message }` | `201` — сообщение с `id` |
| `ws://…/ws` | клиент: `join { username, room }`, `message { text }`; сервер: `connection`, `message`, `disconnection` участникам комнаты |

Текст — от 1 до 1000 символов, имя — до 32, комната — до 32 букв, цифр, `-` и `_`. Неверные данные — `400` для HTTP; для WebSocket до входа — закрытие `1008`, после входа сообщение игнорируется. Ошибки — JSON `{ error }`. Чужой `Origin` — `403`.

## Структура

```
index.ts                  общий сервер: Express + ws на одном http.Server
long-polling/
├── router.ts             маршруты /long-polling: курсор, таймаут 204
└── server.ts             отдельный запуск
server-sent-events/
├── router.ts             маршруты /sse: поток событий, Last-Event-ID, heartbeat
└── server.ts             отдельный запуск
websocket/
├── webSocketServer.ts    протокол, комнаты, ping/pong
└── server.ts             отдельный запуск
shared/
├── createApp.ts          сборка Express-приложения, обработчик ошибок
├── origins.ts            CLIENT_ORIGINS, CORS, проверка Origin
├── messageHistory.ts     история сообщений с номерами
├── parse.ts              разбор номера и текста сообщения
└── limits.ts             лимиты длины, шаблон имени комнаты
types/                    ChatMessage, события WebSocket
```
