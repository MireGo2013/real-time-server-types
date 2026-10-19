import { API_URL } from '../config.ts'
import type { ServerEvent } from '../types/wsEvent.ts'
import { isRecord } from '../utils/guards.ts'

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
