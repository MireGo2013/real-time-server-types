import { Link } from 'react-router'
import MessageForm from '../../components/MessageForm/MessageForm.tsx'
import MessageList from '../../components/MessageList/MessageList.tsx'
import { MAX_TEXT_LENGTH } from '../../config.ts'
import { useWebSocket, type ConnectionStatus } from '../../hooks/useWebSocket.ts'
import styles from './WebSocketPage.module.scss'

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Подключение…',
  open: 'В сети',
  reconnecting: 'Нет связи, переподключаюсь…',
  rejected: 'Сервер отклонил вход',
}

type Props = {
  room: string
  username: string
}

// часть страницы WebSocketPage, отдельно не используется
const WebSocketChat = ({ room, username }: Props) => {
  const { messages, status, sendMessage } = useWebSocket(username, room)

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Комната {room}</h1>
        <Link className={styles.link} to="/websocket">
          Другая комната
        </Link>
      </div>
      {/* role="status" — скринридер объявит смену статуса, не перехватывая фокус */}
      <p className={status === 'open' ? styles.status : `${styles.status} ${styles.offline}`} role="status">
        {STATUS_LABELS[status]}
      </p>
      <MessageForm onSend={sendMessage} maxLength={MAX_TEXT_LENGTH} disabled={status !== 'open'} />
      <MessageList messages={messages} />
    </main>
  )
}

export default WebSocketChat
