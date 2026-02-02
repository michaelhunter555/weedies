"use client";

import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import { useMutation, useQuery } from "@tanstack/react-query";
import Pagination from "@mui/material/Pagination";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useChat } from "@/hooks/chats";

import { useInvalidateQuery } from "@/hooks/invalidate-query";
import useAuth from "@/context/auth-context";

const tempImg =
  "https://res.cloudinary.com/dbbwuklgb/image/upload/v1753549795/placeholder_bkidl9.png";

  interface IMessages {
    onSelect: (id: string) => void;
  }
const Messages = ({ onSelect }: IMessages) => {
  const router = useRouter();
  const auth = useAuth();
  const user = auth
  const { getChats, createSupportChat } = useChat();
  const { invalidateQuery } = useInvalidateQuery();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const { data: chats, isLoading } = useQuery({
    queryKey: ["get-all-chats", user?.id, page, limit],
    queryFn: () => getChats(user.id, page, limit, -1),
    enabled: !!user?.id && user.hydrated && !!user.jwtToken,
  });

  console.log("Chats", chats)

  const supportChat = useMutation({
    mutationKey: ["create-support-chat"],
    mutationFn: (userId: string) => createSupportChat(userId),
  });

  const handleStartChat = async () => {
    setIsCreatingChat(true);
    if (!user?.id) return;
    supportChat.mutate(user.id, {
      onSuccess: async (data) => {
        if (data.ok) {
          await invalidateQuery("get-all-chats");
          setTimeout(() => {
            router.push(`/messages/${data.chatId}/message`);
            setIsCreatingChat(false);
          }, 800);
        }
      },
      onError: () => setIsCreatingChat(false),
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography fontWeight={600} fontSize={20}>
          Messages
        </Typography>
        <Button
          variant="contained"
          startIcon={!isCreatingChat && <ChatIcon />}
          onClick={handleStartChat}
        >
          {isCreatingChat ? <CircularProgress size={16} color="inherit" /> : "Start Chat"}
        </Button>
      </Stack>

      {isLoading ? (
        <Typography>Loading…</Typography>
      ) : chats?.chats?.length ? (
        <>
        {chats.chats.map((c: any) => {
          const participant = c.participantInfo.find(
            (p: any) => p.role === "admin"
          );
          const receiver = c.participantInfo.find(
            (p: any) => p.role !== "admin"
          );
          const last = new Date(c.lastMessageTime).toLocaleString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "numeric",
          });

          return (
            <Box key={c._id} mb={2}>
              <Stack
                direction="row"
                gap={2}
                alignItems="center"
                onClick={() => onSelect(c._id)}
               
                style={{ textDecoration: "none" }}
              >
                <Avatar src={receiver?.image ?? tempImg} />
                <Box flex={1}>
                  <Typography fontWeight={600}>{receiver?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.lastMessage}
                  </Typography>
                </Box>
                <Typography variant="caption">{last}</Typography>
              </Stack>
              <Divider />
            </Box>
          );
        })}
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Pagination
            page={page}
            count={Math.max(1, Math.ceil((chats?.totalChats || 0) / limit))}
            onChange={(_e, value) => setPage(value)}
            shape="rounded"
            color="primary"
          />
        </Box>
        </>
      ) : (
        <Typography sx={{ opacity: 0.7, textAlign: "center" }}>No Chats Yet.</Typography>
      )}
    </Container>
  );
};

export default Messages;

