import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import MessageForm from '../../components/MessageForm/MessageForm.tsx'
import { MAX_USERNAME_LENGTH, ROOM_PATTERN, isValidRoom } from '../../config.ts'
import WebSocketChat from './WebSocketChat.tsx'
import styles from './WebSocketPage.module.scss'

// /websocket — выбор комнаты, /websocket/:room — вход и чат. Комната в адресе: ссылку можно отправить
const WebSocketPage = () => {
  const { room } = useParams()
  const navigate = useNavigate()
  // живёт в странице, а не в чате: при смене комнаты имя не спрашиваем заново
  const [username, setUsername] = useState<string | null>(null)

  if (room === undefined) {
    return (
      <main className={styles.page}>
        <MessageForm
          onSend={(name) => navigate(`/websocket/${encodeURIComponent(name)}`)}
          placeholder="Комната"
          submitLabel="Перейти"
          pattern={ROOM_PATTERN}
          title="До 32 символов: буквы, цифры, - и _"
        />
      </main>
    )
  }

  // адрес набрали руками или прислали битую ссылку — сервер всё равно отклонил бы такой join
  if (!isValidRoom(room)) {
    return <Navigate to="/websocket" replace />
  }

  if (username === null) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Комната {room}</h1>
        <MessageForm
          onSend={setUsername}
          placeholder="Ваше имя"
          submitLabel="Войти"
          maxLength={MAX_USERNAME_LENGTH}
        />
      </main>
    )
  }

  // key: другая комната — новый экземпляр чата, список сообщений начинается с нуля
  return <WebSocketChat key={room} room={room} username={username} />
}

export default WebSocketPage
