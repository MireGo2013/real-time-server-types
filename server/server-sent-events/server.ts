import {createApp} from "../shared/createApp.ts";
import {sseRouter} from "./router.ts";

const PORT = Number(process.env.PORT) || 3001;

const app = createApp({'/sse': sseRouter});

// в Express 5 колбэк вызывается и при ошибке (порт занят): без проверки — «started» и тихий выход
app.listen(PORT, (error) => {
    if (error) throw error;
    console.log(`SSE server started on port ${PORT}`);
})
