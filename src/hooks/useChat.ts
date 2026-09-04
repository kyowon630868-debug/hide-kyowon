import { useEffect, useState } from 'react';
import type { ChatMessage, Room } from '../net/Room';

const MAX = 60;

/** 방의 채팅 메시지를 모아 최근 것만 보관한다. */
export function useChat(room: Room | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!room) return;
    setMessages([]);
    return room.on('chat', (msg) => {
      setMessages((prev) => [...prev, msg].slice(-MAX));
    });
  }, [room]);

  return {
    messages,
    send: (text: string) => room?.sendChat(text),
  };
}
