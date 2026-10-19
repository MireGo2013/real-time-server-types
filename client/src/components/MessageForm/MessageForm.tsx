import { useState, type FormEvent } from 'react'
import styles from './MessageForm.module.scss'

type Props = {
  // синхронная (WebSocket, вход) или асинхронная (fetch); исключение — поле не очищается
  onSend: (text: string) => void | Promise<void>
  placeholder?: string
  submitLabel?: string
  maxLength?: number
  // проверка браузером до onSubmit: не совпало — форма не отправится, браузер покажет title
  pattern?: string
  title?: string
  // отправлять некуда (например, нет соединения)
  disabled?: boolean
}

const MessageForm = ({
  onSend,
  placeholder = 'Сообщение',
  submitLabel = 'Отправить',
  maxLength,
  pattern,
  title,
  disabled = false,
}: Props) => {
  const [value, setValue] = useState('')
  // пока fetch ждёт ответа, повторный Enter отправил бы то же сообщение второй раз
  const [sending, setSending] = useState(false)

  const submitHandler = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const text = value.trim()
    if (!text || sending || disabled) return

    setSending(true)
    try {
      await onSend(text)
      setValue('')
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submitHandler}>
      {/* readOnly, а не disabled, на время отправки: disabled сбрасывает фокус, и после ответа
          пришлось бы снова щёлкать в поле */}
      <input
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        type="text"
        placeholder={placeholder}
        maxLength={maxLength}
        pattern={pattern}
        title={title}
        readOnly={sending}
        disabled={disabled}
      />
      <button className={styles.button} type="submit" disabled={disabled || sending}>
        {submitLabel}
      </button>
    </form>
  )
}

export default MessageForm
