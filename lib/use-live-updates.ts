import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

import { API_BASE } from "./api-client";

type Handlers = Record<string, (payload: any) => void>;

/**
 * Subscribes to a set of socket.io events for as long as the calling screen
 * is mounted, and reports whether the socket is currently connected — mirrors
 * the plain `io(API_BASE)` + `.on(...)` pattern already used in
 * app/order-tracking/[id].jsx, just reusable across the admin screens that
 * want a live "•live" indicator (dashboard, orders, reservations).
 */
export function useLiveUpdates(handlers: Handlers): "live" | "offline" {
  const [status, setStatus] = useState<"live" | "offline">("offline");
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket: Socket = io(API_BASE, { transports: ["websocket"] });

    socket.on("connect", () => setStatus("live"));
    socket.on("disconnect", () => setStatus("offline"));
    socket.on("connect_error", () => setStatus("offline"));

    const bound: Record<string, (payload: any) => void> = {};
    for (const event of Object.keys(handlersRef.current)) {
      const fn = (payload: any) => handlersRef.current[event]?.(payload);
      bound[event] = fn;
      socket.on(event, fn);
    }

    return () => {
      for (const event of Object.keys(bound)) socket.off(event, bound[event]);
      socket.disconnect();
    };
    // Re-subscribing on every render would thrash the connection; the handler
    // map's *keys* (which events to listen for) are stable across a screen's
    // lifetime even though the closures inside it change each render, which
    // is exactly what handlersRef is for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}
