"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import io, { Socket } from "socket.io-client";

import { useAuth } from "../auth-context";

/**
 * Resolve the socket.io endpoint.
 *
 * Prefer an explicit `NEXT_PUBLIC_SOCKET_IO_ENDPOINT` when set, otherwise
 * fall back to `NEXT_PUBLIC_API_KEY` with the `/api` suffix stripped — the
 * socket.io server lives at the HTTP server root, not under `/api`.
 */
function resolveSocketEndpoint(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_IO_ENDPOINT;
  if (explicit) return explicit;

  const raw = process.env.NEXT_PUBLIC_API_KEY || "";
  if (!raw) return "";
  return raw.replace(/\/api\/?$/, "");
}

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const SocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const auth = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const endpoint = resolveSocketEndpoint();
  const token = auth?.accessToken;
  const userId = auth?.user?.id;

  useEffect(() => {
    // No endpoint / not logged in → tear down any open socket and idle.
    if (!endpoint || !token || !userId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      return;
    }

    // eslint-disable-next-line no-console
    console.log("[Socket] Connecting as", userId);

    const instance = io(endpoint, {
      transports: ["websocket"],
      auth: { token },
      // Let socket.io handle reconnect with backoff instead of DIY logic.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = instance;

    instance.on("connect", () => {
      // eslint-disable-next-line no-console
      console.log("[Socket] Connected", instance.id);
      setSocket(instance);
      setIsConnected(true);
    });

    instance.on("disconnect", (reason) => {
      // eslint-disable-next-line no-console
      console.log("[Socket] Disconnected", reason);
      setIsConnected(false);
    });

    instance.on("connect_error", (err) => {
      // eslint-disable-next-line no-console
      console.log("[Socket] Connect error:", err.message);
    });

    return () => {
      instance.removeAllListeners();
      instance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [endpoint, token, userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
