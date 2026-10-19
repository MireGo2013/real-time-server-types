import MessageForm from '../../components/MessageForm/MessageForm.tsx'
import MessageList from '../../components/MessageList/MessageList.tsx'
import { sendMessage } from '../../api/longPolling.ts'
import { MAX_TEXT_LENGTH } from '../../config.ts'
import { useLongPolling } from '../../hooks/useLongPolling.ts'
import styles from './LongPollingPage.module.scss'

const LongPollingPage = () => {
  const messages = useLongPolling()

  return (
    <main className={styles.page}>
      <MessageForm onSend={sendMessage} maxLength={MAX_TEXT_LENGTH} />
      <MessageList messages={messages} />
    </main>
  )
}

export default LongPollingPage
