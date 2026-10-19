import { API_URL } from '../config.ts'
import type { ChatMessage } from '../types/message.ts'
import { isChatMessage } from '../utils/guards.ts'
import { postChatMessage } from './messages.ts'

const BASE_URL = `${API_URL}/sse`

// один долгий GET: сервер держит ответ открытым и дописывает в него события
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
