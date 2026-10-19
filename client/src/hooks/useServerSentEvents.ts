import { useEffect, useState } from 'react'
import { SSE_URL, parseMessage } from '../api/serverSentEvents.ts'
import type { ChatMessage } from '../types/message.ts'

export const useServerSentEvents = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    const eventSource = new EventSource(SSE_URL)

    // срабатывает на каждое событие без поля event: — то, что сервер прислал как data: ...\n\n
    eventSource.onmessage = (e: MessageEvent<string>) => {
      const message = parseMessage(e.data)
      if (!message) return console.error('SSE: неизвестное сообщение', e.data)
      setMessages((prev) => [message, ...prev])
    }

    // при обрыве EventSource переподключается сам; CLOSED — сервер ответил не-200
    // или не text/event-stream, повторов больше не будет
    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        console.error('SSE: соединение закрыто окончательно')
      }
    }

    // close() рвёт соединение: на сервере срабатывает res.on('close')
    return () => eventSource.close()
  }, [])

  return messages
}
