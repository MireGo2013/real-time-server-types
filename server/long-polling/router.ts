import {Router, json} from 'express';
import {EventEmitter} from "node:events";
import {createMessageHistory} from "../shared/messageHistory.ts";
import {INVALID_TEXT_ERROR, parseMessageText, parseSeq} from "../shared/parse.ts";

// меньше типичного таймаута прокси и балансировщиков (30–60 с): отвечаем 204 раньше, чем нас оборвут
const POLL_TIMEOUT = 25_000;

const history = createMessageHistory();

// событие без данных: «появилось новое», ответ ожидающие собирают из history сами
const emitter = new EventEmitter<{ newMessage: [] }>();
// каждый висящий запрос — слушатель; без этого на 11-м MaxListenersExceededWarning
emitter.setMaxListeners(0);

// подключается с префиксом /long-polling — и в отдельном сервере, и в общем
export const longPollingRouter = Router();
longPollingRouter.use(json());

// ?since=N — номер последнего полученного сообщения. Без since — только узнать текущий курсор:
// клиент пришёл впервые, истории при входе нет (как в SSE и WebSocket)
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
