import { useCallback } from 'react';
import { useApi } from './useHttp';
import { IChat, IMessage } from '@/types'
import useAuth from '@/context/auth-context';

export const useChat = () => {
    const { request } = useApi();
    const user = useAuth();
    console.log("user chat user:", user)

    const createSupportChat = useCallback(async ( senderId: string ) => {
        try {
            const res = await request(`chat/create-support-chat`,
                'POST',
                JSON.stringify({ senderId }),
                {
                    "Content-Type":"application/json",
                    Authorization: `Bearer ${user.jwtToken}`
                }
            )
            const data = await res.json();
            return data;
        } catch(err) {
            console.log(err);
        }
    }, []);

    type GetChatsPromiseResult = {
        chats: IChat[];
        page: number;
        totalChats: number;
        totalPages: number;
        limit: number;
    }
    
    const getChats = useCallback(async (adminId: string, page: number, limit: number, order:number): Promise<GetChatsPromiseResult | void> => {
        try {
            console.log("user chat user:", user.jwtToken)
            const response = await request(
                `chat/get-chats?userId=${adminId}&page=${page}&limit=${limit}&order=${order}`,
                'GET',
                null,
                {
                    Authorization: `Bearer ${user.jwtToken}`
                }
             );
            return {
                chats: response.chats,
                page: response.page,
                totalChats: response.totalChats,
                limit: response.limit,
                totalPages: response.totalPages,
            }
        } catch(err) {
            console.log(err)
        }
    }, [request]);
    
    type GetChatsMessagesPromiseResult = {
        chatMessages: IMessage[];
        page: number;
        totalMessages: number;
        totalPages: number;
        limit: number;
    }
    
    const getChatMessages = useCallback(async (chatId: string): Promise<GetChatsMessagesPromiseResult| void> => {
        try {
            const res = await request(
                `chat/get-chat-messages?chatId=${chatId}`,
                'GET',
                null,
                {
                    Authorization: `Bearer ${user.jwtToken}`
                }
            );
            return {
                chatMessages: res.chatMessages ?? [],
                page: res.page,
                totalMessages: res.totalMessages,
                limit: res.limit,
                totalPages: res.totalPages,
            }
        } catch(err) {
            console.log(err)
        }
    }, [request]);
    
    const updateChat = useCallback(async (chatId: string, senderId: string, text: string) => {
        try {
            const res = await request(`chat/update-chat`,
                'POST',
                JSON.stringify({ chatId, senderId, text }),
                {
                    "Content-Type":"application/json",
                    Authorization: `Bearer ${user.jwtToken}`
                }
            )
            return res;
        } catch(err) {
            console.log(err);
        }
    }, [request]);
    
    const markSupportComplete = useCallback(async (chatId: string) => {
        console.log(chatId)
        try {
            const res = await request(`chat/mark-chat-complete`, 
                'POST',
                JSON.stringify({ chatIsComplete: true, chatId }),
                {
                    "Content-Type":"application/json",
                    Authorization: `Bearer ${user.jwtToken}`
                }
            )
            const data = await res.json();
            return data;
        } catch(err) {
            console.log(err);
        }
    }, [])

    return {
        getChats,
        getChatMessages,
        updateChat,
        markSupportComplete,
        createSupportChat
    }
    
}