import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { supabase } from "./supabase";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Next.js
  },
});

io.on("connection", (socket) => {
  console.log("a user connected");
  const { userId, userName } = socket.handshake.auth;

  // Join room event
  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
    socket.data = { userId, userName, roomId };
    console.log(`${socket.id} User joined room ${roomId}`);

    socket.to(roomId).emit("user-joined", { id: userId, name: userName });

    const users = getOnlineUsers(roomId);
    io.to(roomId).emit("online-users", users);
  });

  // Send message to all users in the room
  async function saveMessage(
    roomId: string,
    userId: string,
    content: string,
    type: "user" | "ai" | "system",
  ) {
    const { error } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      user_id: userId,
      content,
      type,
    });
    return !error;
  }

  socket.on(
    "send-message",
    async (data: { roomId: string; content: string }) => {
      console.log(`${socket.id} sent message to room ${data.roomId}`);

      const message = {
        id: crypto.randomUUID(),
        userId,
        userName,
        content: data.content,
        type: "user",
        createdAt: new Date().toISOString(),
      };

      io.to(data.roomId).emit("new-message", message);

      await saveMessage(data.roomId, userId, data.content, "user");

      // @ai mention detection
      if (data.content.includes("@ai")) {
      }
    },
  );

  // Typing event
  socket.on("user-typing", ({ roomId }: { roomId: string }) => {
    socket.to(roomId).emit("user-typing", userName);
  });

  socket.on("disconnect", () => {
    console.log(`${socket.id} User disconnected`);
    const { roomId } = socket.data || {};
    if (roomId) {
      socket.to(roomId).emit("user-left", userId);
      const users = getOnlineUsers(roomId);
      io.to(roomId).emit("online-users", users);
    }
  });
});

function getOnlineUsers(roomId: string) {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room) return [];
  return [...room]
    .map((socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket) return null;
      return {
        id: socket.data.userId,
        name: socket.data.userName,
      };
    })
    .filter(Boolean);
}

const PORT = 4000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
