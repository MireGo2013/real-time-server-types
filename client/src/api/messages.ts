// у long polling и SSE отправка одинаковая, отличается только адрес: /long-polling/... или /sse/...
// id не отправляем: его ставит сервер
export const postChatMessage = async (url: string, text: string) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  })
  if (!res.ok) throw new Error(`Не удалось отправить сообщение: HTTP ${res.status}`)
}
