import MessageForm from '../../components/MessageForm/MessageForm.tsx'
import MessageList from '../../components/MessageList/MessageList.tsx'
import { sendMessage } from '../../api/serverSentEvents.ts'
import { MAX_TEXT_LENGTH } from '../../config.ts'
import { useServerSentEvents } from '../../hooks/useServerSentEvents.ts'
import styles from './ServerSentEventsPage.module.scss'

const ServerSentEventsPage = () => {
  const messages = useServerSentEvents()

  return (
    <main className={styles.page}>
      <MessageForm onSend={sendMessage} maxLength={MAX_TEXT_LENGTH} />
      <MessageList messages={messages} />
    </main>
  )
}

export default ServerSentEventsPage
