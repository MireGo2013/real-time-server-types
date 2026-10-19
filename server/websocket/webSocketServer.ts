import type {Server} from 'node:http';
import {randomUUID} from 'node:crypto';
import {WebSocketServer, WebSocket} from 'ws';
import type {ClientEvent, ServerEvent} from "../types/ws.ts";
import {MAX_TEXT_LENGTH, MAX_USERNAME_LENGTH, ROOM_PATTERN} from "../shared/limits.ts";
import {isAllowedOrigin} from "../shared/origins.ts";

// раз в столько сервер шлёт ping; кто не ответил pong до следующего — соединение мертво
const HEARTBEAT_INTERVAL = 30_000;
// 1008 Policy Violation — данные нарушают правила сервера (RFC 6455, §7.4.1)
const POLICY_VIOLATION = 1008;

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

// { port } — свой HTTP-сервер внутри ws (отдельный запуск), { server } — общий с Express:
// рукопожатие — обычный GET с Upgrade: websocket, ws перехватывает его по событию 'upgrade'
export const createWebSocketServer = (target: { port: number } | { server: Server }) => {
    const wss = new WebSocketServer({
        ...target,
        path: '/ws',
        // по умолчанию 100 МиБ — один клиент может занять память сервера
        maxPayload: 16 * 1024,
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

    // TCP не сообщает о тихо пропавшем клиенте (уснул ноутбук, пропала сеть): close не придёт,
    // пока ОС не сдастся, а это минуты и часы. terminate() вызывает close сразу
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
