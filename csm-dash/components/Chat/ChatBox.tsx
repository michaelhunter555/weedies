import React, { useEffect, useRef, useState } from "react";
import { Box, Avatar, Typography, TextField, IconButton, Stack, Divider, Chip, Button } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { IMessage } from "@/types";
import { useChat } from '@/hooks/chats';
import { useMutation } from "@tanstack/react-query";
import { useInvalidateQuery } from "@/hooks/invalidate-query";
  
  interface IChatBox {
    chatMessages?: IMessage[];
    isLoading?: boolean;
    myId: string;
    chatId?: string;
  }
  
  const ChatBox = ({ chatMessages = [], isLoading, myId, chatId }: IChatBox) => {
    const { markSupportComplete, updateChat } = useChat();
    const containerRef = useRef<HTMLDivElement>(null);
    const [message, setMessage] = useState<string>("");
    const { invalidateQuery } = useInvalidateQuery()
  
    // auto-scroll
    useEffect(() => {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight });
    }, [chatMessages]);

    const endChat = useMutation({
        mutationKey: ['support-complete'],
        mutationFn: async (chatId: string) => {
            return await markSupportComplete(chatId)
        }
    });

    const handleEndChatSupport = async () => {
        if(chatId) {
            endChat.mutate(String(chatId), {
                onSuccess: async () => {
                    alert('Chat has ended');
                    await invalidateQuery('chat')
                },
                onError: (err) => {
                    console.log(err);
                }
            })
        }
    };

    const newMessage = useMutation({
        mutationKey: ['send-message'],
        mutationFn: async (p: { chatId: string, senderId: string, text: string }) => {
            const { chatId, senderId, text } = p;
            return await updateChat(chatId, senderId, text);
        }
    });

    const handleNewMessage = async () => {
        if(chatId && message.trim().length > 0) {
            newMessage.mutate({chatId, senderId: myId, text: message }, {
                onSuccess: async (data) => {
                    await invalidateQuery('chat');
                    setMessage("")
                },
                onError: (err) => {
                    console.log(err)
                }
            })
        }
    }
  
    // helper: check if date changed from previous message
    const renderMessages = (messages: IMessage[]) => {
      let lastDate: string | null = null;
      const sortedMsg = [...messages].sort((a,b) => new Date(String(a.createdAt)).getTime() - new Date(String(b.createdAt)).getTime())
  
      return sortedMsg.map((msg: IMessage) => {
        const date = new Date(String(msg.createdAt));
        const dateString = date.toDateString();
        const showDateDivider = dateString !== lastDate;
        lastDate = dateString;
  
        const isSent = msg.senderId === myId;
  
        return (
          <React.Fragment key={msg._id}>
            {showDateDivider && (
              <Box sx={{ textAlign: "center", my: 1 }}>
                <Chip label={dateString} size="small" />
              </Box>
            )}
            <Stack
              direction="row"
              justifyContent={isSent ? "flex-end" : "flex-start"}
              alignItems="flex-end"
              spacing={1}
              mb={1}
            >
              {!isSent && <Avatar sx={{ width: 30, height: 30 }} />}
              <Box
                sx={{
                  backgroundColor: isSent ? "#007AFF" : "#e5e5ea",
                  color: isSent ? "white" : "#000",
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  maxWidth: "70%",
                }}
              >
                <Typography variant="body2">{msg.text}</Typography>
                <Typography
                  variant="caption"
                  sx={{ display: "block", textAlign: "right", mt: 0.5 }}
                >
                  {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Typography>
              </Box>
            </Stack>
          </React.Fragment>
        );
      });
    };
  
    return (
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", height: 500 }}>
        <Box
          ref={containerRef}
          sx={{ flex: 1, overflowY: "auto", mb: 1 }}
        >
          {isLoading ? <Typography>Loading...</Typography> : renderMessages(chatMessages)}
        </Box>
        {/* Input area */}
        <Stack direction="row" spacing={1}>
          <TextField 
          value={message} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)} 
          fullWidth 
          placeholder="Type a message..." />
          <IconButton disabled={newMessage.isPending || message.trim().length === 0} onClick={handleNewMessage}>
            <SendIcon />
          </IconButton>
        </Stack>
       
      </Box>
    );
  };
  
export default ChatBox;