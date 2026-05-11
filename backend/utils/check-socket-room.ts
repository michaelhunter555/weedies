
export const checkRoom = (io: any, userId: string) => {
    return io.sockets.adapter.rooms.get(userId)?.size > 0 || false;
  };
  