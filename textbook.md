# Real-time чат: long polling, Server-Sent Events и WebSocket

Учебник о трёх способах, которыми сервер доставляет события в браузер без перезагрузки страницы. Один и тот же чат собирается трижды: на долгом опросе (long polling), на Server-Sent Events и на WebSocket, а потом WebSocket-версия получает комнаты. Клиент — React 19 и TypeScript, сервер — Node.js 24, Express 5 и `ws` 8.

---

## Как читать этот учебник

**Для кого.** Для разработчика, который знает JavaScript и основы TypeScript, писал компоненты на React и запускал Node.js. Учебник объясняет не только, что написать, но и почему это работает, где ломается и как это проверить.

**Как построены главы.** Главы идут в том порядке, в котором приложение собирается: сначала общий каркас клиента и сервера, потом три способа связи от простого к сложному, потом сквозные темы — безопасность и проверка данных. Многие темы разобраны циклом «наивный вариант → в чём его проблема → рабочий вариант». Наивный вариант — это не придуманная ошибка, а код, который часто пишут, впервые решая задачу.

**Врезки.**

- **На заметку** — полезное углубление, его можно пропустить без потери понимания.
- **Внимание** — частая ошибка или неочевидное поведение и симптом, по которому её узнать.
- **Важно** — правило, нарушение которого ломает код.
- **Под капотом** — устройство механизма: что делает браузер, Node.js или библиотека.

**Что значит «проверено».** Пометка *проверено* означает, что утверждение подтверждено запуском кода или сверено с исходным кодом установленных библиотек (`node_modules`). Версии на момент проверки перечислены в главе 0 и в части II.

**Код.** Код в главах совпадает с кодом проекта (`client/src`, `server`). Где глава показывает наивную или промежуточную версию, это сказано явно.

---

## Содержание

**Часть I. Учебник**

