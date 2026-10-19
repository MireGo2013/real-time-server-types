# Real-time чат — клиент

Клиент чата на трёх способах связи с сервером: long polling, Server-Sent Events и WebSocket с комнатами.

**Стек:** Vite 8, React 19, TypeScript 6, react-router 8, SCSS-модули (`sass-embedded`), oxlint. HTTP — `fetch`, без сторонних клиентов.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # проверка типов + сборка в dist/
npm run lint      # oxlint
npm run preview   # собранная версия: http://localhost:4173
```

Сервер ожидается на `http://<адрес страницы>:3001` (`src/config.ts`).

## Маршруты

| Адрес | Страница |
|---|---|
| `/long-polling` | чат на долгом опросе |
| `/server-sent-events` | чат на `EventSource` |
| `/websocket` | выбор комнаты |
| `/websocket/<комната>` | вход по имени и чат комнаты |

Любой другой адрес перенаправляет на `/long-polling`.

## Структура

```
src/
├── api/          запросы и разбор ответов: longPolling, serverSentEvents, webSocket, messages
├── hooks/        подключение: useLongPolling, useServerSentEvents, useWebSocket
├── components/   MessageForm, MessageList, Tabs (+ *.module.scss рядом)
├── pages/        LongPollingPage, ServerSentEventsPage, WebSocketPage (+ WebSocketChat)
├── types/        ChatMessage, события WebSocket
├── utils/        guards: проверка формы данных из сети
├── styles/       variables.scss, global.scss
├── config.ts     адрес сервера, лимиты длины, шаблон имени комнаты
├── App.tsx       вкладки и маршруты
└── main.tsx
```
