import {Router, json} from 'express';
import {EventEmitter} from "node:events";
import {createMessageHistory, type StoredMessage} from "../shared/messageHistory.ts";
import {INVALID_TEXT_ERROR, parseMessageText, parseSeq} from "../shared/parse.ts";

// прокси и балансировщики закрывают ответ, по которому давно не шли байты (часто 30–60 с)
const HEARTBEAT_INTERVAL = 15_000;

const history = createMessageHistory();

const emitter = new EventEmitter<{ newMessage: [StoredMessage] }>();
// каждый открытый /connect — отдельный слушатель; без этого на 11-м клиенте MaxListenersExceededWarning
emitter.setMaxListeners(0);

// подключается с префиксом /sse — и в отдельном сервере, и в общем
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
