import type { ChatMessage } from '../types/message.ts'

// данные из сети приходят как unknown: as ChatMessage только обещает форму, проверка — здесь
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isChatMessage = (value: unknown): value is ChatMessage =>
  isRecord(value) && typeof value.id === 'string' && typeof value.message === 'string'
