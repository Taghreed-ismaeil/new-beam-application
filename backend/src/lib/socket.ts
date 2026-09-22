import { Server as IOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: IOServer | null = null;

export function initSocket(httpServer: HttpServer) {
  io = new IOServer(httpServer, { cors: { origin: '*' } });
  return io;
}

export function emitOrderEvent(event: 'order:new' | 'order:updated', payload: unknown) {
  io?.emit(event, payload);
}

export function emitReservationEvent(event: 'reservation:new' | 'reservation:updated', payload: unknown) {
  io?.emit(event, payload);
}

export function emitTableEvent(event: 'table:updated', payload: unknown) {
  io?.emit(event, payload);
}
