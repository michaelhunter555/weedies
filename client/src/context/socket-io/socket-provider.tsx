"use client";
import { createContext, useContext, useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";
import { useAuth } from "../auth-context";


const url = String(process.env.NEXT_PUBLIC_SOCKET_IO_ENDPOINT)
const socketEndpoint = url;

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
const auth = useAuth();
const [socket, setSocket] = useState<Socket | null>(null);
const [isConnected, setIsConnected] = useState(false);

useEffect(() => {
  let socketInstance: Socket | null = null;

    const connectSocket = async () => {
      const token = auth?.accessToken ?? "";

      if(!token) {
        console.log("❌ No token found");
        return;
      }
     
      socketInstance = io(socketEndpoint, {
          transports: ["websocket"],
          auth: { token },
      });

      socketInstance.on("connect", () => {
          console.log("🔌 Connected to Instance server");
          setIsConnected(true);
          setSocket(socketInstance);
      });
  
  
      socketInstance.on("disconnect", () => {
        console.log("❌ Disconnected from socket server");
        setIsConnected(false);
        setSocket(null);
      });
  
      socketInstance.on('connect_error', (err) => {
          console.log('❌❌❌ Socket connection error:', err.message);
        });
    };

    connectSocket();

    return () => {
      if(socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [auth?.user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);