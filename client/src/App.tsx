import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import Tabs from './components/Tabs/Tabs.tsx'
import LongPollingPage from './pages/LongPollingPage/LongPollingPage.tsx'
import ServerSentEventsPage from './pages/ServerSentEventsPage/ServerSentEventsPage.tsx'
import WebSocketPage from './pages/WebSocketPage/WebSocketPage.tsx'

const App = () => {
  return (
    <BrowserRouter>
      <Tabs />
      <Routes>
        <Route path="/long-polling" element={<LongPollingPage />} />
        <Route path="/server-sent-events" element={<ServerSentEventsPage />} />
        {/* один маршрут с необязательной комнатой: при переходе между комнатами страница не
            перемонтируется и помнит имя */}
        <Route path="/websocket/:room?" element={<WebSocketPage />} />
        <Route path="*" element={<Navigate to="/long-polling" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
