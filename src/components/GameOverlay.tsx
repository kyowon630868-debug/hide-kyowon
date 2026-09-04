import { useEffect, useState, type ReactNode } from 'react';
import { GameRules } from '../game-logic/rules';
import type { GameState } from '../game-logic/types';
import type { Proximity, RosterEntry } from '../types/game';

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const PROX = {
  0: { dot: '🟢', text: '안전', cls: 'safe' },
  1: { dot: '🟡', text: '주의', cls: 'warn' },
  2: { dot: '🔴', text: '위험', cls: 'danger' },
} as const;

export function GameOverlay({
  state,
  proximity,
  roster,
  selfId,
  isHost,
  onStart,
  onRestart,
}: {
  state: GameState;
  proximity: Proximity;
  roster: RosterEntry[];
  selfId: string;
  isHost: boolean;
  onStart: () => void;
  onRestart: () => void;
}) {
  const now = useNow(state.phase === 'HIDING' || state.phase === 'PLAYING');
  const role = GameRules.roleOf(state, selfId);
  const nameOf = (id: string) => roster.find((r) => r.id === id)?.name ?? '손님';

  if (state.phase === 'WAITING') {
    const enough = roster.length >= 2;
    return (
      <Center>
        <h2>게임 대기 중</h2>
        <p>참여 인원 {roster.length} / 5</p>
        {isHost ? (
          <button className="btn btn--primary" disabled={!enough} onClick={onStart}>
            {enough ? '게임 시작' : '2명 이상 필요'}
          </button>
        ) : (
          <p className="muted">방장이 시작하기를 기다리는 중…</p>
        )}
      </Center>
    );
  }

  if (state.phase === 'HIDING') {
    const left = clock((state.hidingEndsAt ?? now) - now);
    return (
      <Center>
        {role === 'SEEKER' ? (
          <>
            <h2 className="seeker">당신은 술래 👁</h2>
            <p>숨는 시간 <b>{left}</b></p>
            <p className="muted">아직 움직일 수 없습니다</p>
          </>
        ) : role === 'HIDER' ? (
          <>
            <h2>숨어라!</h2>
            <p>남은 시간 <b>{left}</b></p>
          </>
        ) : (
          <p>곧 시작합니다…</p>
        )}
      </Center>
    );
  }

  if (state.phase === 'PLAYING') {
    const left = clock((state.chasingEndsAt ?? now) - now);
    const alive = GameRules.aliveCount(state);
    const total = GameRules.hiderCount(state);
    const p = PROX[proximity.level];
    const proxLabel =
      proximity.kind === 'reaction'
        ? `반응 ${p.text}`
        : proximity.kind === 'danger'
          ? `${p.text}`
          : '안전';

    return (
      <div className="topbar">
        <span className={`tag ${role === 'SEEKER' ? 'tag--seeker' : 'tag--hider'}`}>
          {role === 'SEEKER' ? '술래' : role === 'HIDER' ? '도망자' : '관전'}
        </span>
        <span className="topbar__time">남은 시간 {left}</span>
        <span className="topbar__alive">생존 {alive} / {total}</span>
        {proximity.kind !== 'none' && (
          <span className={`prox prox--${p.cls}`}>
            {p.dot} {proxLabel}
          </span>
        )}
      </div>
    );
  }

  // FINISHED
  const rows = GameRules.scoreboard(state, state.endedAt ?? now);
  const title =
    state.winner === 'SEEKER'
      ? '술래 승리!'
      : state.winner === 'HIDER'
        ? '도망자 승리!'
        : (state.note ?? '게임 종료');

  return (
    <Center>
      <h2>{title}</h2>
      <ul className="board">
        {rows.map((r) => (
          <li key={r.id} className={r.id === selfId ? 'is-me' : ''}>
            <span className={`tag ${r.role === 'SEEKER' ? 'tag--seeker' : 'tag--hider'}`}>
              {r.role === 'SEEKER' ? '술래' : '도망자'}
            </span>
            <span className="board__name">{nameOf(r.id)}</span>
            <span className="board__score">{r.score}점</span>
          </li>
        ))}
      </ul>
      {isHost ? (
        <button className="btn btn--primary" onClick={onRestart}>
          다시 하기
        </button>
      ) : (
        <p className="muted">방장이 다시 시작하기를 기다리는 중…</p>
      )}
    </Center>
  );
}

function Center({ children }: { children: ReactNode }) {
  return (
    <div className="overlay">
      <div className="overlay__card">{children}</div>
    </div>
  );
}
