import {randomUUID} from 'node:crypto';
import type {ChatMessage} from "../types/message.ts";

// у каждого сообщения возрастающий номер — по нему клиент говорит, что уже видел
export type StoredMessage = { seq: number; message: ChatMessage };

// история в памяти: у long polling и SSE — своя у каждого
export const createMessageHistory = (size = 100) => {
    const items: StoredMessage[] = [];
    let lastSeq = 0;

    return {
        get lastSeq() {
            return lastSeq;
        },

        // id ставит сервер: у клиентов он мог совпасть, а чужому id нельзя доверять
        add(text: string): StoredMessage {
            const stored = {seq: ++lastSeq, message: {id: randomUUID(), message: text}};
            items.push(stored);
            if (items.length > size) items.shift();
            return stored;
        },

        // курсор из будущего: сервер перезапустился и нумерация началась заново —
        // всё, что есть в истории, клиент ещё не видел
        after(since: number) {
            const from = since > lastSeq ? 0 : since;
            return items.filter((m) => m.seq > from);
        },
    }
}
