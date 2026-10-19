import {MAX_TEXT_LENGTH} from "./limits.ts";

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

export const INVALID_TEXT_ERROR = `message must be 1..${MAX_TEXT_LENGTH} characters`;
