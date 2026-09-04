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
        <span className="app__phase">Phase 4 — 힌트 · 엘리베이터 · 층 이동</span>
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
