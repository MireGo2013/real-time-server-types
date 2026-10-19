import {createApp} from "../shared/createApp.ts";
import {longPollingRouter} from "./router.ts";

const PORT = Number(process.env.PORT) || 3001;

const app = createApp({'/long-polling': longPollingRouter});

// в Express 5 колбэк вызывается и при ошибке (порт занят): без проверки — «started» и тихий выход
app.listen(PORT, (error) => {
    if (error) throw error;
    console.log(`Long polling server started on port ${PORT}`);
})
