import React, { useState } from "react";

import ExpenseForm from "@/components/Forms/ExpensesForm";
import IncomeForm from "@/components/Forms/IncomeForm";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Box, Button } from "@mui/material";
import SupportChat from "@/components/Chat/SupportChat";
import ChatBox from "@/components/Chat/ChatBox";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useChat } from "@/hooks/chats";
import { useRouter } from 'next/router';
import { useQuery } from "@tanstack/react-query";
import useAuth from "@/context/auth-context";

const Chats = () => {
  const auth = useAuth();
  const id = auth.id;
  const { getChatMessages, markSupportComplete } = useChat();
  const [chatId, setChatId] = useState<string>("");

  const { data: chatMessages, isLoading: isLoadingMessage } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => getChatMessages(chatId),
    enabled: !!chatId && auth.hydrated && !!auth.jwtToken
  })

  return (
    <ProtectedRoute>
    <Container maxWidth="lg">
  <Grid container direction="row" spacing={2}>
    <Grid size={{ xs: 7 }}>
      <SupportChat onSelect={(id: string) => setChatId(id)} />
    </Grid>
    <Divider orientation="vertical" flexItem />
    <Grid size={{ xs: 4 }}>
      <Stack alignItems="flex-end" sx={{ paddingRight: 1, margin: '0.5rem '}}>
        <Button variant="outlined">
        <Typography>Mark Support Complete</Typography>
        </Button>
      </Stack>
      <Box
        sx={{
          border: "1px solid rgb(201, 201, 201)",
          borderRadius: 2,
          minHeight: 500,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ChatBox
        chatId={chatId}
        myId={id} 
        chatMessages={chatMessages?.chatMessages} 
        isLoading={isLoadingMessage} />  
      </Box>
    </Grid>
  </Grid>
</Container>
    </ProtectedRoute>

  );
};
export default Chats;
