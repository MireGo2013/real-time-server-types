import type { ChatMessage } from '../../types/message.ts'
import styles from './MessageList.module.scss'

type Props = {
  messages: ChatMessage[]
}

const MessageList = ({ messages }: Props) => {
  return (
    <div className={styles.list}>
      {messages.map((msg) => (
        <div className={styles.message} key={msg.id}>
          {msg.message}
        </div>
      ))}
    </div>
  )
}

export default MessageList
