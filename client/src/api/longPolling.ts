import { API_URL } from '../config.ts'
import type { ChatMessage } from '../types/message.ts'
import { isChatMessage, isRecord } from '../utils/guards.ts'
import { postChatMessage } from './messages.ts'

const BASE_URL = `${API_URL}/long-polling`

// cursor — номер последнего сообщения в ответе, его передаём в следующий since
export type PollResult = {
  messages: ChatMessage[]
  cursor: number
}

const isPollResult = (value: unknown): value is PollResult =>
  isRecord(value) &&
  Array.isArray(value.messages) &&
  value.messages.every(isChatMessage) &&
  Number.isSafeInteger(value.cursor)

// since === null — первый запрос: сервер сразу вернёт текущий курсор без сообщений.
// Иначе запрос висит, пока не появится сообщение новее since, или до таймаута сервера
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