0. [Что строим и на чём](#глава-0-что-строим-и-на-чём)
1. [Как сервер сообщает о событиях](#глава-1-как-сервер-сообщает-о-событиях)
2. [Клиентский проект: Vite, React 19 и TypeScript](#глава-2-клиентский-проект-vite-react-19-и-typescript)
3. [Серверный проект: Express 5, TypeScript без сборки, один порт](#глава-3-серверный-проект-express-5-typescript-без-сборки-один-порт)
4. [Long polling: отложенный ответ и курсор](#глава-4-long-polling-отложенный-ответ-и-курсор)
5. [Server-Sent Events: один бесконечный ответ](#глава-5-server-sent-events-один-бесконечный-ответ)
6. [WebSocket на сервере: кадры, ошибки, протокол](#глава-6-websocket-на-сервере-кадры-ошибки-протокол)
7. [Heartbeat: ping, pong и мёртвые соединения](#глава-7-heartbeat-ping-pong-и-мёртвые-соединения)
8. [WebSocket на клиенте: хук, статус, переподключение](#глава-8-websocket-на-клиенте-хук-статус-переподключение)
9. [Комнаты](#глава-9-комнаты)
10. [Origin и CORS: кого пускать](#глава-10-origin-и-cors-кого-пускать)
11. [Типы и проверка данных](#глава-11-типы-и-проверка-данных)
12. [Проверка и диагностика](#глава-12-проверка-и-диагностика)
13. [Итоговая структура, ограничения и что дальше](#глава-13-итоговая-структура-ограничения-и-что-дальше)

**Часть II. Что проверено и источники**

- [Что проверено](#что-проверено)
- [Источники](#источники)

---

# Часть I. Учебник

## Глава 0. Что строим и на чём

**Цель главы:** увидеть приложение целиком до того, как разбирать части.

### 0.1. Приложение

Чат с тремя вкладками: «Long polling», «Server-Sent Events», «WebSocket». Внешне первые две одинаковы: поле ввода, кнопка «Отправить», список сообщений, новые сверху. Откройте вкладку в двух окнах, и сообщение из одного появится в другом. Различается только то, как сообщение доходит до второго окна.

Вкладка «WebSocket» богаче. Сначала пользователь выбирает комнату, адрес становится `/websocket/<комната>`, и эту ссылку можно отправить. Затем вводит имя. В чате видно, кто вошёл и кто вышел, а строка статуса показывает, есть ли связь с сервером. Если сервер перезапустится, клиент переподключится сам.

### 0.2. Архитектура

```
                            ┌─ Express ─┬─ /long-polling/*   long polling
Браузер ── http://…:3001 ───┤           └─ /sse/*            Server-Sent Events
                            └─ ws ────── /ws                 WebSocket (комнаты)
                                один процесс, один порт
```

Сервер один и слушает один порт. Обычные HTTP-запросы обрабатывает Express, запросы на установку WebSocket-соединения забирает библиотека `ws` (раздел 3.5). Каждый способ связи живёт в своём модуле и может работать и в общем сервере, и отдельно.

У каждого способа своя история сообщений в памяти процесса: сообщение, отправленное на вкладке long polling, не появится на вкладке SSE. Так их удобно сравнивать, не смешивая.

### 0.3. Стек и версии

| Часть | Технология | Версия |
|---|---|---|
| Сборка клиента | Vite | 8.3.4 |
| UI | React | 19.3.1 |
| Маршруты | react-router | 8.4.0 |
| Стили | SCSS-модули, sass-embedded | 1.105.2 |
| Линтер | oxlint | 1.88.0 |
| Язык | TypeScript (клиент и сервер) | 6.0.3 |
| Среда сервера | Node.js | 24.18.0 |
| HTTP-сервер | Express | 5.3.0 |
| WebSocket | ws | 8.22.0 |
| CORS | cors | 2.8.6 |

Клиент и сервер написаны на TypeScript в строгом режиме и используют модули ESM. Сервер запускается прямо из `.ts`-файлов, без сборки (раздел 3.1). Внешних зависимостей сверх таблицы нет: HTTP-запросы — `fetch`, отмена — `AbortController`, переменные окружения — флаг Node, перезапуск при изменениях — `node --watch`.

### 0.4. Карта проекта

```
client/src/
├── main.tsx                         StrictMode, глобальные стили
├── App.tsx                          вкладки и маршруты
├── config.ts                        адрес сервера, лимиты длины, шаблон имени комнаты
├── api/
│   ├── messages.ts                  POST сообщения (long polling и SSE)
│   ├── longPolling.ts               GET с курсором, проверка ответа
│   ├── serverSentEvents.ts          адрес потока, разбор события
│   └── webSocket.ts                 адрес сокета, разбор событий сервера
├── hooks/
│   ├── useLongPolling.ts            цикл опроса
│   ├── useServerSentEvents.ts       EventSource
│   └── useWebSocket.ts              сокет, статус, переподключение
├── components/
│   ├── MessageForm/                 форма ввода (+ .module.scss)
│   ├── MessageList/                 список сообщений
│   └── Tabs/                        вкладки
├── pages/
│   ├── LongPollingPage/
│   ├── ServerSentEventsPage/
│   └── WebSocketPage/               выбор комнаты, вход, WebSocketChat
├── types/                           message.ts, wsEvent.ts
├── utils/guards.ts                  isRecord, isChatMessage
└── styles/                          variables.scss, global.scss

server/
├── index.ts                         общий сервер: все три способа на одном порту
├── long-polling/                    router.ts, server.ts (отдельный запуск)
├── server-sent-events/              router.ts, server.ts
├── websocket/                       webSocketServer.ts, server.ts
├── shared/
│   ├── createApp.ts                 сборка Express-приложения, обработчик ошибок
│   ├── origins.ts                   CLIENT_ORIGINS, CORS, проверка Origin
│   ├── messageHistory.ts            история сообщений с номерами
│   ├── parse.ts                     разбор номера и текста сообщения
│   └── limits.ts                    лимиты длины, шаблон имени комнаты
├── types/                           message.ts, ws.ts
├── tsconfig.json
└── .env.example
```

Запуск — два терминала:

```bash
cd server && npm install && npm start      # Server started on port 3001
cd client && npm install && npm run dev    # http://localhost:5173
```

| Скрипт сервера | Что запускает |
|---|---|
| `npm start` | общий сервер `index.ts` |
| `npm run start:lp` | только long polling |
| `npm run start:sse` | только SSE |
| `npm run start:ws` | только WebSocket |
| `npm run typecheck` | проверка типов `tsc` |

Все варианты слушают порт 3001, поэтому одновременно работает либо общий сервер, либо один отдельный.

---

## Глава 1. Как сервер сообщает о событиях

**Цель главы:** понять, какие есть способы доставить событие с сервера в браузер и чем они платят.

HTTP устроен по схеме «запрос — ответ»: инициатор всегда клиент. Чтобы второе окно чата узнало о сообщении из первого, сервер должен сам отправить ему данные, а в схеме «запрос — ответ» такого шага нет. Все способы ниже обходят это ограничение по-разному.

### 1.1. Четыре способа

| Способ | Как работает | Направление | Плюсы | Цена |
|---|---|---|---|---|
| Короткий опрос (polling) | клиент спрашивает «есть новое?» раз в N секунд | клиент → сервер | просто | задержка до N секунд, пустые запросы |
| Долгий опрос (long polling) | сервер **держит запрос**, пока не появится событие или не выйдет таймаут; клиент сразу спрашивает снова | клиент → сервер, ответ отложен | обычный HTTP, работает везде | новый запрос на каждое событие, окно между запросами, таймауты прокси |
| Server-Sent Events (SSE) | один долгий HTTP-ответ `text/event-stream`, сервер дописывает в него события | сервер → клиент | встроенный в браузер `EventSource` с автопереподключением | только в одну сторону, только текст |
| WebSocket | HTTP-рукопожатие с `Upgrade`, дальше своё двунаправленное соединение поверх TCP | в обе стороны | минимальные накладные расходы, бинарные данные | свой протокол сообщений, переподключение и проверка «живости» — на вас |

Короткий опрос в учебнике не строится: это частный случай долгого с нулевым ожиданием. Остальные три — главы 4–9.

Таблицу удобно читать по столбцу «Цена». Чем ниже строка, тем меньше накладных расходов на каждое событие и тем больше работы перекладывается на ваш код. Long polling получает переподключение бесплатно, потому что каждый запрос новый. `EventSource` переподключается сам. У WebSocket обрыв соединения — ваша забота (глава 8).

### 1.2. Почему не «event sourcing»

Технологию из раздела «Server-Sent Events» иногда называют «event sourcing». Это ошибка в названии: event sourcing — способ **хранения** данных, при котором состояние системы — это журнал событий, а текущее состояние получается их воспроизведением. К доставке событий в браузер он отношения не имеет. Технология называется Server-Sent Events, браузерный API — `EventSource`.

> **На заметку** — есть и пятый способ, WebTransport поверх HTTP/3. Для чата он избыточен и требует HTTPS, поэтому дальше не рассматривается.

---
## Глава 2. Клиентский проект: Vite, React 19 и TypeScript

**Цель главы:** собрать каркас клиента, общий для всех трёх способов связи.

### 2.1. Создание проекта и версия TypeScript

```bash
npm create vite@latest client -- --template react-ts
cd client
npm install react-router sass-embedded
npm install -D typescript@~6.0.3
```

Шаблон `react-ts` даёт React 19, TypeScript и линтер oxlint. Из шаблона убраны демо-стили и картинки.

> **Внимание** — шаблон ставит TypeScript 7 (`~7.0.2`). Это нативный компилятор, переписанный на Go, и в пакете `typescript@7.0.2` есть только `tsc` и бинарник: файлов `lib/tsserver.js` и `lib/typescript.js` нет (*проверено*). Через `tsserver` IDE получают переход к определению, поиск использований и подсказки. Симптом: Ctrl+клик по компоненту в WebStorm никуда не ведёт, а `tsc` при этом проходит. Поэтому в проекте TypeScript 6.0.3, а в настройках IDE (Languages & Frameworks → TypeScript) указан путь `client/node_modules/typescript`.

В `tsconfig.app.json` шаблона нет `"strict": true`, но строгий режим включён: в TypeScript 6 `strict` по умолчанию `true`.

```ts
// файл без tsconfig, проверка: npx tsc --noEmit --ignoreConfig a.ts
export const f = (x) => x
// error TS7006: Parameter 'x' implicitly has an 'any' type.
```

`TS7006` — ошибка правила `noImplicitAny`, которое входит в `strict` (*проверено*).

### 2.2. Точка входа и StrictMode

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`StrictMode` в режиме разработки монтирует каждый компонент, сразу размонтирует и монтирует снова. Так React проверяет, что эффекты умеют за собой убирать. Для этого проекта это главный инструмент: у каждого способа связи есть долгоживущее соединение, и эффект, который его не закрывает, сразу выдаёт себя дублями сообщений. В продакшен-сборке двойного монтирования нет.

### 2.3. Адрес сервера и лимиты

```ts
// client/src/config.ts
// hostname страницы, а не localhost: с другого устройства в сети localhost — это само устройство
export const API_URL = `http://${location.hostname}:3001`

// как на сервере (server/shared/limits.ts): длиннее сервер не примет
export const MAX_USERNAME_LENGTH = 32
export const MAX_TEXT_LENGTH = 1000
```

`location.hostname` берётся из адреса, по которому открыта страница. Откройте клиент с телефона по `http://192.168.1.10:5173`, и запросы пойдут на `http://192.168.1.10:3001`, то есть на тот же компьютер. С `localhost` телефон обращался бы к самому себе.

Лимиты дублируются на сервере. Сервер проверяет их в любом случае (клиенту доверять нельзя), а клиент — чтобы пользователь не мог ввести то, что сервер отклонит. Шаблон имени комнаты из этого же файла разобран в разделе 9.2.

### 2.4. Общие компоненты: форма и список

Все три вкладки показывают одно и то же: форму и список. Компоненты общие, а страница только связывает хук своего способа связи с этими компонентами.

```ts
// client/src/types/message.ts
export type ChatMessage = {
  id: string
  message: string
}
```

```tsx
// client/src/components/MessageList/MessageList.tsx
const MessageList = ({ messages }: Props) => {
  return (
    <div className={styles.list}>
      {messages.map((msg) => (
        <div className={styles.message} key={msg.id}>
          {msg.message}
        </div>
      ))}
    </div>
  )
}
```

`key={msg.id}` требует, чтобы id были уникальны. Наивный вариант — `id: Date.now()` на клиенте: два клиента, отправившие сообщение в одну миллисекунду, получают одинаковый `key`, и React предупреждает о дубле. Поэтому id ставит сервер через `crypto.randomUUID()` (разделы 4.6 и 6.6).

Форма:

```tsx
// client/src/components/MessageForm/MessageForm.tsx
type Props = {
  // синхронная (WebSocket, вход) или асинхронная (fetch); исключение — поле не очищается
  onSend: (text: string) => void | Promise<void>
  placeholder?: string
  submitLabel?: string
  maxLength?: number
  // проверка браузером до onSubmit: не совпало — форма не отправится, браузер покажет title
  pattern?: string
  title?: string
  // отправлять некуда (например, нет соединения)
  disabled?: boolean
}

const MessageForm = ({
  onSend,
  placeholder = 'Сообщение',
  submitLabel = 'Отправить',
  maxLength,
  pattern,
  title,
  disabled = false,
}: Props) => {
  const [value, setValue] = useState('')
  // пока fetch ждёт ответа, повторный Enter отправил бы то же сообщение второй раз
  const [sending, setSending] = useState(false)

  const submitHandler = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const text = value.trim()
    if (!text || sending || disabled) return

    setSending(true)
    try {
      await onSend(text)
      setValue('')
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submitHandler}>
      {/* readOnly, а не disabled, на время отправки: disabled сбрасывает фокус, и после ответа
          пришлось бы снова щёлкать в поле */}
      <input
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        type="text"
        placeholder={placeholder}
        maxLength={maxLength}
        pattern={pattern}
        title={title}
        readOnly={sending}
        disabled={disabled}
      />
      <button className={styles.button} type="submit" disabled={disabled || sending}>
        {submitLabel}
      </button>
    </form>
  )
}
```

Решения:

- **`<form onSubmit>`, а не `onClick` у кнопки.** Отправка работает и по Enter, `preventDefault` отменяет перезагрузку страницы.
- **Поле очищается только после успешной отправки.** `onSend` бросил исключение — текст остаётся в поле, его можно отправить ещё раз.
- **`onSend` может быть синхронной.** Отправка в WebSocket — `socket.send()`, промиса там нет. `await` на не-промисе просто возвращает значение, поэтому одна форма обслуживает и `fetch`, и сокет, и экран входа.
- **`sending` против двойной отправки.** Пока `fetch` ждёт ответа, второй Enter отправил бы то же сообщение ещё раз. На время отправки кнопка `disabled`, а поле `readOnly`: `disabled` у поля снимает с него фокус.
- **`disabled` снаружи** — когда отправлять некуда, например нет связи с WebSocket-сервером (раздел 8.4).
- **`maxLength` и `pattern`** — проверка браузером до отправки. `maxLength` не даёт ввести лишнее, `pattern` не даёт отправить форму, пока поле не совпало с шаблоном (раздел 9.2).

### 2.5. Вкладки и маршруты

```tsx
// client/src/App.tsx
const App = () => {
  return (
    <BrowserRouter>
      <Tabs />
      <Routes>
        <Route path="/long-polling" element={<LongPollingPage />} />
        <Route path="/server-sent-events" element={<ServerSentEventsPage />} />
        {/* один маршрут с необязательной комнатой: при переходе между комнатами страница не
            перемонтируется и помнит имя */}
        <Route path="/websocket/:room?" element={<WebSocketPage />} />
        <Route path="*" element={<Navigate to="/long-polling" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

```tsx
// client/src/components/Tabs/Tabs.tsx
const TABS = [
  { to: '/long-polling', label: 'Long polling' },
  { to: '/server-sent-events', label: 'Server-Sent Events' },
  { to: '/websocket', label: 'WebSocket' },
]

const Tabs = () => {
  return (
    <nav className={styles.tabs}>
      {TABS.map(({ to, label }) => (
        // NavLink сам ставит aria-current="page" активной вкладке
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
```

`NavLink` — обычная ссылка `<a href>`, но переход идёт без перезагрузки страницы, а `className` может быть функцией от `isActive`. По умолчанию `NavLink` сравнивает начало пути, поэтому вкладка «WebSocket» активна и на `/websocket/<комната>`.

**Смена вкладки размонтирует страницу**, и срабатывает очистка её хука: long polling отменяет висящий запрос, SSE и WebSocket закрывают соединение. Поэтому на сервере одновременно открыто только соединение текущей вкладки. Обратная сторона: история сообщений хранится в состоянии страницы и после возврата на вкладку начинается заново.

---
## Глава 3. Серверный проект: Express 5, TypeScript без сборки, один порт

**Цель главы:** собрать каркас сервера, в который потом встанут три способа связи, и разобраться, как они уживаются на одном порту.

### 3.1. Проект и запуск из `.ts`

```bash
mkdir server && cd server
npm init -y
npm install express cors ws
npm install -D typescript@~6.0.3 @types/node@^24 @types/express @types/cors @types/ws
```

В `package.json` — `"type": "module"` (ESM) и скрипты:

```json
"scripts": {
  "start": "node --env-file-if-exists=.env --watch ./index.ts",
  "start:lp": "node --env-file-if-exists=.env --watch ./long-polling/server.ts",
  "start:sse": "node --env-file-if-exists=.env --watch ./server-sent-events/server.ts",
  "start:ws": "node --env-file-if-exists=.env --watch ./websocket/server.ts",
  "typecheck": "tsc"
}
```

Три флага Node заменяют три пакета:

- **Запуск `.ts` без сборки.** Node 24 сам удаляет аннотации типов при загрузке файла (type stripping). `tsc` в проекте только проверяет типы и ничего не пишет на диск.
- **`--watch`** перезапускает процесс при изменении файлов, вместо `nodemon`.
- **`--env-file-if-exists=.env`** загружает переменные из `server/.env`, если файл есть, вместо `dotenv`. Если файла нет, Node печатает `.env not found. Continuing without it.` и работает дальше (*проверено*).

Type stripping накладывает ограничения на код, и `tsconfig.json` их проверяет:

```json
{
  "compilerOptions": {
    "target": "es2024",
    "lib": ["ES2024"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["**/*.ts"]
}
```

| Опция | Почему |
|---|---|
| `erasableSyntaxOnly` | Node умеет только стирать типы. `enum`, `namespace` и параметры-свойства конструктора порождают код, их стереть нельзя — запрещены |
| `verbatimModuleSyntax` | импорт только типа обязан быть `import type`. Иначе Node попытается загрузить модуль, в котором после стирания типов ничего нет |
| `allowImportingTsExtensions` | Node ищет файл по пути буквально, поэтому импорт пишется с расширением: `"../types/message.ts"` |
| `noEmit` | `tsc` только проверяет |
| `noUnusedParameters` | неиспользуемый параметр — ошибка. Если параметр нужен по позиции (`(_req, res) => ...`), подчёркивание в начале имени снимает проверку |

### 3.2. Сборка приложения и обработчик ошибок

Наивный вариант — `express()`, `cors()`, маршруты, и больше ничего. Отправьте ему битый JSON:

```js
await fetch('http://localhost:3001/sse/new-messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{oops',
})
// 400 text/html; charset=utf-8
// <pre>SyntaxError: Expected property name or '}' in JSON at position 1 ...
//     at parse (D:\...\server\node_modules\body-parser\...)
```

Это стандартный обработчик ошибок Express. Вне `NODE_ENV=production` он отвечает HTML-страницей со стеком вызовов и абсолютными путями на диске (*проверено*). Клиент ждёт JSON, а получает HTML, и попутно наружу уходит структура папок сервера. В тех же ответах есть заголовок `X-Powered-By: Express` (*проверено*), который только сообщает, на чём написан сервер.

Рабочий вариант — одна функция сборки для всех серверов:

```ts
// server/shared/createApp.ts
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

export const createApp = (routes: Record<string, Router>) => {
    const app = express();
    app.disable('x-powered-by');
    app.use(clientOriginOnly);
    for (const [path, router] of Object.entries(routes)) {
        app.use(path, router);
    }
    // обработчик ошибок — после маршрутов: Express передаёт ошибку следующему middleware с четырьмя параметрами
    app.use(jsonErrorHandler);
    return app;
}
```

Обработчик ошибок в Express — middleware с **четырьмя** параметрами `(err, req, res, next)`. Express узнаёт его по числу параметров и передаёт ему ошибку из любого предыдущего middleware или маршрута, поэтому он подключается последним. Ошибки разбора тела создаются пакетом `http-errors`: `status` — HTTP-код, а `expose` у ошибок 4xx равен `true`, то есть их `message` можно показать клиенту. Ошибки 5xx логируются, а клиент видит только `Internal Server Error`.

Результат (*проверено*):

| Запрос | Ответ |
|---|---|
| битый JSON | `400 {"error":"Expected property name or '}' in JSON at position 1 ..."}` |
| тело 200 КБ (лимит `json()` по умолчанию — 100 КБ) | `413 {"error":"request entity too large"}` |
| любой ответ | без `X-Powered-By` |

`clientOriginOnly` — проверка источника запроса, разобрана в главе 10.

### 3.3. `app.listen` в Express 5: ошибка приходит в колбэк

Все варианты сервера слушают порт 3001. Запустите два сразу, и второй получит `EADDRINUSE`. Наивный вариант колбэка:

```ts
app.listen(PORT, () => {
    console.log(`Long polling server started on port ${PORT}`);
})
// Long polling server started on port 3001
// (процесс завершился с кодом 0)
```

Сервер сообщил, что запустился, и тихо завершился (*проверено*). Причина — в исходном коде Express 5:

```js
// node_modules/express/lib/application.js
app.listen = function listen() {
  var server = http.createServer(this)
  var args = slice.call(arguments)
  if (typeof args[args.length - 1] === 'function') {
    var done = args[args.length - 1] = once(args[args.length - 1])
    server.once('error', done)
  }
  return server.listen.apply(server, args)
}
```

Колбэк подписан и на `listening`, и на `error`: при ошибке он вызывается с ней в первом аргументе. Ошибка считается обработанной, процессу больше нечего делать, и он выходит. Тип в `@types/express` 5 это отражает: `callback?: (error?: Error) => void`.

Рабочий вариант:

```ts
app.listen(PORT, (error) => {
    if (error) throw error;
    console.log(`Long polling server started on port ${PORT}`);
})
// Error: listen EADDRINUSE: address already in use :::3001
// (код выхода 1)
```

> **Внимание** — в общем сервере симптом другой: после ложного «started» процесс всё-таки падает с `EADDRINUSE`. Это `ws` перевыбрасывает ошибку своего `http.Server` как событие `error` на `WebSocketServer`, а у того нет слушателя (*проверено*). В Express 4 колбэк был только слушателем `listening`, и при ошибке процесс падал сразу.

### 3.4. Модуль на способ связи, общий и раздельный запуск

Каждый способ связи — модуль, который не знает, как его запускают:

| Модуль | Экспорт |
|---|---|
| `long-polling/router.ts` | `longPollingRouter` — Express `Router` |
| `server-sent-events/router.ts` | `sseRouter` — Express `Router` |
| `websocket/webSocketServer.ts` | `createWebSocketServer({ port } \| { server })` |

Отдельный сервер подключает один модуль:

```ts
// server/long-polling/server.ts
const app = createApp({'/long-polling': longPollingRouter});

app.listen(PORT, (error) => {
    if (error) throw error;
    console.log(`Long polling server started on port ${PORT}`);
})
```

Общий — все три:

```ts
// server/index.ts
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
```

**Префиксы маршрутов обязательны.** У long polling и SSE есть одинаковый маршрут `POST /new-messages`. На одном сервере без префиксов второй никогда бы не сработал: Express отдаёт запрос первому подходящему маршруту. С префиксами адреса такие: `/long-polling/get-messages`, `/long-polling/new-messages`, `/sse/connect`, `/sse/new-messages`, WebSocket — `/ws`. Отдельные серверы монтируют роутер с тем же префиксом, поэтому клиенту всё равно, какой вариант запущен.

У каждого роутера свой `EventEmitter` и своя история на уровне модуля. Сообщение, отправленное в `/sse/new-messages`, не попадёт в висящий `/long-polling/get-messages` (*проверено*).

### 3.5. Один порт — один сервер

На порту 3001 не три сервера, а один процесс и один `http.Server`. Порт может слушать только один сокет, второй `listen` на тот же порт даёт `EADDRINUSE`. Три способа связи — три обработчика внутри одного сервера.

`http.Server` — это `EventEmitter`. На обычный HTTP-запрос он генерирует событие `request`, а на запрос с заголовком `Upgrade: websocket` — событие `upgrade`:

```ts
const app = express()
console.log(typeof app)                        // function
const server = app.listen(3001)
console.log(server.listenerCount('request'))   // 1 — это app
console.log(server.listenerCount('upgrade'))   // 0

createWebSocketServer({ server })
console.log(server.listenerCount('upgrade'))   // 1 — это ws
```

Вывод *проверен*. `app` в Express — просто функция `(req, res) => ...`, и `app.listen(PORT)` — это `http.createServer(app).listen(PORT)`. `new WebSocketServer({ server })` своего порта не открывает, а подписывается на `upgrade` того же сервера и забирает рукопожатия на `/ws`. После ответа `101 Switching Protocols` это TCP-соединение уже не HTTP, и в Express оно не попадает.

```
порт 3001 → один http.Server
              ├─ 'request' → Express ─┬─ /long-polling/* → longPollingRouter
              │                       └─ /sse/*          → sseRouter
              └─ 'upgrade' → ws ──────── /ws             → WebSocket-соединения
```

> **Под капотом** — long polling и SSE на уровне протокола ничем не отличаются от любого HTTP-запроса. Разница только в пути и в том, сколько живёт ответ: у long polling — до первого сообщения, у SSE — пока клиент не уйдёт. Свой механизм есть только у WebSocket, и то лишь на этапе рукопожатия (RFC 6455, раздел 4).

Отдельный WebSocket-сервер (`npm run start:ws`) Express не использует: `ws` с опцией `{ port }` сам создаёт внутри себя `http.Server`. На обычный запрос без `Upgrade` он отвечает `426 Upgrade Required`, а общий сервер на `GET /ws` отвечает `404` от Express (*проверено*).

---
## Глава 4. Long polling: отложенный ответ и курсор

**Цель главы:** построить долгий опрос, который не теряет сообщения и не оставляет за собой подписок.

### 4.1. Отложенный ответ

Express не обязан отвечать синхронно, внутри обработчика: объект `res` можно сохранить и ответить позже. Пока ответа нет, запрос висит, а TCP-соединение занято. На этом и построен долгий опрос.

Кто-то должен сообщить висящему запросу, что пришло сообщение. Для этого подходит `EventEmitter` из Node — синхронный список подписчиков в памяти процесса. `emit` вызывает подписчиков по порядку в том же тике, `once` снимает подписку после первого вызова, `on` — нет.

Наивный вариант:

```js
const emitter = new EventEmitter()

app.get('/get-messages', (req, res) => {
  emitter.once('newMessage', (message) => res.json(message))
})

app.post('/new-messages', (req, res) => {
  emitter.emit('newMessage', req.body)
  res.status(200)
})
```

Первая проблема видна сразу: `POST` висит. `res.status(200)` только записывает код ответа и ничего не отправляет. Ответ уходит при `send`, `json`, `end` или `sendStatus`. Получатель сообщение получил, а отправитель ждёт ответа до таймаута, и во вкладке Network запрос остаётся `pending` (*проверено*). Исправление — `res.status(201).json(message)`: 201 Created и созданное сообщение в теле.

### 4.2. Подписка, которую некому снять

Вторая проблема не видна, пока клиенты не начнут уходить. Клиент открыл `GET`, подписался через `once` и закрыл вкладку, не дождавшись сообщения. Подписка осталась: `once` снимает её только после вызова.

```js
// 3 клиента подключились и ушли, не дождавшись сообщения
console.log(emitter.listenerCount('newMessage')) // 3
```

При следующем `emit` три обработчика вызывают `res.json` на ответах, соединения которых уже закрыты (`res.destroyed === true`): работа впустую (*проверено*). Каждое переподключение добавляет ещё одного. С одиннадцатым слушателем Node печатает `MaxListenersExceededWarning: Possible EventEmitter memory leak detected` (*проверено*).

Рабочий вариант — снять подписку, когда соединение закрылось:

```js
app.get('/get-messages', (req, res) => {
  const onMessage = (message) => res.json(message)
  emitter.once('newMessage', onMessage)
  res.on('close', () => {
    emitter.off('newMessage', onMessage)
  })
})
// 3 клиента подключились и ушли → listenerCount('newMessage') === 0
```

- **`res.on` — та же подписка, что `emitter.on`.** `res` в Express — это `http.ServerResponse`, цепочка его прототипов: `ServerResponse → OutgoingMessage → Stream → EventEmitter`, и `res.on === EventEmitter.prototype.on` (*проверено*). События `close`, `finish`, `error` генерирует сам Node.
- **`close` срабатывает при любом исходе**: клиент оборвал запрос (закрыл вкладку, отменил `fetch`, пропала сеть) или мы сами ответили. Во втором случае `once` уже снял подписку, и `off` ничего не делает — повторное снятие безопасно.
- **Обработчик сохранён в переменную.** `off` снимает подписку по ссылке на функцию: анонимную стрелку, переданную прямо в `once`, снять нечем.

> **Важно** — у любого долгоживущего ответа должна быть пара «подписался — отписался по `close`». Это правило повторится в SSE (раздел 5.3) и в WebSocket (раздел 6.7).

### 4.3. Клиент: цикл, отмена и StrictMode

Наивный клиент — функция, которая вызывает сама себя:

```js
const subscribe = async () => {
  try {
    const { data } = await axios.get('/get-messages')
    setMessages((prev) => [data, ...prev])
    await subscribe()
  } catch (e) {
    setTimeout(subscribe, 500)
  }
}

useEffect(() => {
  subscribe()
}, [])
```

Проблем две:

- **Рекурсия через `await`.** Промис каждого вызова ждёт завершения следующего, и цепочка незавершённых промисов растёт с каждым сообщением.
- **Эффект без очистки.** В `StrictMode` компонент монтируется дважды, и запускаются два цикла опроса. Каждое сообщение приходит дважды, React предупреждает о дублирующемся `key`. После ухода со страницы опрос продолжается.

Рабочий вариант — цикл и `AbortController`:

```ts
useEffect(() => {
  const controller = new AbortController()
  const { signal } = controller

  const poll = async () => {
    while (!signal.aborted) {
      try {
        const message = await getMessage(signal)
        setMessages((prev) => [message, ...prev])
      } catch (e) {
        if (signal.aborted) return
        console.error(e)
        await wait(RETRY_DELAY)
      }
    }
  }

  void poll()

  // abort() обрывает висящий запрос: на сервере срабатывает res.on('close')
  return () => controller.abort()
}, [])
```

Это промежуточная версия, итоговая с курсором — в разделе 4.7.

- **`while` держит ровно один ожидающий запрос.** Ответ пришёл — следующая итерация отправляет новый.
- **`controller.abort()` в очистке** обрывает висящий `fetch`: он отклоняется с `AbortError`, а на сервере срабатывает `res.on('close')` и снимает подписку.
- **Ошибка ≠ отмена.** В `catch` сначала проверяется `signal.aborted`: отмена — нормальное завершение, её не логируют и не повторяют. Остальные ошибки (сервер не запущен, ответ не 2xx) — лог и повтор через 500 мс. Повтор — следующая итерация того же цикла, а не новый вызов `poll`: `try/catch` стоит внутри `while` (*проверено* скриптом с подменённым `getMessage`: две ошибки → два сообщения → выход по `abort`).
- **`fetch` вместо axios.** `fetch` не бросает исключение на HTTP-ошибку, поэтому `res.ok` проверяется явно (раздел 4.7). Взамен он из коробки принимает `signal`.

`void poll()` нужен потому, что функция эффекта не может быть `async`: она должна вернуть функцию очистки, а не промис. Оператор `void` вычисляет выражение и возвращает `undefined`. Здесь он помечает: промис запущен намеренно и не ожидается.

> **Внимание** — `void` не защищает от ошибок. `void f()`, где асинхронная `f` бросает исключение, — это необработанное отклонение промиса, и Node завершает процесс с кодом 1 (*проверено*). В `poll` это безопасно только потому, что все ошибки ловит `try/catch` внутри цикла.

Во вкладке Network при открытии страницы виден один запрос `(canceled)` и сразу за ним новый. Это `StrictMode`: первое монтирование отменило свой запрос в очистке. Если бы очистки не было, отмены бы не было, зато висели бы два запроса. Правильная картина — один отменённый при открытии и дальше один висящий.

### 4.4. Окно между запросами

Сервер из раздела 4.2 отвечает «следующим сообщением» и ничего не помнит. Посмотрим, что происходит, когда два сообщения приходят почти одновременно:

```
клиент                         сервер
GET  ─────────────────────────→ подписался
                                POST A → emit → ответ клиенту, подписки нет
     ←───────────── A ──────────
                                POST B → emit → слушателей нет, B потеряно
GET  ─────────────────────────→ подписался (B уже не придёт)
```

Между ответом и следующим запросом клиент не подписан ни на что, и сообщение, пришедшее в это окно, теряется (*проверено*: из двух одновременных `POST` второй не доходит). Это не ошибка реализации, а свойство протокола «ответь следующим событием». Сервер не может отличить «клиент уже видел» от «клиент пропустил», пока клиент сам не скажет, что видел последним.

Рабочий вариант меняет протокол — вводит **курсор**:

| Запрос | Ответ |
|---|---|
| `GET /long-polling/get-messages` (без `since`) | сразу `200 { messages: [], cursor }` — узнать текущий курсор |
| `GET /long-polling/get-messages?since=N` | есть сообщения с номером больше `N` → сразу `200 { messages, cursor }`; нет → ждать до 25 с, потом `204` |
| `POST /long-polling/new-messages { message }` | `201` и сообщение с `id` от сервера; пустое или длиннее 1000 символов → `400` |

Сервер нумерует сообщения по порядку (`seq`) и хранит последние 100. Клиент передаёт номер последнего полученного, и если за время окна что-то пришло, сервер отдаёт это сразу. Первый запрос без `since` возвращается мгновенно с текущим курсором. Истории при входе нет: как и в SSE и WebSocket, клиент видит сообщения с момента подключения.

### 4.5. История сообщений

История нужна и long polling, и SSE (раздел 5.4), поэтому она вынесена в общий модуль:

```ts
// server/shared/messageHistory.ts
export type StoredMessage = { seq: number; message: ChatMessage };

export const createMessageHistory = (size = 100) => {
    const items: StoredMessage[] = [];
    let lastSeq = 0;

    return {
        get lastSeq() {
            return lastSeq;
        },

        // id ставит сервер: у клиентов он мог совпасть, а чужому id нельзя доверять
        add(text: string): StoredMessage {
            const stored = {seq: ++lastSeq, message: {id: randomUUID(), message: text}};
            items.push(stored);
            if (items.length > size) items.shift();
            return stored;
        },

        // курсор из будущего: сервер перезапустился и нумерация началась заново —
        // всё, что есть в истории, клиент ещё не видел
        after(since: number) {
            const from = since > lastSeq ? 0 : since;
            return items.filter((m) => m.seq > from);
        },
    }
}
```

- **Фабрика, а не модуль с состоянием.** У long polling и SSE своя история, сообщения не смешиваются.
- **Курсор из будущего.** История живёт в памяти, и после перезапуска сервера нумерация начинается с нуля, а у клиента остался `since=50`. Без проверки клиент ждал бы, пока `seq` дорастёт до 50, и пропустил бы всё до этого. Поэтому `since > lastSeq` означает «отдать всю историю» (*проверено*: `since=999` → вся история).
- **Переполнение.** Клиент, отставший больше чем на 100 сообщений, вытесненных не получит. Для чата в памяти это приемлемо.

Разбор входных данных — тоже общий:

```ts
// server/shared/parse.ts
// номер сообщения из строки запроса или заголовка: только целое ≥ 0, иначе null
export const parseSeq = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
    const seq = Number(value);
    return Number.isSafeInteger(seq) ? seq : null;
}

// req.body — any и может быть undefined (нет Content-Type: application/json): проверяем сами
export const parseMessageText = (body: unknown) => {
    if (typeof body !== 'object' || body === null || !('message' in body)) return null;
    if (typeof body.message !== 'string') return null;
    const text = body.message.trim();
    return text.length > 0 && text.length <= MAX_TEXT_LENGTH ? text : null;
}
```

`^\d+$` отсекает `-1`, `1.5`, `abc` и пустую строку, а `isSafeInteger` — числа длиннее 2⁵³, которые `Number` округлил бы. `?since=1&since=2` в Express 5 приходит массивом `["1","2"]` и тоже отсекается проверкой `typeof` — ответ `400` (*проверено*).

### 4.6. Итоговый роутер

```ts
// server/long-polling/router.ts
// меньше типичного таймаута прокси и балансировщиков (30–60 с): отвечаем 204 раньше, чем нас оборвут
const POLL_TIMEOUT = 25_000;

const history = createMessageHistory();

// событие без данных: «появилось новое», ответ ожидающие собирают из history сами
const emitter = new EventEmitter<{ newMessage: [] }>();
// каждый висящий запрос — слушатель; без этого на 11-м MaxListenersExceededWarning
emitter.setMaxListeners(0);

export const longPollingRouter = Router();
longPollingRouter.use(json());

longPollingRouter.get('/get-messages', (req, res) => {
    if (req.query.since === undefined) {
        res.json({messages: [], cursor: history.lastSeq});
        return;
    }
    const since = parseSeq(req.query.since);
    if (since === null) {
        res.status(400).json({error: 'since must be a non-negative integer'});
        return;
    }

    const reply = () => res.json({
        messages: history.after(since).map((m) => m.message),
        cursor: history.lastSeq,
    });

    // новое появилось, пока клиент обрабатывал прошлый ответ, — отвечаем сразу, ничего не теряется
    if (history.after(since).length > 0) {
        reply();
        return;
    }

    const cleanup = () => {
        clearTimeout(timer);
        emitter.off('newMessage', onMessage);
    }
    const onMessage = () => {
        cleanup();
        reply();
    }
    // ничего не пришло — 204 No Content, клиент сразу переспрашивает с тем же since
    const timer = setTimeout(() => {
        cleanup();
        res.status(204).end();
    }, POLL_TIMEOUT);

    emitter.on('newMessage', onMessage);
    // клиент ушёл (abort, закрыл вкладку): снять и подписку, и таймер
    res.on('close', cleanup);
})

longPollingRouter.post('/new-messages', (req, res) => {
    const text = parseMessageText(req.body);
    if (text === null) {
        res.status(400).json({error: INVALID_TEXT_ERROR});
        return;
    }

    const {message} = history.add(text);
    emitter.emit("newMessage");
    res.status(201).json(message);
})
```

- **Событие без данных.** `newMessage` теперь значит «появилось новое», а ответ собирается из истории. Поэтому один и тот же `reply` отвечает и сразу, и после ожидания.
- **Таймаут 25 с → `204 No Content`.** Прокси и балансировщики обрывают ответ, по которому долго не идут данные, часто через 30–60 с, и клиент получает ошибку. Сервер отвечает раньше сам, клиент переспрашивает с тем же курсором (*проверено*: без сообщений — `204` через 25 с).
- **`cleanup` при любом исходе**: ответ, таймаут или уход клиента. Он вызывается и после собственного ответа, потому что `close` срабатывает и тогда. Повторный `clearTimeout` и `off` на уже снятом ничего не делают.
- **`setMaxListeners(0)`.** У `EventEmitter` предел по умолчанию — 10 слушателей на событие. Это эвристика против забытых отписок, а здесь много слушателей — норма (один на висящий запрос), и отписка есть.
- **`res.json(...); return;` двумя операторами** — выбор стиля. Обработчик в `@types/express` 5 возвращает `unknown`, и `return res.json(...)` тоже компилируется (*проверено*). Раздельная запись показывает, что значение `res.json` никому не нужно.

*Проверено*: первый `GET` → `{"messages":[],"cursor":0}`; два одновременных `POST` → клиент получил оба; `id` от сервера (присланный клиентом игнорируется); `400` на пустое сообщение, 1001 символ, отсутствие тела, число вместо строки, `since=abc`, `-1`, `1.5`; после 105 сообщений в истории 100.

### 4.7. Итоговый клиент

```ts
// client/src/api/longPolling.ts
const BASE_URL = `${API_URL}/long-polling`

export type PollResult = {
  messages: ChatMessage[]
  cursor: number
}

const isPollResult = (value: unknown): value is PollResult =>
  isRecord(value) &&
  Array.isArray(value.messages) &&
  value.messages.every(isChatMessage) &&
  Number.isSafeInteger(value.cursor)

export const getMessages = async (since: number | null, signal: AbortSignal) => {
  const query = since === null ? '' : `?since=${since}`
  const res = await fetch(`${BASE_URL}/get-messages${query}`, { signal })
  // 204 — таймаут ожидания, новых сообщений нет
  if (res.status === 204) return null
  if (!res.ok) throw new Error(`Не удалось получить сообщения: HTTP ${res.status}`)

  const body: unknown = await res.json()
  if (!isPollResult(body)) throw new Error('Неожиданный ответ сервера')
  return body
}

export const sendMessage = (text: string) => postChatMessage(`${BASE_URL}/new-messages`, text)
```

```ts
// client/src/api/messages.ts
// у long polling и SSE отправка одинаковая, отличается только адрес: /long-polling/... или /sse/...
// id не отправляем: его ставит сервер
export const postChatMessage = async (url: string, text: string) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  })
  if (!res.ok) throw new Error(`Не удалось отправить сообщение: HTTP ${res.status}`)
}
```

```ts
// client/src/hooks/useLongPolling.ts
useEffect(() => {
  const controller = new AbortController()
  const { signal } = controller
  // курсор живёт в замыкании эффекта: у каждого монтирования свой, StrictMode их не смешивает
  let cursor: number | null = null

  const poll = async () => {
    while (!signal.aborted) {
      try {
        const result = await getMessages(cursor, signal)
        // null — таймаут: переспрашиваем с тем же курсором
        if (!result) continue

        cursor = result.cursor
        // сервер отдаёт от старых к новым, список показывает новые сверху
        if (result.messages.length > 0) {
          setMessages((prev) => [...result.messages.toReversed(), ...prev])
        }
      } catch (e) {
        if (signal.aborted) return
        console.error(e)
        await wait(RETRY_DELAY)
      }
    }
  }

  void poll()

  return () => controller.abort()
}, [])
```

- **Ответ проверяется, а не приводится.** `as PollResult` только обещает компилятору форму. `isPollResult` проверяет её, и неожиданный ответ становится обычной ошибкой с повтором (глава 11).
- **`toReversed()`** возвращает перевёрнутую копию и не трогает исходный массив (ES2023).

В Network при открытии вкладки теперь три запроса: отменённый (`StrictMode`), мгновенный за курсором и висящий.

---
## Глава 5. Server-Sent Events: один бесконечный ответ

**Цель главы:** понять формат `text/event-stream` до байта и построить поток, который переживает обрывы без потери сообщений.

### 5.1. `res.write`, а не `res.json`

В long polling один ответ несёт одно сообщение. В SSE один ответ несёт все сообщения, пока клиент не уйдёт. Поэтому `res.json` здесь не подходит:

```js
app.get('/json', (req, res) => {
  res.json({ a: 1 })
  console.log(res.writableEnded)   // true — ответ уже завершён
  res.json({ a: 2 })               // Error: ERR_HTTP_HEADERS_SENT
})
```

`res.json` — метод Express: он сериализует объект, ставит `Content-Type: application/json` и вызывает `res.end()`. Нужен `res.write(chunk)` — метод самого Node (`http.ServerResponse`), который дописывает кусок тела и оставляет ответ открытым (`writableEnded === false`). Наивный вариант — заменить `json` на `write`:

```js
res.write(message)
// TypeError [ERR_INVALID_ARG_TYPE]: The "chunk" argument must be of type string or an instance of Buffer...
```

`write` принимает только строку или `Buffer`/`Uint8Array`, объекты он не сериализует. Всё в этом разделе *проверено*.

### 5.2. Формат события

Рабочий вариант:

```js
res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
res.write(`data: ${JSON.stringify({ a: 1 })}\n\n`)
res.write(`data: ${JSON.stringify({ a: 2 })}\n\n`)
// клиент: onmessage дважды, e.data === '{"a":1}', затем '{"a":2}'
```

Тело ответа `text/event-stream` — текст из строк вида `поле: значение`, и событие заканчивается пустой строкой. Каждая часть строки `` `data: ${JSON.stringify(message)}\n\n` `` нужна. Ниже всё проверено через настоящий `EventSource`.

**`data:` — имя поля.** Браузер понимает четыре поля: `data` (содержимое), `event` (тип события), `id` (номер события, раздел 5.4) и `retry` (задержка переподключения в мс). Строка без двоеточия считается полем с пустым значением, неизвестные поля пропускаются:

```js
res.write('{"a":1}\n\n')   // onmessage не сработал ни разу
```

Пробел после двоеточия необязателен: один пробел парсер срезает, `data:{"a":1}` и `data: {"a":1}` дают одно и то же.

**`\n\n` — конец события.** Первый `\n` заканчивает строку поля, второй даёт пустую строку, и только по ней вызывается `onmessage`:

```js
res.write('data: {"a":1}\n')   // onmessage не сработал: событие ждёт пустую строку
```

При закрытии соединения недособранное событие выбрасывается. Одиночный `\n` не может означать конец, потому что событие бывает многострочным, и браузер склеивает строки `data:` через `\n`:

```js
res.write('data: строка 1\ndata: строка 2\n\n')   // e.data === 'строка 1\nстрока 2'
```

**`JSON.stringify`** нужен не только потому, что `write` принимает строки. Посмотрите, что будет с текстом, в котором есть перевод строки:

```js
const text = 'привет\nмир'
res.write(`data: ${text}\n\n`)   // e.data === 'привет' — «мир» пропал
```

Браузер увидел `data: привет`, затем строку `мир` без двоеточия (поле с непонятным именем, пропущено), затем пустую строку. В сериализованном JSON настоящих переводов строки нет: внутри строковых значений `\n` записывается двумя символами `\` и `n`. Поэтому JSON любого размера помещается в одну строку `data:`, а `JSON.parse` на клиенте вернёт исходный `'привет\nмир'`.

> **Внимание** — во всех неправильных вариантах выше нет ни одной ошибки: сервер отвечает `200`, байты доходят, консоль браузера пуста. Просто не вызывается `onmessage` или приходит обрезанный текст. Если события «не доходят», смотрите сырое тело ответа: DevTools → Network → запрос → EventStream.

### 5.3. Заголовки сразу и подписка до закрытия

**Заголовки уходят с первым `write`, а не с `writeHead`.** `writeHead` только запоминает их. Наивный вариант: первое событие пришло через 2 с.

```js
res.writeHead(200, { 'Content-Type': 'text/event-stream' })
setTimeout(() => res.write('data: 1\n\n'), 2000)
// клиент: onopen через 2051 мс
```

Все эти 2 секунды клиент не знает, принят ли запрос: `EventSource` висит в состоянии `CONNECTING`, а прокси на пути видит запрос без ответа и может оборвать его по таймауту. В чате первое сообщение может прийти через минуту.

```js
res.writeHead(200, { 'Content-Type': 'text/event-stream' })
res.flushHeaders()
setTimeout(() => res.write('data: 1\n\n'), 2000)
// клиент: onopen через 6 мс
```

`flushHeaders` сразу отправляет строку статуса и заголовки (*проверено*; 12 клиентов открылись за 77 мс без единого сообщения).

> **Внимание** — не проверяйте это через `res.headersSent`. Сразу после `writeHead` он равен `true` в обоих вариантах: флаг значит «заголовки зафиксированы, менять нельзя», а не «байты ушли клиенту» (*проверено*).

`Connection: keep-alive`, который часто ставят в SSE, не нужен: в HTTP/1.1 соединение и так постоянное по умолчанию, а в HTTP/2 этот заголовок запрещён.

**Подписка — `on`, а не `once`**, потому что слушатель должен получать все сообщения, а не одно. И снимается она по `close`, как в разделе 4.2: без отписки после закрытия вкладки слушатель остаётся в эмиттере навсегда и пишет в уничтоженный ответ. 3 подключения-отключения без `off` → `listenerCount === 3`, с `off` → `0` (*проверено*).

### 5.4. `id:` и досылка пропущенного

`EventSource` при обрыве переподключается сам, но всё, что сервер разослал за время разрыва, клиент пропустит. Решение встроено в протокол: если у события есть поле `id`, браузер запоминает его (`e.lastEventId`) и при переподключении того же `EventSource` присылает в заголовке `Last-Event-ID`.

```
тестовый сервер: подключение 1, Last-Event-ID = undefined
                 (отправил id: 7, оборвал соединение)
тестовый сервер: подключение 2, Last-Event-ID = 7
```

Вывод *проверен*. Это тот же курсор, что в long polling (раздел 4.4), только хранит и отправляет его браузер. Номер — `seq` из истории (раздел 4.5).

### 5.5. Итоговый роутер

```ts
// server/server-sent-events/router.ts
// прокси и балансировщики закрывают ответ, по которому давно не шли байты (часто 30–60 с)
const HEARTBEAT_INTERVAL = 15_000;

const history = createMessageHistory();

const emitter = new EventEmitter<{ newMessage: [StoredMessage] }>();
// каждый открытый /connect — отдельный слушатель; без этого на 11-м клиенте MaxListenersExceededWarning
emitter.setMaxListeners(0);

export const sseRouter = Router();
sseRouter.use(json());

sseRouter.get('/connect', (req, res) => {

    // Connection: keep-alive не ставим: в HTTP/1.1 это поведение по умолчанию, в HTTP/2 заголовок запрещён
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
    })
    // writeHead только запоминает заголовки, а отправляет их первый write; flushHeaders отправляет сразу
    res.flushHeaders();

    // событие — строки "поле: значение", конец события — пустая строка.
    // id браузер запоминает и при переподключении присылает в заголовке Last-Event-ID
    const send = ({seq, message}: StoredMessage) => {
        res.write(`id: ${seq}\ndata: ${JSON.stringify(message)}\n\n`)
    }

    // Last-Event-ID есть только у переподключения того же EventSource после обрыва.
    // Досылаем пропущенное и сразу подписываемся — синхронно, так что между ними ничего не потеряется.
    // Неверный заголовок не повод для 400: на не-200 EventSource закрывается навсегда
    const lastEventId = parseSeq(req.get('Last-Event-ID'));
    if (lastEventId !== null) {
        history.after(lastEventId).forEach(send);
    }
    emitter.on('newMessage', send)

    // строка с двоеточия — комментарий: EventSource его пропускает, а соединение не простаивает
    const heartbeat = setInterval(() => {
        res.write(': ping\n\n')
    }, HEARTBEAT_INTERVAL);

    // клиент закрыл вкладку или вызвал eventSource.close()
    res.on('close', () => {
        clearInterval(heartbeat);
        emitter.off('newMessage', send)
    })

})

sseRouter.post('/new-messages', (req, res) => {
    const text = parseMessageText(req.body);
    if (text === null) {
        res.status(400).json({error: INVALID_TEXT_ERROR});
        return;
    }

    const stored = history.add(text);
    emitter.emit("newMessage", stored);
    res.status(201).json(stored.message);
})
```

- **Досылка и подписка — подряд, без `await`.** Обработчик `POST` не может выполниться между `forEach(send)` и `emitter.on`: JavaScript однопоточен, и обработчик `GET` до конца выполняется синхронно. Новое сообщение либо уже в истории и будет дослано, либо придёт через подписку.
- **Неверный `Last-Event-ID` игнорируется**, а не даёт `400`. На любой ответ, кроме `200`, `EventSource` закрывается окончательно и больше не переподключается. Ошибка в необязательном заголовке не должна убивать соединение (*проверено*: `abc` → `200` без досылки).
- **Курсор из будущего** обрабатывает `history.after`: после перезапуска сервера `EventSource` придёт с `Last-Event-ID: 50` к пустой истории и получит всё, что есть.
- **Heartbeat.** Строка, начинающаяся с `:`, — комментарий: `EventSource` её разбирает и пропускает, `onmessage` не вызывается. Байты при этом идут, и прокси не закрывает соединение как простаивающее (*проверено*: за 16 с пришло `": ping\n\n"`, `onmessage` — ни разу). Интервал свой у каждого соединения и снимается в `close`.
- **`retry:` не отправляется.** Браузер и так переподключается через несколько секунд, значение по умолчанию у браузеров своё. Поле нужно, если задержку надо задать явно.

*Проверено*: события приходят с `lastEventId` 1, 2, 3; подключение с `Last-Event-ID: 1` сразу получает 2 и 3; `999` — всю историю; без заголовка — ничего; `POST` — `id` от сервера, `400` на пустое сообщение, 1001 символ и отсутствие тела.

### 5.6. Клиент: `EventSource`

```ts
// client/src/api/serverSentEvents.ts
const BASE_URL = `${API_URL}/sse`

export const SSE_URL = `${BASE_URL}/connect`

// e.data события — строка; не JSON или не та форма — null, а не исключение в обработчике
export const parseMessage = (data: string): ChatMessage | null => {
  try {
    const value: unknown = JSON.parse(data)
    return isChatMessage(value) ? value : null
  } catch {
    return null
  }
}

export const sendMessage = (text: string) => postChatMessage(`${BASE_URL}/new-messages`, text)
```

```ts
// client/src/hooks/useServerSentEvents.ts
useEffect(() => {
  const eventSource = new EventSource(SSE_URL)

  // срабатывает на каждое событие без поля event: — то, что сервер прислал как data: ...\n\n
  eventSource.onmessage = (e: MessageEvent<string>) => {
    const message = parseMessage(e.data)
    if (!message) return console.error('SSE: неизвестное сообщение', e.data)
    setMessages((prev) => [message, ...prev])
  }

  // при обрыве EventSource переподключается сам; CLOSED — сервер ответил не-200
  // или не text/event-stream, повторов больше не будет
  eventSource.onerror = () => {
    if (eventSource.readyState === EventSource.CLOSED) {
      console.error('SSE: соединение закрыто окончательно')
    }
  }

  // close() рвёт соединение: на сервере срабатывает res.on('close')
  return () => eventSource.close()
}, [])
```

- **Нет цикла и `AbortController`.** Переподключение и `Last-Event-ID` браузер берёт на себя, хук только подписывается и закрывает соединение.
- **`onmessage` получает только события без поля `event:`.** Если сервер пришлёт `event: chat`, понадобится `addEventListener('chat', ...)`.
- **`onerror` срабатывает и при обычном обрыве**, перед автоматическим переподключением, — тогда `readyState === CONNECTING`. Логируется только `CLOSED`: это ответ не `200` или не `text/event-stream`, и повторов больше не будет (*проверено*: ответ 404 → `readyState === 2`).
- **Очистка.** Без `eventSource.close()` в `StrictMode` открывались бы два соединения и каждое сообщение приходило бы дважды. После `close()` на сервере срабатывает `res.on('close')` (*проверено*).

---
## Глава 6. WebSocket на сервере: кадры, ошибки, протокол

**Цель главы:** построить WebSocket-сервер, который не падает от чужих данных и сам решает, что и от чьего имени рассылать.

### 6.1. Рукопожатие и `WebSocketServer`

WebSocket начинается как обычный HTTP-запрос с просьбой сменить протокол (RFC 6455):

```
GET /ws HTTP/1.1
Host: localhost:3001
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: http://localhost:5173

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

После ответа `101` то же TCP-соединение перестаёт быть HTTP: по нему в обе стороны идут **кадры** (frames). Поэтому `ws` живёт на одном порту с Express (раздел 3.5). Создание сервера:

```ts
const wss = new WebSocketServer({
    ...target,              // { port } — свой HTTP-сервер, { server } — общий с Express
    path: '/ws',
    // по умолчанию 100 МиБ — один клиент может занять память сервера
    maxPayload: 16 * 1024,
});
```

- **`path: '/ws'`.** Рукопожатие на другой путь `ws` отклоняет ответом `400` (*проверено*).
- **`maxPayload`.** По умолчанию `ws` принимает сообщения до 100 МиБ. Для чата это бессмысленно и опасно: один клиент может занять память сервера. Сообщение больше 16 КиБ — и `ws` закрывает соединение с кодом 1009 (Message Too Big) (*проверено*). Обратная сторона этого лимита — в разделе 6.4.
- **Колбэк `connection`** вызывается один раз на подключение. `ws` в нём — объект этого соединения: `ws.send()` пишет клиенту, `ws.on('message')` принимает от него.

### 6.2. Текстовые и двоичные кадры

У каждого кадра есть код операции (opcode): `0x1` — текст, `0x2` — двоичные данные (RFC 6455, раздел 5.2). Браузер отправляет текстовый кадр для `send(string)` и двоичный — для `send(ArrayBuffer | Blob | TypedArray)`. В `ws` 8 оба приходят одинаково:

```ts
ws.on('message', (data, isBinary) => {
  console.log(data.constructor.name, isBinary)
})
// socket.send('{"a":1}')                           → Buffer false
// socket.send(new TextEncoder().encode('{"a":1}')) → Buffer true
```

`data` в обоих случаях — `Buffer` с одними и теми же байтами, и тип кадра можно узнать только по `isBinary` (*проверено*). В `ws` 7 разница была видна по типу: текст приходил строкой.

Протокол чата — JSON-текст, поэтому двоичные кадры отбрасываются первой строкой обработчика: `if (isBinary) return`. Без этой проверки сервер начал бы принимать то, чего нет в протоколе. К тому же байты текстового кадра `ws` проверяет на корректность UTF-8 сам, а байты двоичного — нет, и `toString()` молча заменяет невалидные байты на `U+FFFD`:

```ts
Buffer.from([0xff, 0xfe]).toString()   // '��'
```

> **Внимание** — то же разделение работает и при отправке. `ws.send(Buffer)` отправляет **двоичный** кадр, `ws.send(string)` — текстовый, независимо от того, каким пришёл исходный. Если переслать полученный `data` как есть, браузер получит `Blob` вместо строки, даже если клиент отправлял текст (*проверено*). Поэтому сервер рассылает `JSON.stringify(...)`, то есть строку.

### 6.3. Одно сообщение роняет весь сервер

Наивный обработчик:

```js
ws.on('message', (data) => {
  const message = JSON.parse(data)
  broadcastMessage(message)
})
```

Клиент отправляет `not json`, и `JSON.parse` бросает `SyntaxError`. Обработчик события вызывает `ws`, а не ваш код, и исключение никто не перехватывает: оно становится `uncaughtException`, процесс завершается, у всех клиентов соединение закрывается с кодом 1006 (*проверено*). Одно сообщение от одного клиента отключает всех.

Рабочий вариант — разбор, который никогда не бросает:

```ts
let value: unknown;
try {
    value = JSON.parse(data);
} catch {
    return null;
}
```

Полная функция разбора — в разделе 6.5.

### 6.4. `ws.on('error')` обязателен

У `EventEmitter` событие `error` особенное. На любое другое событие без слушателя `emit` просто возвращает `false`, а `emit('error')` без слушателя **бросает** переданную ошибку:

```js
const e = new EventEmitter()
console.log(e.emit('foo', 1))      // false
e.emit('error', new Error('boom')) // Error: boom — исключение
```

Сокет в `ws` — тоже `EventEmitter`. Когда клиент присылает что-то, что нарушает протокол, `ws` генерирует `error` на сокете этого клиента. Так бывает, если сообщение больше `maxPayload`, в текстовом кадре невалидный UTF-8 или кадр неправильно собран. Наивный вариант без обработчика:

```
RangeError: Max payload size exceeded
    throw er; // Unhandled 'error' event
(процесс завершён)
```

То же — с текстовым кадром из байтов `0xff 0xfe`: `Invalid WebSocket frame: invalid UTF-8 sequence`, процесс завершён (*проверено*). `try` вокруг кода сервера не поможет: `ws` генерирует ошибку асинхронно, внутри обработчика входящих данных сокета, когда ваш `try` давно отработал.

```js
const e = new EventEmitter()
try {
  setTimeout(() => e.emit('error', new Error('later')), 10)
} catch {
  console.log('поймано')   // не выполнится
}
// uncaughtException: later
```

Рабочий вариант:

```ts
// без обработчика 'error' — необработанное исключение: например, при превышении maxPayload
ws.on('error', (err) => {
    console.error('WebSocket:', err.message);
})
// WebSocket: Invalid WebSocket frame: invalid UTF-8 sequence
// клиент закрыт с кодом 1007, сервер жив
```

Закрывать соединение самому не нужно: `ws` закрывает его с подходящим кодом — 1007 (неверные данные) или 1009 (слишком большое сообщение). Всё *проверено*.

> **Важно** — так ведут себя все `EventEmitter` в Node: потоки, TCP-сокеты, `http.Server`. У долгоживущего объекта, которому ошибка может прийти из сети, должен быть слушатель `error`.

`wss.on('error')` — другое дело: это ошибка самого сервера, например занятый порт. Если сервер не смог запуститься, падение при старте — правильный исход, поэтому этот обработчик не ставится.

### 6.5. Протокол: сервер собирает сообщения сам

Наивный протокол — клиент присылает готовое сообщение, сервер рассылает его как есть:

```js
// клиент
socket.send(JSON.stringify({ event: 'message', username, message: text, id: Date.now() }))

// сервер
switch (message.event) {
  case 'message':
  case 'connection':
    broadcastMessage(message)
}
```

Проблема в доверии. Любой клиент может прислать `{ event: 'message', username: 'Админ', ... }` и писать от чужого имени, прислать чужой `id` и вызвать дубли `key` у всех, добавить любые поля. Исправить это, не меняя протокол, нельзя: сервер должен знать, кто стоит за соединением, а не верить подписи в сообщении.

Рабочий протокол:

```ts
// server/types/ws.ts (та же форма — в client/src/types/wsEvent.ts)

// клиент → сервер: имя и комната один раз при входе, дальше только текст
export type ClientEvent =
    | { event: 'join'; username: string; room: string }
    | { event: 'message'; text: string }

// сервер → участникам комнаты: id и имя ставит сервер, клиент их не присылает
export type ServerEvent =
    | { event: 'connection'; id: string; username: string }
    | { event: 'message'; id: string; username: string; text: string }
    | { event: 'disconnection'; id: string; username: string }
```

Имя передаётся один раз, в `join`, и сервер запоминает его за соединением. Каждое исходящее событие сервер собирает сам: `id` — `randomUUID()`, имя — из своей таблицы. Поле `room` разобрано в главе 9.

Разбор входящего сообщения проверяет и форму, и длину:

```ts
const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isValidLength = (value: string, max: number) => value.length > 0 && value.length <= max;

// всё, что не прошло проверку формы и длины, — null
const parseClientEvent = (data: string): ClientEvent | null => {
    let value: unknown;
    try {
        value = JSON.parse(data);
    } catch {
        return null;
    }
    if (!isRecord(value)) return null;

    if (value.event === 'join' && typeof value.username === 'string' && typeof value.room === 'string') {
        const username = value.username.trim();
        const {room} = value;
        return isValidLength(username, MAX_USERNAME_LENGTH) && ROOM_PATTERN.test(room)
            ? {event: 'join', username, room}
            : null;
    }
    if (value.event === 'message' && typeof value.text === 'string') {
        const text = value.text.trim();
        return isValidLength(text, MAX_TEXT_LENGTH) ? {event: 'message', text} : null;
    }
    return null;
}
```

Длина — в единицах UTF-16, как `string.length` и `maxLength` у `<input>`, поэтому клиентский и серверный лимиты совпадают. `isRecord` отсекает и `JSON.parse('null')`, и массивы с числами.

### 6.6. Вход, сообщение и мусор

Промежуточная версия сервера, без комнат — одна общая рассылка всем вошедшим. Итоговая, с комнатами, — в главе 9.

```ts
// вошедшие участники: соединение → имя. Имя берётся отсюда, а не из сообщения — подменить его нельзя
const users = new Map<WebSocket, string>();

const broadcast = (event: ServerEvent) => {
    const data = JSON.stringify(event);
    // только вошедшим: до join клиент не участник чата
    for (const client of users.keys()) {
        // закрывающееся соединение ещё в users до события close, слать можно только в OPEN
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    }
}

ws.on('message', (data, isBinary) => {
    if (isBinary) return;

    const event = parseClientEvent(data.toString());
    const username = users.get(ws);

    if (event?.event === 'join') {
        if (username !== undefined) return; // повторный вход игнорируем
        users.set(ws, event.username);
        broadcast({event: 'connection', id: randomUUID(), username: event.username});
        return;
    }

    if (event?.event === 'message') {
        if (username === undefined) return; // до входа писать нельзя
        broadcast({event: 'message', id: randomUUID(), username, text: event.text});
        return;
    }

    // до входа допустим только корректный join (неверное имя, мусор) — закрываем;
    // некорректное сообщение после входа просто игнорируем
    if (username === undefined) {
        ws.close(POLICY_VIOLATION, 'Invalid join');
    }
})
```

- **Имя из таблицы.** Поле `username` в сообщении клиента игнорируется (*проверено*: `{ event: 'message', text: 'привет', username: 'Админ' }` от Ани разослано от «Аня»).
- **Повторный `join` и сообщение до входа** игнорируются (*проверено*).
- **Мусор до входа — `close(1008, 'Invalid join')`.** 1008 Policy Violation — «данные нарушают правила сервера» (RFC 6455, раздел 7.4.1). Клиенту, который не смог войти, на этом соединении делать нечего, и он получит код и причину в `onclose` (*проверено*: имя из 33 символов и `not json` до входа → `1008 Invalid join`).
- **Мусор после входа** игнорируется: одно кривое сообщение не повод выгонять участника.
- **`readyState === OPEN` перед `send`.** Соединение остаётся в `wss.clients` (и в `users`), пока не закроется до конца, и в состоянии `CLOSING` попадает в рассылку. Состояния: `CONNECTING 0`, `OPEN 1`, `CLOSING 2`, `CLOSED 3`; отправлять можно только в `OPEN`.
- **`JSON.stringify` один раз до цикла**: строка для всех получателей одинаковая.

### 6.7. Выход участника

Наивный сервер событие `close` не обрабатывает, и остальные участники не знают, что кто-то ушёл.

```ts
ws.on('close', () => {
    const username = users.get(ws);
    if (username === undefined) return;
    users.delete(ws);
    broadcast({event: 'disconnection', id: randomUUID(), username});
})
```

`close` срабатывает при любом закрытии: клиент вызвал `close()`, закрыл вкладку, сервер сам закрыл соединение. Не срабатывает он в одном случае — когда клиент пропал молча: уснул ноутбук, пропала сеть. Этому посвящена следующая глава.

*Проверено* (промежуточная версия): после `close()` Ани наблюдатель получил `disconnection:Аня`; `id` у всех событий — UUID от сервера.

---
## Глава 7. Heartbeat: ping, pong и мёртвые соединения

**Цель главы:** научить сервер замечать клиентов, которые пропали, не попрощавшись.

### 7.1. Тихо пропавший клиент

Клиент закрыл крышку ноутбука или вышел из зоны Wi-Fi. Закрывающего кадра он не отправил, TCP-соединение формально открыто, и событие `close` на сервере не срабатывает. TCP сообщит об обрыве, только когда ОС исчерпает повторные передачи, а это минуты или часы. Всё это время участник числится в чате, и «вышел» никто не увидит.

Нужна проверка «живости»: периодически спрашивать клиента и отключать тех, кто не отвечает.

### 7.2. `ws.ping()` и автоматический `pong`

```ts
wss.on('connection', (ws) => {
  ws.on('pong', (data) => console.log(`pong: ${data}`))
  ws.ping('abc')
})
// pong: abc   ← через 6 мс
```

Клиентом был стандартный `WebSocket` — тот же API, что в браузере, — и в его коде ни строчки про ping. Ответ всё равно пришёл, с теми же данными (*проверено*).

`ping` — управляющий кадр (control frame), а не сообщение. Вот что `ws.ping('abc')` отправляет по сети (*проверено*, байты пойманы сырым TCP-клиентом):

```
0x89 0x03 0x61 0x62 0x63
 │    │    └─── 'a' 'b' 'c' — полезная нагрузка, до 125 байт
 │    └──────── длина: 3
 └───────────── 0x80 (последний кадр) + 0x09 (opcode ping)
```

По RFC 6455 (разделы 5.5.2–5.5.3) получатель **обязан** ответить кадром `pong` (opcode `0xA`) с той же нагрузкой. Браузер делает это сам, внутри реализации протокола. Из JS этого не видно: события `ping` нет, `onmessage` не срабатывает, метода `pong()` в браузерном API нет. На сервере ответ приходит событием `ws.on('pong')`. Сырой TCP-клиент из той же проверки протокол не реализует и не ответил — именно так выглядит мёртвый клиент.

### 7.3. Цикл проверки

Один `ping` ничего не доказывает. Нужен цикл: «спросил → в следующий раз проверил, ответил ли».

```ts
// раз в столько сервер шлёт ping; кто не ответил pong до следующего — соединение мертво
const HEARTBEAT_INTERVAL = 30_000;

// ответившие на последний ping
const alive = new WeakSet<WebSocket>();

const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
        if (!alive.has(ws)) {
            ws.terminate();
            continue;
        }
        alive.delete(ws);
        ws.ping();
    }
}, HEARTBEAT_INTERVAL);
wss.on('close', () => clearInterval(heartbeat));

wss.on('connection', (ws) => {
    alive.add(ws);
    // pong браузер отправляет сам, из JS его не видно
    ws.on('pong', () => alive.add(ws));
    // ...
})
```

Тик снимает отметку и отправляет `ping`, а вернуть отметку может только `pong`. Для клиента, который пропал сразу после входа:

```
 0 с   подключился          → отметка есть
30 с   тик: отметка есть    → снять, ping        (pong не пришёл)
60 с   тик: отметки нет     → terminate() → close → «вышел» остальным
```

У живого клиента `pong` приходит за миллисекунды, и следующий тик снова находит отметку. Мёртвое соединение обнаруживается за 30–60 с (*проверено*: клиент `ws` с `autoPong: false` закрыт с кодом 1006 через 59 с, остальные получили `disconnection`).

- **`WeakSet`**, потому что закрытое соединение не нужно удалять из него вручную: когда на сокет не останется ссылок, запись исчезнет сама.
- **Обходится `wss.clients`**, а не таблица участников: проверяются и соединения, которые ещё не вошли.
- **`clearInterval` по `wss.on('close')`**: без этого таймер держал бы процесс живым после закрытия сервера.

### 7.4. `terminate()`, а не `close()`

`close()` — закрывающее рукопожатие (closing handshake, RFC 6455, раздел 7): отправить кадр `close`, перейти в `CLOSING` и ждать ответного `close`, только потом закрыть TCP. Мёртвый клиент не ответит, и `ws` ждёт до `closeTimeout` — 30 000 мс по умолчанию (`node_modules/ws/lib/websocket.js`). `terminate()` сразу уничтожает сокет, без кадров и ожидания.

На клиенте, который прошёл рукопожатие и дальше молчит (*проверено*):

```
close():     событие close через 30,01 с, код 1006
terminate(): событие close через 0,00 с, код 1006
```

С `close()` в heartbeat мёртвый участник висел бы в чате 60–90 с вместо 30–60.

Правило: `close()` — когда собеседник жив и должен узнать причину (`1008 Invalid join` в разделе 6.6: клиент получит код и `reason`); `terminate()` — когда отвечать некому. Клиент, который нарочно не отвечает на `close`, продержит сокет не дольше 30 с — это предел, а не утечка.

### 7.5. Почему не проще

**Своё сообщение `{ event: 'ping' }`.** Работало бы, но отвечать тогда должен JS клиента: свой код в каждом клиенте, а фоновая вкладка, у которой браузер замедляет таймеры, может не успеть. Управляющий кадр обрабатывает сам браузер. В обратную сторону стандартный API не помогает: из браузера `ping` не отправить. Если клиенту нужно заметить пропавший сервер, понадобится как раз прикладное сообщение.

**TCP keepalive.** По умолчанию выключен, а включённый на Linux делает первую пробу после двух часов простоя (`tcp_keepalive_time = 7200`). И проверяет он только ближайший узел TCP-соединения. Если между клиентом и сервером прокси, TCP-соединение сервера заканчивается на нём, и на пробу ответит прокси, даже когда клиент давно пропал. Кадр `ping` прокси пересылает дальше, и ответить может только сам клиент.

---
## Глава 8. WebSocket на клиенте: хук, статус, переподключение

**Цель главы:** написать хук, который переживает `StrictMode`, обрывы связи и перезапуски сервера.

### 8.1. Адрес и разбор событий

```ts
// client/src/api/webSocket.ts
// http://host:3001 → ws://host:3001/ws
export const WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws`

// код закрытия, которым сервер отклоняет вход: переподключаться бессмысленно
export const POLICY_VIOLATION = 1008

// сервер — единственный источник событий, но форму всё равно проверяем: протокол может разойтись
export const parseEvent = (data: unknown): ServerEvent | null => {
  if (typeof data !== 'string') return null

  let value: unknown
  try {
    value = JSON.parse(data)
  } catch {
    return null
  }
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.username !== 'string') {
    return null
  }

  const { id, username } = value
  switch (value.event) {
    case 'connection':
    case 'disconnection':
      return { event: value.event, id, username }
    case 'message':
      return typeof value.text === 'string' ? { event: 'message', id, username, text: value.text } : null
    default:
      return null
  }
}
```

`typeof data !== 'string'` отсекает двоичные кадры: в браузере они приходят как `Blob`. Неизвестное событие или чужая форма — `null` и строка в консоли, а не исключение в обработчике.

### 8.2. Первая версия хука и StrictMode

```ts
useEffect(() => {
  const socket = new WebSocket(WS_URL)
  socketRef.current = socket

  socket.onopen = () => {
    const event: ClientEvent = { event: 'join', username, room }
    socket.send(JSON.stringify(event))
  }

  socket.onmessage = (e: MessageEvent<unknown>) => {
    const event = parseEvent(e.data)
    if (!event) return console.error('WebSocket: неизвестное сообщение', e.data)
    setMessages((prev) => [toChatMessage(event), ...prev])
  }

  return () => socket.close()
}, [username, room])
```

Это промежуточная версия, итоговая — в разделе 8.3.

- **`join` — в `onopen`.** В состоянии `CONNECTING` `send()` бросает `InvalidStateError` (*проверено*).
- **Сокет в `useRef`**, потому что `sendMessage` нужен вне эффекта, а пересоздавать функцию на каждое изменение сокета незачем.
- **`toChatMessage`** превращает событие сервера в `{ id, message }` для общего `MessageList`: «Пользователь X подключился», «Пользователь X вышел», «X: текст».

`StrictMode` закрывает первый сокет, пока тот ещё подключается. По спецификации закрытие в `CONNECTING` — это провал соединения: срабатывают `error` и `close` с кодом 1006 (*проверено*: `onclose` с кодом 1006). `onopen` у такого сокета не вызывается, и сервер это соединение даже не видит, поэтому лишнего «подключился» нет. Но если у сокета есть `onerror` или `onclose`, в консоли разработчика будет ложная ошибка, а в итоговой версии — ещё и ложное переподключение. Поэтому перед своим закрытием обработчик `onclose` обнуляется.

> **На заметку** — в браузере `onerror` не сообщает причину ошибки, это сделано намеренно: иначе по подробностям можно было бы сканировать сеть. Причину видно в `onclose` по коду: 1006 — соединение оборвалось без закрывающего кадра.

### 8.3. Обрыв связи и переподключение

Наивный хук после обрыва ничего не делает. Чат выглядит рабочим, но `sendMessage` бросает исключение, видное только в консоли. Сервер запущен с `node --watch`, поэтому это происходит после каждого сохранения серверного файла. Long polling и SSE переподключаются сами, WebSocket — нет.

Итоговый хук:

```ts
// client/src/hooks/useWebSocket.ts
// connecting — первое подключение, reconnecting — связь пропала и ждём повтора,
// rejected — сервер закрыл с 1008 (не прошла проверка join), повторов не будет
export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'rejected'

// задержка перед повтором растёт вдвое: 1, 2, 4, 8 с, дальше 10 с — сервер, который
// перезапускается или лежит, не получит запрос на подключение от каждого клиента каждую секунду
const RECONNECT_BASE_DELAY = 1000
const RECONNECT_MAX_DELAY = 10_000

// новое соединение на каждую пару имя + комната: сменить комнату — переподключиться
export const useWebSocket = (username: string, room: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // переменные одного монтирования: у StrictMode-копии эффекта свои
    let socket: WebSocket
    let attempt = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      socket = new WebSocket(WS_URL)
      socketRef.current = socket

      // join — и при первом подключении, и после каждого переподключения: сервер нового соединения не знает
      socket.onopen = () => {
        attempt = 0
        setStatus('open')
        const event: ClientEvent = { event: 'join', username, room }
        socket.send(JSON.stringify(event))
      }

      socket.onmessage = (e: MessageEvent<unknown>) => {
        const event = parseEvent(e.data)
        if (!event) return console.error('WebSocket: неизвестное сообщение', e.data)
        setMessages((prev) => [toChatMessage(event), ...prev])
      }

      // за error всегда следует close, подробностей браузер не даёт — всё решаем в onclose
      socket.onclose = (e) => {
        socketRef.current = null
        if (e.code === POLICY_VIOLATION) {
          console.error(`WebSocket: сервер отклонил вход — ${e.reason}`)
          setStatus('rejected')
          return
        }
        // 1006 и прочие: сервер перезапустился (node --watch), пропала сеть, heartbeat сервера
        setStatus('reconnecting')
        const delay = Math.min(RECONNECT_BASE_DELAY * 2 ** attempt, RECONNECT_MAX_DELAY)
        attempt++
        retryTimer = setTimeout(connect, delay)
      }
    }

    connect()

    // закрываем сами — переподключаться и менять статус не нужно, поэтому onclose обнуляем.
    // В StrictMode сокет закрывается ещё в CONNECTING: это error + close 1006, без обнуления — лишний повтор
    return () => {
      clearTimeout(retryTimer)
      socket.onclose = null
      socket.close()
      socketRef.current = null
    }
  }, [username, room])

  // имя и комнату сервер помнит с join — в сообщении только текст
  const sendMessage = useCallback((text: string) => {
    const socket = socketRef.current
    if (socket?.readyState !== WebSocket.OPEN) {
      throw new Error('Нет соединения с сервером')
    }

    const event: ClientEvent = { event: 'message', text }
    socket.send(JSON.stringify(event))
  }, [])

  return { messages, status, sendMessage }
}
```

- **Экспоненциальная задержка** (exponential backoff): 1, 2, 4, 8, дальше 10 с, после успешного `onopen` счётчик сбрасывается. Без неё лежащий сервер получал бы от каждого клиента попытку раз в секунду, а после подъёма все клиенты подключались бы одновременно.
- **`join` после каждого переподключения.** Для сервера это новое соединение, имени и комнаты он не помнит. Остальные участники увидят «вышел» (по `close` или heartbeat) и снова «подключился».
- **1008 — без повтора.** Сервер отклонил вход по правилам, и повтор с тем же `join` получит тот же отказ.
- **Сообщения сохраняются.** `messages` — состояние того же экземпляра хука, переподключение его не сбрасывает.
- **Очистка** снимает и запланированный повтор (`clearTimeout`), и `onclose`. Без `clearTimeout` после ухода со страницы таймер открыл бы новый сокет, которым уже никто не управляет.
- **`onerror` не нужен.** За `error` всегда следует `close`, решение принимается там. А при лежащем сервере каждая попытка добавляла бы в консоль ещё одну строку к той, что браузер пишет сам.
- **`sendMessage` проверяет `OPEN`** и иначе бросает исключение: форма его поймает и не очистит поле.

*Проверено* в браузере: перезапуск сервера → «Нет связи, переподключаюсь…» → «В сети», во втором окне — «вышел» и снова «подключился».

### 8.4. Статус в интерфейсе

```tsx
// client/src/pages/WebSocketPage/WebSocketChat.tsx
const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Подключение…',
  open: 'В сети',
  reconnecting: 'Нет связи, переподключаюсь…',
  rejected: 'Сервер отклонил вход',
}

// ...
{/* role="status" — скринридер объявит смену статуса, не перехватывая фокус */}
<p className={status === 'open' ? styles.status : `${styles.status} ${styles.offline}`} role="status">
  {STATUS_LABELS[status]}
</p>
<MessageForm onSend={sendMessage} maxLength={MAX_TEXT_LENGTH} disabled={status !== 'open'} />
```

`Record<ConnectionStatus, string>` заставляет компилятор проверить, что у каждого статуса есть подпись: добавите статус в тип — без подписи код не скомпилируется. Без связи форма отключена, а введённый текст остаётся в поле до переподключения.

---
## Глава 9. Комнаты

**Цель главы:** разделить WebSocket-чат на комнаты так, чтобы ссылку на комнату можно было отправить.

### 9.1. Сервер: два индекса

Протокол меняется в одном месте: `join` несёт ещё и `room` (раздел 6.5). Рассылка идёт только участникам комнаты отправителя, и события чужих комнат не видны.

Итоговая функция `createWebSocketServer` из `server/websocket/webSocketServer.ts` (импорты и функции разбора из раздела 6.5 опущены, часть комментариев сокращена):

```ts
// раз в столько сервер шлёт ping; кто не ответил pong до следующего — соединение мертво
const HEARTBEAT_INTERVAL = 30_000;
// 1008 Policy Violation — данные нарушают правила сервера (RFC 6455, §7.4.1)
const POLICY_VIOLATION = 1008;

// isRecord, isValidLength, parseClientEvent — раздел 6.5

export const createWebSocketServer = (target: { port: number } | { server: Server }) => {
    const wss = new WebSocketServer({
        ...target,
        path: '/ws',
        // по умолчанию 100 МиБ — один клиент может занять память сервера
        maxPayload: 16 * 1024,
        // проверка Origin при рукопожатии — глава 10
        verifyClient: ({origin}, done) => {
            if (isAllowedOrigin(origin)) {
                done(true);
            } else {
                done(false, 403, 'Origin not allowed');
            }
        },
    });

    // вошедшие участники: соединение → имя и комната. Берутся отсюда, а не из сообщения — подменить нельзя
    const users = new Map<WebSocket, { username: string; room: string }>();
    // комната → её участники: рассылка обходит только их, а не всех подключённых
    const rooms = new Map<string, Set<WebSocket>>();
    // ответившие на последний ping
    const alive = new WeakSet<WebSocket>();

    const broadcast = (room: string, event: ServerEvent) => {
        const data = JSON.stringify(event);
        // только участникам комнаты: до join клиент не участник ни одной
        for (const client of rooms.get(room) ?? []) {
            // закрывающееся соединение остаётся в комнате до события close, слать можно только в OPEN
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        }
    }

    // heartbeat — глава 7
    const heartbeat = setInterval(() => {
        for (const ws of wss.clients) {
            if (!alive.has(ws)) {
                ws.terminate();
                continue;
            }
            alive.delete(ws);
            ws.ping();
        }
    }, HEARTBEAT_INTERVAL);
    wss.on('close', () => clearInterval(heartbeat));

    wss.on('connection', (ws) => {
        alive.add(ws);
        ws.on('pong', () => alive.add(ws));

        ws.on('message', (data, isBinary) => {
            if (isBinary) return;

            // в ws 8 текстовый кадр тоже приходит Buffer'ом
            const event = parseClientEvent(data.toString());
            const user = users.get(ws);

            if (event?.event === 'join') {
                // повторный вход игнорируем: сменить комнату — переподключиться
                if (user !== undefined) return;
                const {username, room} = event;
                users.set(ws, {username, room});
                // комнаты не создаются заранее: первый вошедший создаёт, последний вышедший удаляет
                const members = rooms.get(room) ?? new Set<WebSocket>();
                members.add(ws);
                rooms.set(room, members);
                broadcast(room, {event: 'connection', id: randomUUID(), username});
                return;
            }

            if (event?.event === 'message') {
                if (user === undefined) return; // до входа писать нельзя
                broadcast(user.room, {event: 'message', id: randomUUID(), username: user.username, text: event.text});
                return;
            }

            // до входа допустим только корректный join (неверное имя или комната, мусор) — закрываем;
            // некорректное сообщение после входа просто игнорируем
            if (user === undefined) {
                ws.close(POLICY_VIOLATION, 'Invalid join');
            }
        })

        ws.on('close', () => {
            const user = users.get(ws);
            if (user === undefined) return;
            users.delete(ws);

            const members = rooms.get(user.room);
            members?.delete(ws);
            // пустую комнату удаляем, иначе Map растёт с каждым когда-либо открытым именем
            if (members?.size === 0) {
                rooms.delete(user.room);
                return;
            }
            broadcast(user.room, {event: 'disconnection', id: randomUUID(), username: user.username});
        })

        // без обработчика 'error' — необработанное исключение: например, при превышении maxPayload
        ws.on('error', (err) => {
            console.error('WebSocket:', err.message);
        })

    })

    return wss;
}
```

- **Два индекса.** `users` отвечает на вопрос «кто это соединение и где он» — он нужен на каждое входящее сообщение. `rooms` отвечает на вопрос «кто в комнате» — он нужен на рассылку. Можно обойтись одним `users` и фильтровать по комнате, но тогда каждая рассылка перебирает всех клиентов сервера, а не участников одной комнаты.
- **Комнаты не создаются заранее.** Первый вошедший создаёт комнату, последний вышедший удаляет. Без удаления `rooms` росла бы с каждым когда-либо введённым именем — утечка памяти, которой управляет клиент.
- **Сменить комнату — переподключиться.** Повторный `join` игнорируется. Переход между комнатами внутри одного соединения потребовал бы события `leave` и разбора гонок, а новое соединение проще и даёт тот же результат.

*Проверено*: Аня и Боря в комнате `общая`, Вика в `room_2`. Вика не получила ничего из `общая`, Аня увидела `disconnection` Бори. Когда `room_2` опустела и удалилась, новый вход в неё прошёл нормально.

### 9.2. Имя комнаты: шаблон для сервера и для `<input>`

Имя комнаты попадает в адрес страницы, поэтому оно ограничено: буквы любого алфавита, цифры, `-` и `_`, до 32 символов.

```ts
// server/shared/limits.ts
// \- экранирован, чтобы тот же текст работал в pattern у <input> — браузер компилирует его с флагом v
export const ROOM_PATTERN = /^[\p{L}\p{N}_\-]{1,32}$/u;
```

`\p{L}` и `\p{N}` — свойства Unicode «любая буква» и «любая цифра». Они работают только с флагом `u` или `v`. Не по шаблону или без поля `room` — `1008 Invalid join` (*проверено*: `a b`, `a/b`, 33 символа, `join` без `room`).

На клиенте тот же шаблон нужен в атрибуте `pattern`, чтобы браузер не дал отправить форму с неверным именем. Наивный вариант — переписать его как есть, без экранирования:

```js
new RegExp('^(?:[\\p{L}\\p{N}_-]{1,32})$', 'u')   // работает
new RegExp('^(?:[\\p{L}\\p{N}_-]{1,32})$', 'v')   // SyntaxError: Invalid character in character class
```

Браузер компилирует `pattern` с флагом `v`, а в режиме `v` неэкранированный дефис внутри `[...]` — синтаксическая ошибка (*проверено*). По спецификации HTML шаблон, который не компилируется, просто не применяется: поле перестаёт проверяться, и никакой ошибки пользователь не увидит. С `\-` шаблон работает в обоих режимах (*проверено*).

```ts
// client/src/config.ts
// строка, а не RegExp: нужна и для pattern у <input> (браузер сам добавляет ^ и $ и флаг v),
// и для проверки адреса. \- экранирован — с флагом v неэкранированный дефис в [...] — ошибка
export const ROOM_PATTERN = String.raw`[\p{L}\p{N}_\-]{1,32}`
export const isValidRoom = (room: string) => new RegExp(`^(?:${ROOM_PATTERN})$`, 'u').test(room)
```

`String.raw` оставляет обратные слеши как есть: в обычной шаблонной строке `\p` превратился бы в `p`.

### 9.3. Клиент: комната в адресе

```
/websocket            выбор комнаты
/websocket/:room      имя → чат «Комната X» + ссылка «Другая комната»
```

```tsx
// client/src/pages/WebSocketPage/WebSocketPage.tsx
const WebSocketPage = () => {
  const { room } = useParams()
  const navigate = useNavigate()
  // живёт в странице, а не в чате: при смене комнаты имя не спрашиваем заново
  const [username, setUsername] = useState<string | null>(null)

  if (room === undefined) {
    return (
      <main className={styles.page}>
        <MessageForm
          onSend={(name) => navigate(`/websocket/${encodeURIComponent(name)}`)}
          placeholder="Комната"
          submitLabel="Перейти"
          pattern={ROOM_PATTERN}
          title="До 32 символов: буквы, цифры, - и _"
        />
      </main>
    )
  }

  // адрес набрали руками или прислали битую ссылку — сервер всё равно отклонил бы такой join
  if (!isValidRoom(room)) {
    return <Navigate to="/websocket" replace />
  }

  if (username === null) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Комната {room}</h1>
        <MessageForm
          onSend={setUsername}
          placeholder="Ваше имя"
          submitLabel="Войти"
          maxLength={MAX_USERNAME_LENGTH}
        />
      </main>
    )
  }

  // key: другая комната — новый экземпляр чата, список сообщений начинается с нуля
  return <WebSocketChat key={room} room={room} username={username} />
}
```

- **Один маршрут `/websocket/:room?`** с необязательным сегментом (раздел 2.5). При двух маршрутах, `/websocket` и `/websocket/:room`, нет гарантии, что страница не перемонтируется при переходе, а она хранит имя. С одним маршрутом меняется только параметр, и `username` остаётся в состоянии страницы: в другой комнате имя заново не спрашивают.
- **`key={room}` на `WebSocketChat`.** Другая комната — другой `key`, и React размонтирует старый чат (очистка эффекта закрывает сокет) и монтирует новый с пустым списком. Без `key` эффект переподключился бы по зависимостям `[username, room]`, но в `messages` остались бы сообщения старой комнаты.
- **Адрес проверяется тоже.** Ссылку могли набрать руками. Не по шаблону — `<Navigate>` на выбор комнаты, а не подключение, которое сервер всё равно закроет.
- **`encodeURIComponent`** кодирует кириллицу и спецсимволы для адреса, а `useParams` возвращает уже декодированную строку.
- **`WebSocketChat` лежит в папке страницы.** Это её часть, а не общий компонент: шапка с комнатой, строка статуса (раздел 8.4), форма и список.

---
## Глава 10. Origin и CORS: кого пускать

**Цель главы:** пускать на сервер только свой клиент и понимать, от чего именно это защищает.

### 10.1. Модель угроз

**`Origin`** — заголовок с источником страницы, сделавшей запрос: схема, хост и порт, например `http://localhost:5173`. Браузер ставит его сам, и JS страницы изменить его не может. Поэтому `Origin` надёжно отличает «наш клиент» от «чужой сайт, открытый в браузере пользователя».

Вне браузера (curl, Node, свой клиент) `Origin` пишется любой или не пишется вовсе. От не-браузерных клиентов проверка `Origin` не защищает в принципе, поэтому запросы без `Origin` пропускаются. Защита от них — другие механизмы: аутентификация, ограничение частоты запросов. В учебном чате их нет (раздел 13.3).

```ts
// server/shared/origins.ts
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
```

### 10.2. HTTP: CORS — защита браузера, а не сервера

Наивный вариант — `app.use(cors())` без настроек. Он отвечает любому сайту `Access-Control-Allow-Origin: *`, то есть разрешает читать ответы откуда угодно. Ограничить источник легко: `cors({ origin: CLIENT_ORIGINS })`. Но этого мало.

> **Важно** — CORS не даёт чужой странице **прочитать** ответ, но сам запрос до сервера доходит. Простой (simple) запрос — `GET` без особых заголовков — браузер отправляет сразу и только потом проверяет заголовки ответа. Чужая страница может открыть `/sse/connect` или висящий `get-messages`: прочитать ничего не сможет, а слушателей на сервере займёт.

`POST` с `Content-Type: application/json` — не простой запрос. Браузер сначала отправляет предварительный запрос (preflight) `OPTIONS` и отправит сам `POST`, только если сервер разрешит.

Рабочий вариант — отклонить чужой `Origin` до маршрутов, а своим отдавать заголовки CORS:

```ts
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
```

`methods: ['GET', 'POST']` — потому что `cors` по умолчанию разрешает в preflight все методы, включая `PUT`, `PATCH` и `DELETE`, которых у сервера нет (*проверено*). `clientOriginOnly` подключается в `createApp` (раздел 3.2).

### 10.3. WebSocket: проверка при рукопожатии

На WebSocket CORS не распространяется вообще. Браузер подключится к любому серверу с любой страницы и передаст её `Origin` в рукопожатии, а проверять его должен сервер. Без проверки чужой сайт, открытый у пользователя, может войти в чат и читать переписку. Атака называется Cross-Site WebSocket Hijacking (CSWSH). Особенно опасна она, когда сервер узнаёт пользователя по cookie: браузер приложит их к рукопожатию сам.

```ts
// на WebSocket CORS не действует: браузер подключится с любой страницы и пришлёт её Origin.
// Без проверки чужой сайт, открытый у пользователя, войдёт в чат (Cross-Site WebSocket Hijacking).
// Отказ на этапе рукопожатия: соединение не открывается, браузер получает 403
verifyClient: ({origin}, done) => {
    if (isAllowedOrigin(origin)) {
        done(true);
    } else {
        done(false, 403, 'Origin not allowed');
    }
},
```

`ws` отвечает `403` вместо `101`, и соединение не открывается. В браузере это `error` и `close` с кодом 1006: причину JS не узнает, как и при любой ошибке рукопожатия.

> **На заметку** — документация `ws` пишет «Use of `verifyClient` is discouraged» и советует проверять клиента в событии `upgrade` HTTP-сервера (`noServer: true` и `wss.handleUpgrade`). `verifyClient` не объявлен устаревшим, и здесь он оставлен, потому что одинаково работает в обоих режимах, `{ port }` и `{ server }`, а проверка синхронная. Для асинхронной проверки (сессия из базы данных по cookie) правильнее `upgrade`.

### 10.4. Результат и настройка

*Проверено* на общем сервере и на отдельном сервере long polling:

| Запрос | Свой `Origin` | Чужой | Без `Origin` |
|---|---|---|---|
| `GET /long-polling/get-messages` | 200, ACAO = свой | 403, без ACAO | 200, без ACAO |
| preflight `OPTIONS` для `POST` | 204, методы `GET,POST` | 403 | — |
| `GET /sse/connect` | — | 403 | — |
| рукопожатие `/ws` | открыто | 403 | открыто |

ACAO — заголовок `Access-Control-Allow-Origin`.

Разрешённые адреса задаются переменной `CLIENT_ORIGINS` в `server/.env` (образец — `server/.env.example`), через запятую, пробелы обрезаются (*проверено*).

> **Внимание** — origin сравнивается как строка: схема, хост и порт. `http://127.0.0.1:5173` — другой origin, чем `http://localhost:5173`, и по умолчанию не пропускается. Открываете клиент с телефона по `http://192.168.1.10:5173` — добавьте этот адрес в `CLIENT_ORIGINS`. Симптом: `403` на всех запросах и закрытие WebSocket с кодом 1006 сразу после подключения.

---
## Глава 11. Типы и проверка данных

**Цель главы:** различать, где тип что-то гарантирует, а где только обещает.

### 11.1. Тип — обещание, проверка — код

Всё, что приходит из сети, — `unknown`, какой бы тип ни стоял в коде. Наивный вариант:

```ts
const message: ChatMessage = req.body          // компилируется: req.body в Express — any
const result = (await res.json()) as PollResult // компилируется: as — указание компилятору
```

Оба варианта компилируются и ничего не проверяют. `any` отключает проверку типов, `as` говорит компилятору «поверь мне». Если сервер или клиент пришлёт другую форму, ошибка вылезет не здесь, а там, где поле используется, — или не вылезет вообще, и `undefined` уйдёт дальше.

Рабочий вариант — функции-предохранители (type guards), которые проверяют форму и сужают тип:

```ts
// client/src/utils/guards.ts
// данные из сети приходят как unknown: as ChatMessage только обещает форму, проверка — здесь
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isChatMessage = (value: unknown): value is ChatMessage =>
  isRecord(value) && typeof value.id === 'string' && typeof value.message === 'string'
```

`value is ChatMessage` — тип-предикат: после `if (isChatMessage(x))` компилятор считает `x` типом `ChatMessage`. Компилятор не проверяет, что тело функции действительно проверяет то, что обещает предикат, поэтому такие функции держатся короткими и очевидными.

Где проверяются данные из сети:

| Где | Что | Неверная форма |
|---|---|---|
| `server/shared/parse.ts` | `parseSeq`, `parseMessageText` (раздел 4.5) | `400` |
| `server/websocket/webSocketServer.ts` | `parseClientEvent` (раздел 6.5) | игнор, до входа — `1008` |
| `client/src/api/longPolling.ts` | `isPollResult` (раздел 4.7) | исключение, повтор опроса |
| `client/src/api/serverSentEvents.ts` | `parseMessage` (раздел 5.6) | лог, событие пропущено |
| `client/src/api/webSocket.ts` | `parseEvent` (раздел 8.1) | лог, событие пропущено |

Клиент проверяет данные сервера, хотя сервер свой. Протокол может разойтись после изменений на одной стороне, и лучше увидеть «неизвестное сообщение» в консоли, чем `undefined` в чате.

### 11.2. `unknown` вместо `any` на сервере

`'event' in value` и `typeof value.text === 'string'` в `parseClientEvent` — сужение типа: после проверки компилятор знает, что поле есть и какого оно типа. Начинать нужно с `unknown`:

```ts
let value: unknown;
try {
    value = JSON.parse(data);   // JSON.parse возвращает any — присваивание в unknown возвращает проверку
} catch {
    return null;
}
if (!isRecord(value)) return null;
// value: Record<string, unknown>
```

`JSON.parse` возвращает `any`, и с ним любое обращение к полю компилируется. Переменная типа `unknown` заставляет сначала проверить форму.

### 11.3. Типизированный `EventEmitter`

`EventEmitter` из `node:events` принимает карту событий «имя → кортеж аргументов»:

```ts
const emitter = new EventEmitter<{ newMessage: [StoredMessage] }>();
```

`emit`, `on` и `off` проверяются по этой карте:

```ts
const e = new EventEmitter<{ newMessage: [{ id: string }] }>()
e.emit('newMesage', { id: '1' })   // TS2345: ... not assignable to parameter of type 'never'
e.emit('newMessage', { id: 1 })    // TS2322: Type 'number' is not assignable to type 'string'
```

Опечатка в имени события без карты — тихая ошибка: `emit` вернёт `false`, слушатель не сработает. С картой — ошибка компиляции (*проверено*).

### 11.4. Типы клиента и сервера

Клиент и сервер — два отдельных пакета, и типы протокола описаны в каждом: `ChatMessage` — в `types/message.ts` обоих, события WebSocket — в `server/types/ws.ts` и `client/src/types/wsEvent.ts`. Комментарий в начале каждого файла указывает на пару. Это сознательный компромисс: изменение протокола требует правки в двух местах, и проверка формы на обеих сторонах (раздел 11.1) — страховка от расхождения. Как убрать дублирование — в разделе 13.4.

---
## Глава 12. Проверка и диагностика

**Цель главы:** уметь убедиться, что приложение работает, и быстро найти причину, когда оно не работает.

### 12.1. Сценарии проверки

Запустите общий сервер и клиент (раздел 0.4) и откройте `http://localhost:5173` в двух окнах.

**Long polling.** Отправьте сообщение в одном окне — оно появится в обоих. В Network (фильтр `get-messages`):

| Запрос | Ожидание |
|---|---|
| первый `get-messages` | `(canceled)` — `StrictMode` (раздел 4.3) |
| `get-messages` без `since` | `200` сразу, `{"messages":[],"cursor":N}` |
| `get-messages?since=N` | висит; после сообщения — `200` с ним, без сообщений — `204` через 25 с |
| `new-messages` | `OPTIONS` `204` (preflight), затем `POST` `201` |

**SSE.** То же на вкладке «Server-Sent Events». В Network у запроса `connect` — вкладка EventStream: события с `id` 1, 2, 3…

**WebSocket.**

1. Ввести комнату, например `общая`: адрес станет `/websocket/%D0%BE%D0%B1...`, браузер покажет его кириллицей.
2. Ввести имя. Во втором окне открыть тот же адрес и ввести другое имя. В первом — «Пользователь … подключился».
3. Третье окно — другая комната: её сообщения в первые два не попадают.
4. Закрыть второе окно — в первом «Пользователь … вышел».
5. Сохранить любой серверный файл (`--watch` перезапустит сервер): статус «Нет связи, переподключаюсь…», через секунду — «В сети».

В Network (фильтр `WS`) у соединения `/ws` — статус `101` и вкладка Messages: исходящие `join` и `message`, входящие события сервера.

**Сервер без браузера.**

```js
// Node 24: fetch и WebSocket встроены
const r = await fetch('http://localhost:3001/sse/new-messages', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops',
})
console.log(r.status, await r.text())   // 400 {"error":"Expected property name ..."}

const ws = new WebSocket('ws://localhost:3001/ws')
ws.onopen = () => ws.send('not json')
ws.onclose = (e) => console.log(e.code, e.reason)   // 1008 Invalid join — сервер жив
```

`EventSource` в Node 24 есть только с флагом `--experimental-eventsource`.

> **Внимание** — в Windows PowerShell 5.1 `curl` — это псевдоним `Invoke-WebRequest` с другим синтаксисом. Пишите `curl.exe` или используйте Postman.

### 12.2. Таблица симптомов

| Симптом | Причина | Что сделать |
|---|---|---|
| в Network первый запрос `(canceled)`, сразу за ним новый | `StrictMode` монтирует компонент дважды, очистка отменила первый запрос | ничего, так и должно быть (раздел 4.3) |
| каждое сообщение приходит дважды, предупреждение о дублирующемся `key` | эффект без очистки: в `StrictMode` два цикла опроса или два соединения | вернуть из эффекта `abort()` / `close()` (разделы 4.3, 5.6) |
| `POST` висит в `pending`, сообщение при этом доходит | `res.status(...)` без `json`/`end` | `res.status(201).json(...)` (раздел 4.1) |
| из двух быстрых сообщений приходит одно | long polling без курсора | `?since=` и история (раздел 4.4) |
| `MaxListenersExceededWarning: Possible EventEmitter memory leak` | подписки не снимаются по `close` или их честно больше 10 | `off` в `res.on('close')`; затем `setMaxListeners(0)` (разделы 4.2, 4.6) |
| SSE: `200`, байты идут, `onmessage` молчит | нет `data:` или пустой строки в конце события | `` `data: ${JSON.stringify(m)}\n\n` `` (раздел 5.2) |
| SSE: текст обрезан на переводе строки | текст вставлен в `data:` без `JSON.stringify` | сериализовать (раздел 5.2) |
| SSE: `onopen` срабатывает только с первым сообщением | заголовки ждут первого `write` | `res.flushHeaders()` (раздел 5.3) |
| SSE: `EventSource` закрылся и больше не переподключается | сервер ответил не `200` или не `text/event-stream` | проверить ответ `connect` в Network (раздел 5.6) |
| сервер падает с `SyntaxError ... JSON` | `JSON.parse` без `try` в обработчике сообщения | разбор, возвращающий `null` (раздел 6.3) |
| сервер падает с `Unhandled 'error' event` (`Max payload size exceeded`, `invalid UTF-8`) | у сокета нет `ws.on('error')` | добавить обработчик (раздел 6.4) |
| браузер получает `Blob` вместо строки | сервер переслал `Buffer` как есть | `send(JSON.stringify(...))` (раздел 6.2) |
| `InvalidStateError` при `send` | отправка до `onopen` | отправлять в `onopen` (раздел 8.2) |
| WebSocket закрыт с `1008 Invalid join` | неверное имя или комната, или мусор до `join` | проверить `join` (разделы 6.6, 9.2) |
| WebSocket закрыт с `1009` | сообщение больше `maxPayload` | уменьшить сообщение или поднять лимит (раздел 6.1) |
| ушедший участник «висит» в чате минуту | клиент пропал без закрытия, ждём heartbeat | норма: 30–60 с (раздел 7.3) |
| статус «Нет связи, переподключаюсь…» не проходит | сервер не запущен или отклоняет рукопожатие (`Origin`) | запустить сервер; проверить `CLIENT_ORIGINS` |
| `403` на всех запросах, WebSocket сразу закрывается с 1006 | адрес клиента не в `CLIENT_ORIGINS` (например, `127.0.0.1` вместо `localhost`) | открыть `localhost` или добавить адрес (раздел 10.4) |
| поле комнаты принимает что угодно | `pattern` не компилируется с флагом `v` (неэкранированный `-`) | `\-` в шаблоне (раздел 9.2) |
| в другой комнате видны сообщения прошлой | у чата нет `key={room}` | `key` (раздел 9.3) |
| `Server started on port 3001`, но сервер не отвечает или процесс сразу завершился | порт занят, Express 5 передал ошибку в колбэк `listen` | `if (error) throw error` (раздел 3.3) |
| `listen EADDRINUSE` | на 3001 уже работает другой вариант сервера | остановить его: варианты запускаются по очереди |
| на битый JSON — HTML со стеком и путями | нет своего обработчика ошибок | `jsonErrorHandler` (раздел 3.2) |
| `.env not found. Continuing without it.` при старте | файла `server/.env` нет | ничего, это не ошибка (раздел 3.1) |
| Ctrl+клик в WebStorm не ведёт к объявлению | TypeScript 7 без `tsserver` | TypeScript 6 и путь к нему в IDE (раздел 2.1) |

> **Важно** — проверочные скрипты запускайте на отдельных портах (`PORT=3901 npm start`) и не трогайте рабочий сервер на 3001: у вас может быть открыт чат. Это особенно важно для сценариев «занятый порт» и «перезапуск».

---
## Глава 13. Итоговая структура, ограничения и что дальше

**Цель главы:** собрать картину целиком и наметить следующие шаги.

### 13.1. Как сообщение проходит через приложение

Long polling:

```
Enter в форме A
  → postChatMessage           POST /long-polling/new-messages { message }
  → parseMessageText          trim, 1..1000, иначе 400
  → history.add               seq + 1, id = randomUUID()
  → emitter.emit              «появилось новое»
  → висящий GET у B           history.after(since) → 200 { messages, cursor }
  → useLongPolling у B        cursor = …, новые сверху, следующий GET ?since=cursor
```

SSE:

```
POST /sse/new-messages → history.add → emitter.emit(stored)
  → send у каждого /connect   id: seq / data: JSON / пустая строка
  → EventSource у B           e.lastEventId = seq, parseMessage → список
обрыв → EventSource сам → GET /sse/connect, Last-Event-ID: seq → досылка из истории
```

WebSocket:

```
onopen у B                    join { username, room }
  → parseClientEvent          форма, длина, ROOM_PATTERN, иначе 1008
  → users, rooms              соединение → имя и комната
Enter у A                     message { text }
  → имя и комната из users    поле username от клиента не читается
  → broadcast(room)           { event: 'message', id, username, text } только комнате
close / terminate у A         → rooms без A → disconnection комнате
ping раз в 30 с               нет pong с прошлого тика → terminate
```

Карта файлов — в разделе 0.4.

### 13.2. Ключевые решения

| Решение | Почему |
|---|---|
| один сервер, модуль на способ, префиксы маршрутов | все три чата открыты рядом; модули работают и отдельно (разделы 3.4, 3.5) |
| long polling с курсором `since`, а не «следующим событием» | сообщения в окне между запросами не теряются (раздел 4.4) |
| таймаут 25 с → `204` | раньше, чем прокси оборвёт ожидание (раздел 4.6) |
| SSE: `id:` и `Last-Event-ID` | досылка пропущенного при переподключении (раздел 5.4) |
| SSE: комментарий `: ping` раз в 15 с | прокси не закрывает «молчащий» поток (раздел 5.5) |
| подписка всегда снимается по `close` | ушедшие клиенты не копятся в эмиттерах (разделы 4.2, 5.3) |
| WebSocket: имя в `join`, исходящие события собирает сервер | нельзя писать от чужого имени и подсунуть чужой `id` (раздел 6.5) |
| `ws.on('error')` и разбор без исключений | чужие данные не роняют процесс (разделы 6.3, 6.4) |
| heartbeat ping/pong и `terminate()` | тихо пропавшие клиенты выходят за 30–60 с (глава 7) |
| клиент: переподключение с экспоненциальной задержкой, `join` заново | перезапуск сервера не ломает чат (раздел 8.3) |
| комнаты: `users` + `rooms`, пустые удаляются | рассылка только своим, память не растёт (раздел 9.1) |
| проверка `Origin` для HTTP и при рукопожатии | чужой сайт не войдёт в чат от имени пользователя (глава 10) |
| `unknown` и функции-предохранители на входе | форма данных проверяется, а не обещается (глава 11) |
| свой обработчик ошибок Express, проверка ошибки `listen` | JSON вместо HTML со стеком; занятый порт не выдаёт себя за запуск (разделы 3.2, 3.3) |

### 13.3. Известные ограничения

- **Курсор после перезапуска сервера.** Правило «`since` больше `lastSeq` — отдать всё» (раздел 4.5) не срабатывает, если после перезапуска сервер успел получить не меньше `N` сообщений раньше, чем вернулся клиент с `since = N`. Тогда сообщения 1…N этот клиент не увидит. Касается и long polling, и SSE.
- **История в памяти.** 100 сообщений на способ, теряются при перезапуске. Отставший больше чем на 100 сообщений клиент вытесненные не получит.
- **SSE без учёта обратного давления (backpressure).** `res.write` возвращает `false`, когда клиент не успевает читать, а сервер пишет дальше, и буфер этого соединения растёт.
- **Long polling повторяет запрос каждые 500 мс без нарастающей задержки**, например при `403` от неразрешённого `Origin`.
- **Ошибки отправки в long polling и SSE** видны только в консоли.
- **Нет ограничения частоты сообщений** (rate limit): один клиент может заспамить комнату.
- **Имена в комнате не уникальны**: два «Ани» неразличимы.
- **Нет аутентификации.** Имя — просто строка, `Origin` защищает только от чужих сайтов в браузере (раздел 10.1).
- **Список сообщений на клиенте растёт без ограничения**, пока открыта вкладка.

### 13.4. Что дальше

1. **Номер запуска в курсоре.** Сервер при старте генерирует `epoch`, курсор становится `epoch:seq`. Чужой `epoch` — отдать всю историю. Это закрывает первое ограничение.
2. **Нарастающая задержка в long polling** — как в WebSocket-хуке (раздел 8.3).
3. **Статус и ошибки в интерфейсе** для long polling и SSE.
4. **Обратное давление в SSE.** При `write === false` ждать события `drain` или отключать клиента, который не читает.
5. **Ограничение частоты** — счётчик сообщений на соединение за окно времени, превышение — `close(1008)`.
6. **Хранилище.** История и состояние комнат в Redis или базе данных. Это же нужно, чтобы запустить несколько процессов сервера: сейчас `EventEmitter` и `Map` живут в памяти одного процесса, и клиенты разных процессов друг друга не увидят.
7. **Общие типы протокола.** Один файл типов, подключённый в оба пакета через `import type`: импорт типа стирается и при сборке Vite, и при запуске Node, поэтому файл не нужно ни собирать, ни загружать.
8. **Проверка через `upgrade`** вместо `verifyClient`, если понадобится асинхронная проверка — например, сессия по cookie (раздел 10.3).

---
# Часть II. Что проверено и источники

## Что проверено

Утверждения с пометкой *проверено* подтверждены запуском кода на отдельных портах или чтением исходного кода библиотек в `node_modules`. Клиенты в проверках — встроенные в Node 24 `fetch` и `WebSocket`, `EventSource` с флагом `--experimental-eventsource`, клиент `ws` и сырой TCP-сокет. Версии: Node 24.18.0, Express 5.3.0, ws 8.22.0, cors 2.8.6, Vite 8.3.4, React 19.3.1, react-router 8.4.0, TypeScript 6.0.3 (и 7.0.2 для сравнения), @types/express 5.0.6, @types/ws 8.18.2, @types/node 24.19.2.

| Утверждение | Как проверено |
|---|---|
| в `typescript@7.0.2` нет `lib/tsserver.js` и `lib/typescript.js` | содержимое `node_modules/typescript` |
| в TypeScript 6 `strict` включён по умолчанию (`TS7006`, `TS2322` без конфига) | `tsc --ignoreConfig` на пробном файле |
| `--env-file-if-exists` без файла печатает предупреждение и продолжает, с файлом — загружает переменные | запуск Node |
| стандартный обработчик Express: битый JSON → `400 text/html` со стеком; есть `X-Powered-By` | запрос `fetch` |
| свой обработчик: `400` и `413` в JSON, без `X-Powered-By` | запросы `fetch` |
| Express 5 вызывает колбэк `listen` с ошибкой: без проверки — «started» и выход с кодом 0; с проверкой — `EADDRINUSE` и код 1 | `node_modules/express/lib/application.js`, запуск на занятом порту |
| общий сервер: один слушатель `request`, после `ws` — один `upgrade`; `typeof app === 'function'` | `listenerCount` в Node |
| `GET /ws` без `Upgrade`: общий сервер — `404`, отдельный — `426` | запрос `fetch` |
| сообщения long polling и SSE на общем сервере не смешиваются | общий сервер, оба протокола |
| `res.status(200)` без `json` оставляет `POST` висеть | `fetch` с таймаутом |
| подписки `once` без `off` копятся (`listeners=3`), с `off` — `0`; `res.on === EventEmitter.prototype.on` | запуск Node |
| 11-й слушатель — `MaxListenersExceededWarning` | запуск Node |
| `void f()` с исключением в `async`-функции завершает процесс с кодом 1 | запуск Node |
| цикл опроса: ошибка → повтор в том же цикле, выход по `abort` | скрипт с подменённым `getMessage` |
| без курсора второе из двух быстрых сообщений теряется; с курсором доходят оба | два одновременных `POST` |
| long polling: первый `GET` без `since`, `204` через 25 с, `400` на неверный `since` и текст, история 100, курсор из будущего | запросы `fetch` |
| повторяющийся `?since=1&since=2` в Express 5 — массив, ответ `400` | запрос `fetch` |
| `res.json` завершает ответ, второй — `ERR_HTTP_HEADERS_SENT`; `write(объект)` — `ERR_INVALID_ARG_TYPE` | запуск Express |
| разбор `text/event-stream`: без `data:`, без пустой строки, многострочные `data`, перевод строки в тексте, пробел после двоеточия | `EventSource` на тестовом сервере |
| без `flushHeaders` `onopen` ждёт первого `write` (2051 мс), с ним — 6 мс; `headersSent === true` в обоих случаях | `EventSource` на тестовом сервере |
| SSE: 12 клиентов, без предупреждения, один `POST` доставлен всем | 12 `EventSource` |
| `EventSource` присылает `Last-Event-ID` при переподключении; сервер досылает после него; неверный — `200` без досылки | тестовый сервер, запросы с заголовком |
| `: ping` не вызывает `onmessage` | `EventSource`, 16 с ожидания |
| ответ 404 закрывает `EventSource` (`readyState === 2`) | `EventSource` |
| `data` в `ws` 8 — `Buffer` для текстовых и двоичных кадров, различает `isBinary`; `send(Buffer)` доставляет `Blob` | клиент `WebSocket` Node 24 |
| `Buffer.from([0xff, 0xfe]).toString()` → `'��'` | запуск Node |
| `JSON.parse` без `try` в обработчике `message` роняет процесс, клиенты получают 1006 | сервер и клиент |
| без `ws.on('error')`: `maxPayload` и невалидный UTF-8 роняют процесс; с ним — закрытие 1009 / 1007, сервер жив | сервер с обработчиком и без, клиент `ws` с ручной отправкой байтов |
| `emit('error')` без слушателя бросает, асинхронный — `uncaughtException` | запуск Node |
| `path: '/ws'`: другой путь — `400` | клиент `WebSocket` |
| `send` в `CONNECTING` — `InvalidStateError`; `close()` в `CONNECTING` — `close` 1006 без `onopen`, сервер соединения не видит | клиент `WebSocket` Node 24 |
| протокол `join`/`message`: подмена имени, сообщение до входа, повторный `join`, длины, `1008 Invalid join`, `disconnection`, UUID от сервера | сервер и клиенты `WebSocket` |
| кадр `ping('abc')` — `0x89 0x03 0x61 0x62 0x63`; клиент `WebSocket` отвечает `pong` автоматически, `onmessage` не вызывается | сырой TCP-клиент, клиент `WebSocket` |
| heartbeat: клиент без `pong` (`autoPong: false`) отключён через 59 с, остальные получили `disconnection` | клиент `ws` |
| на молчащем клиенте `close()` → `close` через 30,01 с, `terminate()` — через 0,00 с; `closeTimeout` 30 000 мс | сырой TCP-клиент, `node_modules/ws/lib/websocket.js` |
| комнаты: изоляция, `disconnection` только своей комнате, неверные комнаты — 1008, повторный вход в удалённую комнату | четыре клиента в двух комнатах |
| `[\p{L}\p{N}_-]` — `SyntaxError` с флагом `v`, `[\p{L}\p{N}_\-]` работает с `u` и `v` | `new RegExp` в Node |
| Origin: свой / чужой / без `Origin` для HTTP, preflight и WebSocket; `CLIENT_ORIGINS` с пробелами | общий и отдельный сервер, клиент `ws` с опцией `origin` |
| `cors` по умолчанию разрешает в preflight все методы | ответ на `OPTIONS` |
| `verifyClient` — «Usage is discouraged», рекомендуется `upgrade` | документация `ws` (`doc/ws.md`) |
| типизированный `EventEmitter` ловит опечатку в имени события и неверный аргумент | `tsc` на пробном файле |
| обработчик в `@types/express` 5 возвращает `unknown`, `return res.json()` компилируется | `tsc` на пробном файле |
| переподключение WebSocket после перезапуска сервера, статус в интерфейсе | вручную в браузере |

**Что не проверялось запуском:** поведение браузера, которое требует ручного взаимодействия, кроме переподключения WebSocket. Это отображение `pattern` и подсказки `title`, вкладка EventStream в DevTools, объявление `role="status"` скринридером. Эти утверждения опираются на спецификации и документацию из списка ниже.

## Источники

- RFC 6455. The WebSocket Protocol — https://datatracker.ietf.org/doc/html/rfc6455
- HTML Living Standard: Server-sent events — https://html.spec.whatwg.org/multipage/server-sent-events.html
- HTML Living Standard: атрибут `pattern` — https://html.spec.whatwg.org/multipage/input.html#the-pattern-attribute
- MDN: Using server-sent events — https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- MDN: WebSocket API — https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- MDN: CORS — https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN: заголовок `Origin` — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin
- MDN: флаг `v` (unicodeSets) — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets
- Express 5 API — https://expressjs.com/en/5x/api.html
- Express: обработка ошибок — https://expressjs.com/en/guide/error-handling.html
- ws — https://github.com/websockets/ws
- cors — https://github.com/expressjs/cors
- React — https://react.dev
- React Router — https://reactrouter.com
- Vite — https://vite.dev
- TypeScript — https://www.typescriptlang.org/docs/
- Node.js: events — https://nodejs.org/api/events.html
- Node.js: запуск TypeScript — https://nodejs.org/api/typescript.html
- Node.js: `--env-file` — https://nodejs.org/api/cli.html#--env-fileconfig
