import { useState } from 'react';
import { Lobby } from './components/Lobby';
import { GameScreen } from './components/GameScreen';
import type { RoomOptions } from './types/game';
import './App.css';

export default function App() {
  const [session, setSession] = useState<RoomOptions | null>(null);

  return (
    <div className="app">
      <header className="app__bar">
        <strong>HIDE @ KYOWON</strong>
        <span className="app__phase">시작 연출 · 숨는 시간 · 채팅</span>
      </header>
      <main className="app__stage">
        {session ? (
          <GameScreen options={session} onLeave={() => setSession(null)} />
        ) : (
          <Lobby onEnter={setSession} />
        )}
      </main>
    </div>
  );
}
