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
  setUiLock: (locked: boolean) => void;
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
  endgame: { active: boolean; seeker: boolean; dir: string };
  stamina: { value: number; max: number; sprinting: boolean };
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
  const { state, roster, selfId, isHost, floorName, floorId, proximity, elevatorNear, traveling, hint, api, endgame, stamina } =
    props;
  const now = useNow(state.phase === 'HIDING' || state.phase === 'PLAYING');
  const role = GameRules.roleOf(state, selfId);
  const nameOf = (id: string) => roster.find((r) => r.id === id)?.name ?? '손님';
  const seekerName = state.seekerId ? nameOf(state.seekerId) : '';

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickIdx, setPickIdx] = useState(0);
  const [evadeToast, setEvadeToast] = useState(0);
  const [waitingDismissed, setWaitingDismissed] = useState(false);
  const prevEvade = useRef(0);

  // 새 라운드가 시작되면 다시 대기 패널을 보이게
  useEffect(() => {
    if (state.phase === 'WAITING') setWaitingDismissed(false);
  }, [state.phase]);

  // 층 선택 등 UI 가 열려 있으면 캐릭터가 움직이지 않게 씬에 알린다
  useEffect(() => {
    api?.setUiLock(pickerOpen);
    return () => api?.setUiLock(false);
  }, [pickerOpen, api]);

  // 엘리베이터: 키보드만으로 조작 (Enter/E 로 열기, ↑↓ 선택, Enter 이동, Esc 닫기)
  const canElevator = elevatorNear && !traveling && state.phase !== 'FINISHED';
  useEffect(() => {
    if (!canElevator && !pickerOpen) return;
    const first = FLOOR_ORDER.findIndex((f) => f !== floorId);

    function onKey(e: KeyboardEvent) {
      if (!pickerOpen) {
        if ((e.key === 'Enter' || e.key === 'e' || e.key === 'E') && canElevator) {
          e.preventDefault();
          setPickIdx(first < 0 ? 0 : first);
          setPickerOpen(true);
        }
        return;
      }
      if (e.key === 'Escape') setPickerOpen(false);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 's' || e.key === 'w') {
        e.preventDefault();
        const dir = e.key === 'ArrowDown' || e.key === 's' ? 1 : -1;
        setPickIdx((i) => {
          let n = i;
          for (let k = 0; k < FLOOR_ORDER.length; k++) {
            n = (n + dir + FLOOR_ORDER.length) % FLOOR_ORDER.length;
            if (FLOOR_ORDER[n] !== floorId) break;
          }
          return n;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const f = FLOOR_ORDER[pickIdx];
        if (f !== floorId) {
          api?.travelTo(f);
          setPickerOpen(false);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canElevator, pickerOpen, pickIdx, floorId, api]);

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
      {/* 상단 정보 바 */}
      <div className="gamebar">
        <span className="gamebar__floor">{floorName || '…'}</span>
        {role && state.phase !== 'WAITING' && (
          <span className={`tag ${role === 'SEEKER' ? 'tag--seeker' : 'tag--hider'}`}>
            {role === 'SEEKER' ? '술래' : '도망자'}
          </span>
        )}
        {state.phase === 'WAITING' && <span className="gamebar__dim">대기 중</span>}
        {state.phase === 'HIDING' && (
          <span>
            숨는 시간 <b>{clock((state.hidingEndsAt ?? now) - now)}</b>
          </span>
        )}
        {state.phase === 'PLAYING' && (
          <>
            <span>
              남은 <b>{clock((state.chasingEndsAt ?? now) - now)}</b>
            </span>
            <span>
              생존 {GameRules.aliveCount(state)}/{GameRules.hiderCount(state)}
            </span>
            {proximity.kind !== 'none' && (
              <span className={`prox prox--${PROX[proximity.level].cls}`}>
                {PROX[proximity.level].dot}{' '}
                {proximity.kind === 'reaction'
                  ? `반응 ${PROX[proximity.level].text}`
                  : PROX[proximity.level].text}
              </span>
            )}
          </>
        )}
        {state.phase === 'FINISHED' && <span className="gamebar__dim">게임 종료</span>}
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
            🛗 엘리베이터 <kbd>Enter</kbd>
          </button>
        )
      )}
      {pickerOpen && !traveling && (
        <div className="overlay" onClick={() => setPickerOpen(false)}>
          <div className="overlay__card" onClick={(e) => e.stopPropagation()}>
            <h2>층 선택</h2>
            <div className="floor-picker">
              {FLOOR_ORDER.map((f, i) => (
                <button
                  key={f}
                  className={`btn ${i === pickIdx ? 'is-sel' : ''}`}
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
            <p className="muted">↑ ↓ 선택 · Enter 이동 · Esc 닫기</p>
          </div>
        </div>
      )}

      {/* 대기 중: 화면을 가리지 않는 하단 패널 (걸어다니며 맵 구경 가능) */}
      {state.phase === 'WAITING' && !waitingDismissed && (
        <div className="waitbar">
          <div className="waitbar__row">
            <b>게임 대기 중</b>
            <span className="muted">
              참여 {roster.length}/5 · 이동 WASD · <kbd>Shift</kbd> 달리기 · <kbd>H</kbd> 도움말
            </span>
          </div>
          <div className="waitbar__row">
            {isHost ? (
              <button
                className="btn btn--primary"
                disabled={roster.length < 2}
                onClick={props.onStart}
              >
                {roster.length < 2 ? '게임 시작 (2명~)' : '게임 시작'}
              </button>
            ) : (
              <span className="muted">방장이 시작하기를 기다리는 중…</span>
            )}
            <button className="btn btn--ghost" onClick={() => setWaitingDismissed(true)}>
              혼자 둘러보기
            </button>
          </div>
        </div>
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

      {/* 부스터 스태미나 바 — 움직일 수 있는 동안 항상 표시 */}
      {state.phase !== 'FINISHED' && !introActive && (
        <div className="stamina">
          <div
            className={`stamina__fill ${stamina.sprinting ? 'is-sprint' : ''} ${stamina.value < 20 ? 'is-low' : ''}`}
            style={{ width: `${(stamina.value / stamina.max) * 100}%` }}
          />
          <span className="stamina__label">
            {stamina.sprinting ? '⚡ 달리는 중' : '⚡ Shift · Space 달리기'}
          </span>
        </div>
      )}

      {endgame.active && (
        <div className={`endgame ${endgame.seeker ? 'endgame--seeker' : 'endgame--hider'}`}>
          {endgame.seeker
            ? `⚡ 막판! 도망자 ${endgame.dir || '???'}쪽 · 술래 가속`
            : '⚡ 막판! 술래가 빨라졌다 — 30초 버텨라'}
        </div>
      )}

      {state.phase === 'PLAYING' && (
        <>
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
