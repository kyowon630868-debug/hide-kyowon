import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GameRules } from '../game-logic/rules';
import type { GameState, HintKind, HintResult } from '../game-logic/types';
import { HINT_COOLDOWN_MS, HINT_COST } from '../game/constants';
import { FLOOR_ORDER } from '../game/maps';
import { getFloor } from '../game/maps';
import { bgm } from '../game/audio';
import type { Proximity, RosterEntry } from '../types/game';

/** 시작 연출 길이 (ms). 0~1.5 확인 · 1.5~2.5 회전 · 2.5~4.0 눈 감음 */
const INTRO_MS = 4000;

export interface HudApi {
  travelTo: (floorId: number) => void;
  requestHint: (kind: HintKind) => void;
}

interface Props {
  state: GameState;
  roster: RosterEntry[];
  selfId: string;
  isHost: boolean;
  floorName: string;
  floorId: number;
  proximity: Proximity;
  elevatorNear: boolean;
  traveling: { to: number } | null;
  hint: { result: HintResult; cooldownUntil: number } | null;
  api: HudApi | null;
  onStart: () => void;
  onRestart: () => void;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const PROX = {
  0: { dot: '🟢', text: '안전', cls: 'safe' },
  1: { dot: '🟡', text: '주의', cls: 'warn' },
  2: { dot: '🔴', text: '위험', cls: 'danger' },
} as const;

function hintText(r: HintResult): string {
  switch (r.kind) {
    case 'floor':
      return r.floors.length
        ? `도망자가 ${r.floors.map((f) => getFloor(f).name).join(', ')} 에 있습니다`
        : '도망자를 찾을 수 없습니다';
    case 'direction':
      return `가장 가까운 도망자는 ${r.dir}쪽${r.sameFloor ? '' : ' (다른 층)'}`;
    case 'distance':
      return `가장 가까운 도망자: ${r.band}${r.sameFloor ? '' : ' (다른 층)'}`;
    default:
      return '반응 없음';
  }
}

export function GameHud(props: Props) {
  const { state, roster, selfId, isHost, floorName, floorId, proximity, elevatorNear, traveling, hint, api } =
    props;
  const now = useNow(state.phase === 'HIDING' || state.phase === 'PLAYING');
  const role = GameRules.roleOf(state, selfId);
  const nameOf = (id: string) => roster.find((r) => r.id === id)?.name ?? '손님';
  const seekerName = state.seekerId ? nameOf(state.seekerId) : '';

  const [pickerOpen, setPickerOpen] = useState(false);
  const [evadeToast, setEvadeToast] = useState(0);
  const prevEvade = useRef(0);

  // 숨는 시간 진입 시각 → 시작 연출 타이머
  const [hidingStartAt, setHidingStartAt] = useState(0);
  const prevPhase = useRef(state.phase);
  useEffect(() => {
    if (state.phase !== prevPhase.current) {
      if (state.phase === 'HIDING') {
        setHidingStartAt(Date.now());
        bgm.playHiding();
      } else {
        bgm.stop();
      }
      prevPhase.current = state.phase;
    }
  }, [state.phase]);

  const introLeft = hidingStartAt ? hidingStartAt + INTRO_MS - now : 0;
  const introActive = state.phase === 'HIDING' && introLeft > 0;
  const introElapsed = INTRO_MS - introLeft;

  const myEvade = state.evadeCount[selfId] ?? 0;
  useEffect(() => {
    const grew = myEvade > prevEvade.current;
    prevEvade.current = myEvade;
    if (!grew) return;
    setEvadeToast(myEvade);
    const t = setTimeout(() => setEvadeToast(0), 2600);
    return () => clearTimeout(t);
  }, [myEvade]);

  return (
    <>
      <div className="hud">
        <span className="hud__chip">{floorName || '…'}</span>
        <span className="hud__chip hud__chip--muted">방향키 / WASD</span>
      </div>

      {/* 엘리베이터 */}
      {traveling ? (
        <div className="overlay">
          <div className="overlay__card">
            <h2>🛗 엘리베이터 이동 중…</h2>
            <p className="muted">{getFloor(traveling.to).name}</p>
          </div>
        </div>
      ) : (
        elevatorNear &&
        state.phase !== 'FINISHED' &&
        !pickerOpen && (
          <button className="elevator-btn" onClick={() => setPickerOpen(true)}>
            🛗 엘리베이터
          </button>
        )
      )}
      {pickerOpen && !traveling && (
        <div className="overlay" onClick={() => setPickerOpen(false)}>
          <div className="overlay__card" onClick={(e) => e.stopPropagation()}>
            <h2>층 선택</h2>
            <div className="floor-picker">
              {FLOOR_ORDER.map((f) => (
                <button
                  key={f}
                  className="btn"
                  disabled={f === floorId}
                  onClick={() => {
                    api?.travelTo(f);
                    setPickerOpen(false);
                  }}
                >
                  {getFloor(f).name}
                </button>
              ))}
            </div>
            <button className="btn btn--ghost" onClick={() => setPickerOpen(false)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 단계별 중앙 카드 */}
      {state.phase === 'WAITING' && (
        <Center>
          <h2>게임 대기 중</h2>
          <p>참여 인원 {roster.length} / 5</p>
          {isHost ? (
            <button className="btn btn--primary" disabled={roster.length < 2} onClick={props.onStart}>
              {roster.length < 2 ? '2명 이상 필요' : '게임 시작'}
            </button>
          ) : (
            <p className="muted">방장이 시작하기를 기다리는 중…</p>
          )}
        </Center>
      )}

      {introActive && <IntroCinematic role={role} seekerName={seekerName} elapsed={introElapsed} />}

      {state.phase === 'HIDING' && !introActive && role === 'SEEKER' && (
        <div className="eyes-closed">
          <div className="eyes-closed__inner">
            <div className="eyes-closed__emoji">🙈</div>
            <p>눈을 감고 세는 중…</p>
            <b className="eyes-closed__time">{clock((state.hidingEndsAt ?? now) - now)}</b>
            <p className="muted">🎵 창밖으로 남산타워가 보인다</p>
          </div>
        </div>
      )}

      {state.phase === 'HIDING' && !introActive && role !== 'SEEKER' && (
        <div className="hiding-timer">
          숨는 시간 <b>{clock((state.hidingEndsAt ?? now) - now)}</b>
        </div>
      )}

      {state.phase === 'PLAYING' && (
        <>
          <div className="topbar">
            <span className={`tag ${role === 'SEEKER' ? 'tag--seeker' : 'tag--hider'}`}>
              {role === 'SEEKER' ? '술래' : role === 'HIDER' ? '도망자' : '관전'}
            </span>
            <span>남은 시간 {clock((state.chasingEndsAt ?? now) - now)}</span>
            <span>
              생존 {GameRules.aliveCount(state)} / {GameRules.hiderCount(state)}
            </span>
            {proximity.kind !== 'none' && (
              <span className={`prox prox--${PROX[proximity.level].cls}`}>
                {PROX[proximity.level].dot}{' '}
                {proximity.kind === 'reaction' ? `반응 ${PROX[proximity.level].text}` : PROX[proximity.level].text}
              </span>
            )}
          </div>

          {role === 'SEEKER' && (
            <div className="hintbar">
              {(['floor', 'direction', 'distance'] as HintKind[]).map((k) => {
                const cooling = hint ? now < hint.cooldownUntil : false;
                return (
                  <button
                    key={k}
                    className="hint-btn"
                    disabled={cooling}
                    onClick={() => api?.requestHint(k)}
                  >
                    {k === 'floor' ? '🔎 층' : k === 'direction' ? '🧭 방향' : '📡 거리'}
                    <small>-{HINT_COST}</small>
                  </button>
                );
              })}
            </div>
          )}

          {role === 'SEEKER' &&
            hint &&
            now < hint.cooldownUntil - HINT_COOLDOWN_MS + 6000 && (
              <div className="hint-result">{hintText(hint.result)}</div>
            )}

          {evadeToast > 0 && <div className="evade-toast">술래 따돌림! +50</div>}
        </>
      )}

      {state.phase === 'FINISHED' && (
        <Center>
          <h2>
            {state.winner === 'SEEKER'
              ? '술래 승리!'
              : state.winner === 'HIDER'
                ? '도망자 승리!'
                : (state.note ?? '게임 종료')}
          </h2>
          <ul className="board">
            {GameRules.scoreboard(state, state.endedAt ?? now).map((r) => (
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
            <button className="btn btn--primary" onClick={props.onRestart}>
              다시 하기
            </button>
          ) : (
            <p className="muted">방장이 다시 시작하기를 기다리는 중…</p>
          )}
        </Center>
      )}
    </>
  );
}

function Center({ children }: { children: ReactNode }) {
  return (
    <div className="overlay">
      <div className="overlay__card">{children}</div>
    </div>
  );
}

/** 게임 시작 시네마틱 — 레터박스 + 3비트 자막 */
function IntroCinematic({
  role,
  seekerName,
  elapsed,
}: {
  role: 'SEEKER' | 'HIDER' | null;
  seekerName: string;
  elapsed: number;
}) {
  const seeker = role === 'SEEKER';
  let caption: string;
  if (elapsed < 1500) {
    caption = seeker ? '다른 사람들을 바라본다…' : `술래: ${seekerName}`;
  } else if (elapsed < 2500) {
    caption = seeker ? '천천히 몸을 돌린다' : '지금이다 — 숨어라!';
  } else {
    caption = seeker ? '눈을 감는다…  🎵' : '술래가 눈을 감았다';
  }

  return (
    <div className="cine">
      <div className="cine__bar cine__bar--top" />
      <div className="cine__bar cine__bar--bottom" />
      <div className="cine__caption" key={caption}>
        {caption}
      </div>
    </div>
  );
}
