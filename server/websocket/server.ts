import {createWebSocketServer} from "./webSocketServer.ts";

const PORT = Number(process.env.PORT) || 3001;

// ws без Express: на запрос без Upgrade его внутренний HTTP-сервер отвечает 426 Upgrade Required
const wss = createWebSocketServer({port: PORT});

wss.on('listening', () => {
    console.log(`WebSocket server started on port ${PORT}`);
})
