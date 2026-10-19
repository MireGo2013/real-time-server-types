// общие для всех способов связи; клиент повторяет их в client/src/config.ts.
// Длина — в единицах UTF-16, как string.length и maxLength у <input>
export const MAX_USERNAME_LENGTH = 32;
export const MAX_TEXT_LENGTH = 1000;
// имя комнаты попадает в адрес страницы (/websocket/:room): только буквы, цифры, - и _.
// \- экранирован, чтобы тот же текст работал в pattern у <input> — браузер компилирует его с флагом v
export const ROOM_PATTERN = /^[\p{L}\p{N}_\-]{1,32}$/u;
