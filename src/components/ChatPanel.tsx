import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../net/Room';

export function ChatPanel({
  messages,
  selfId,
  onSend,
}: {
  messages: ChatMessage[];
  selfId: string;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  }

  return (
    <div className="chat">
      <div className="chat__log" ref={logRef}>
        {messages.length === 0 && <p className="chat__empty">채팅으로 대화하세요</p>}
        {messages.map((m, i) => (
          <p key={i} className={`chat__line ${m.id === selfId ? 'is-me' : ''}`}>
            <b>{m.name}</b> {m.text}
          </p>
        ))}
      </div>
      <form className="chat__form" onSubmit={submit}>
        <input
          value={text}
          maxLength={200}
          placeholder="메시지…"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">▶</button>
      </form>
    </div>
  );
}
