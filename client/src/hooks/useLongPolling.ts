import { useEffect, useState } from 'react'
import { getMessages } from '../api/longPolling.ts'
import type { ChatMessage } from '../types/message.ts'

const RETRY_DELAY = 500

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const useLongPolling = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    // курсор живёт в замыкании эффекта: у каждого монтирования свой, StrictMode их не смешивает
    let cursor: number | null = null

    // цикл, а не рекурсия: каждый ответ — сразу новый запрос
    const poll = async () => {
      while (!signal.aborted) {
        try {
          const result = await getMessages(cursor, signal)
          // null — таймаут: переспрашиваем с тем же курсором
          if (!result) continue

          cursor = result.cursor
          // сервер отдаёт от старых к новым, список показывает новые сверху
          if (result.messages.length > 0) {
            setMessages((prev) => [...result.messages.toReversed(), ...prev])
          }
        } catch (e) {
          if (signal.aborted) return
          console.error(e)
          await wait(RETRY_DELAY)
        }
      }
    }

    void poll()

    // abort() обрывает висящий запрос: на сервере срабатывает res.on('close')
    return () => controller.abort()
  }, [])

  return messages
}
