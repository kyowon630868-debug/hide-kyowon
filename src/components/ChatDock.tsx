import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../net/Room';

/** 화면 좌하단에 겹치는 접이식 채팅 */
export function ChatDock({
  messages,
  selfId,
  onSend,
}: {
  messages: ChatMessage[];
  selfId: string;
  onSend: (text: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const seen = useRef(0);

  useEffect(() => {
    if (open) {
      seen.current = messages.length;
      setUnread(0);
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    } else {
      setUnread(messages.length - seen.current);
    }
  }, [messages, open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  }

  if (!open) {
    return (
      <button className="chatdock chatdock--closed" onClick={() => setOpen(true)}>
        💬 채팅{unread > 0 && <span className="chatdock__badge">{unread}</span>}
      </button>
    );
  }

  return (
    <div className="chatdock">
      <div className="chatdock__head">
        <span>채팅</span>
        <button onClick={() => setOpen(false)}>▾</button>
      </div>
      <div className="chatdock__log" ref={logRef}>
        {messages.slice(-40).map((m, i) => (
          <p key={i} className={`chatdock__line ${m.id === selfId ? 'is-me' : ''}`}>
            <b>{m.name}</b> {m.text}
          </p>
        ))}
      </div>
      <form className="chatdock__form" onSubmit={submit}>
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
