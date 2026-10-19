// та же форма, что у сервера (server/types/ws.ts)

// клиент → сервер: имя и комната один раз при входе, дальше только текст
export type ClientEvent =
  | { event: 'join'; username: string; room: string }
  | { event: 'message'; text: string }

// сервер → участникам комнаты: id и имя ставит сервер
export type ServerEvent =
  | { event: 'connection'; id: string; username: string }
  | { event: 'message'; id: string; username: string; text: string }
  | { event: 'disconnection'; id: string; username: string }
