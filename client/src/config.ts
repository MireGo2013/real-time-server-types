// hostname страницы, а не localhost: с другого устройства в сети localhost — это само устройство
export const API_URL = `http://${location.hostname}:3001`

// как на сервере (server/shared/limits.ts): длиннее сервер не примет
export const MAX_USERNAME_LENGTH = 32
export const MAX_TEXT_LENGTH = 1000
// строка, а не RegExp: нужна и для pattern у <input> (браузер сам добавляет ^ и $ и флаг v),
// и для проверки адреса. \- экранирован — с флагом v неэкранированный дефис в [...] — ошибка
export const ROOM_PATTERN = String.raw`[\p{L}\p{N}_\-]{1,32}`
export const isValidRoom = (room: string) => new RegExp(`^(?:${ROOM_PATTERN})$`, 'u').test(room)
