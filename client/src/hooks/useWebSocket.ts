import { useCallback, useEffect, useRef, useState } from 'react'
import { POLICY_VIOLATION, WS_URL, parseEvent } from '../api/webSocket.ts'
import type { ChatMessage } from '../types/message.ts'
import type { ClientEvent, ServerEvent } from '../types/wsEvent.ts'

// connecting — первое подключение, reconnecting — связь пропала и ждём повтора,
// rejected — сервер закрыл с 1008 (не прошла проверка join), повторов не будет
export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'rejected'

// задержка перед повтором растёт вдвое: 1, 2, 4, 8 с, дальше 10 с — сервер, который
// перезапускается или лежит, не получит запрос на подключение от каждого клиента каждую секунду
const RECONNECT_BASE_DELAY = 1000
const RECONNECT_MAX_DELAY = 10_000

const toChatMessage = (e: ServerEvent): ChatMessage => {
  switch (e.event) {
    case 'connection':
      return { id: e.id, message: `Пользователь ${e.username} подключился` }
    case 'disconnection':
      return { id: e.id, message: `Пользователь ${e.username} вышел` }
    case 'message':
      return { id: e.id, message: `${e.username}: ${e.text}` }
  }
}

// новое соединение на каждую пару имя + комната: сменить комнату — переподключиться
export const useWebSocket = (username: string, room: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // переменные одного монтирования: у StrictMode-копии эффекта свои
    let socket: WebSocket
    let attempt = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      socket = new WebSocket(WS_URL)
      socketRef.current = socket

      // слать можно только после открытия: в CONNECTING send() бросает InvalidStateError.
      // join — и при первом подключении, и после каждого переподключения: сервер нового соединения не знает
      socket.onopen = () => {
        attempt = 0
        setStatus('open')
        const event: ClientEvent = { event: 'join', username, room }
        socket.send(JSON.stringify(event))
      }

      socket.onmessage = (e: MessageEvent<unknown>) => {
        const event = parseEvent(e.data)
        if (!event) return console.error('WebSocket: неизвестное сообщение', e.data)
        setMessages((prev) => [toChatMessage(event), ...prev])
      }

      // за error всегда следует close, подробностей браузер не даёт — всё решаем в onclose
      socket.onclose = (e) => {
        socketRef.current = null
        if (e.code === POLICY_VIOLATION) {
          console.error(`WebSocket: сервер отклонил вход — ${e.reason}`)
          setStatus('rejected')
          return
        }
        // 1006 и прочие: сервер перезапустился (node --watch), пропала сеть, heartbeat сервера
        setStatus('reconnecting')
        const delay = Math.min(RECONNECT_BASE_DELAY * 2 ** attempt, RECONNECT_MAX_DELAY)
        attempt++
        retryTimer = setTimeout(connect, delay)
      }
    }

    connect()

    // закрываем сами — переподключаться и менять статус не нужно, поэтому onclose обнуляем.
    // В StrictMode сокет закрывается ещё в CONNECTING: это error + close 1006, без обнуления — лишний повтор
    return () => {
      clearTimeout(retryTimer)
      socket.onclose = null
      socket.close()
      socketRef.current = null
    }
  }, [username, room])

  // имя и комнату сервер помнит с join — в сообщении только текст
  const sendMessage = useCallback((text: string) => {
    const socket = socketRef.current
    if (socket?.readyState !== WebSocket.OPEN) {
      throw new Error('Нет соединения с сервером')
    }

    const event: ClientEvent = { event: 'message', text }
    socket.send(JSON.stringify(event))
  }, [])

  return { messages, status, sendMessage }
}
