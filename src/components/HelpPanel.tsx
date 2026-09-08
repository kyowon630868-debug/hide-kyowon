import { useEffect, useState } from 'react';
import { HINT_COST, HINT_COOLDOWN_MS, ENDGAME_SECONDS, EVADE_BONUS } from '../game/constants';
import type { HudApi } from './GameHud';

const SEEN_KEY = 'hk_seen_help';

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* 사생활 보호 모드 등 — 무시 */
  }
}

interface Row {
  keys: string[];
  label: string;
}

function Keys({ items }: { items: string[] }) {
  return (
    <span className="help__keys">
      {items.map((k, i) => (
        <kbd key={i}>{k}</kbd>
      ))}
    </span>
  );
}

function Section({ title, rows, note }: { title: string; rows: Row[]; note?: string }) {
  return (
    <div className="help__section">
      <h3>{title}</h3>
      <ul>
        {rows.map((r, i) => (
          <li key={i}>
            <Keys items={r.keys} />
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
      {note && <p className="help__note">{note}</p>}
    </div>
  );
}

export function HelpPanel({ api }: { api: HudApi | null }) {
  const [open, setOpen] = useState(() => !readSeen());
  const firstTime = open && !readSeen();

  // 열려 있는 동안은 캐릭터가 움직이지 않게
  useEffect(() => {
    api?.setUiLock(open);
    return () => api?.setUiLock(false);
  }, [open, api]);

  useEffect(() => {
    if (!open) markSeen();
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;
      if (typing) return;
      if (e.key === '?' || e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        className="help-btn"
        title="도움말 (H)"
        aria-label="도움말"
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>

      {open && (
        <div className="overlay help__overlay" onClick={() => setOpen(false)}>
          <div className="help__card" onClick={(e) => e.stopPropagation()}>
            <div className="help__top">
              <h2>플레이 방법</h2>
              <button className="help__x" onClick={() => setOpen(false)} aria-label="닫기">
                ✕
              </button>
            </div>

            {firstTime && (
              <p className="help__welcome">
                처음이네요! 술래 1명이 눈을 감고 세는 동안 사무실 곳곳에 숨는 게임이에요.
                아래 조작법만 알면 바로 시작할 수 있어요.
              </p>
            )}

            <div className="help__grid">
              <Section
                title="이동"
                rows={[
                  { keys: ['W', 'A', 'S', 'D'], label: '상하좌우 이동' },
                  { keys: ['↑', '↓', '←', '→'], label: '방향키로도 이동' },
                ]}
              />
              <Section
                title="달리기 (부스터)"
                rows={[
                  { keys: ['Shift'], label: '누르고 있으면 질주' },
                  { keys: ['Space'], label: '같은 기능' },
                ]}
                note={`화면 아래 ⚡ 게이지가 스태미나예요. 다 쓰면 잠깐 못 뛰고, 안 뛰면 다시 차요. 술래는 이걸로 따라잡고, 도망자는 이걸로 뿌리쳐요.`}
              />
              <Section
                title="엘리베이터 (층 이동)"
                rows={[
                  { keys: ['Enter', 'E'], label: '엘리베이터 앞에서 문 열기' },
                  { keys: ['↑', '↓'], label: '갈 층 고르기' },
                  { keys: ['Enter'], label: '그 층으로 이동' },
                  { keys: ['Esc'], label: '취소' },
                ]}
                note="숨는 시간에 다른 층으로 도망가거나, 술래가 층을 뒤질 때 씁니다."
              />
              <Section
                title="술래 — 힌트 3종"
                rows={[
                  { keys: ['🔎 층'], label: '도망자가 있는 층' },
                  { keys: ['🧭 방향'], label: '가장 가까운 도망자 방향' },
                  { keys: ['📡 거리'], label: '가장 가까운 도망자 거리' },
                ]}
                note={`쫓는 동안 화면 아래 버튼으로 사용. 한 번에 ${HINT_COST}점 차감, ${Math.round(
                  HINT_COOLDOWN_MS / 1000,
                )}초 쿨다운. 점수를 아낄지 힌트로 빨리 잡을지 선택하세요.`}
              />
              <Section
                title="도망자 — 근접 경보"
                rows={[
                  { keys: ['🟢'], label: '안전 — 술래 멀리 있음' },
                  { keys: ['🟡'], label: '주의 — 가까워지는 중' },
                  { keys: ['🔴'], label: '위험 — 바로 근처, 도망!' },
                ]}
                note={`위험 상태에서 벗어나 술래를 따돌리면 +${EVADE_BONUS}점.`}
              />
              <Section
                title="막판"
                rows={[{ keys: [`마지막 ${ENDGAME_SECONDS}초`], label: '술래 가속 + 도망자 방향 노출' }]}
                note="시간이 얼마 안 남으면 자동으로 발동. 술래는 스퍼트, 도망자는 버티기."
              />
              <Section
                title="채팅 · 기타"
                rows={[
                  { keys: ['왼쪽 아래'], label: '채팅창 (클릭해서 펼치기)' },
                  { keys: ['오른쪽 위'], label: '방 코드 · 참가자 명단' },
                  { keys: ['H', '?'], label: '이 도움말 다시 열기' },
                ]}
              />
              <Section
                title="이기는 법"
                rows={[
                  { keys: ['술래'], label: '제한시간 안에 도망자 전원 잡기' },
                  { keys: ['도망자'], label: '한 명이라도 시간까지 살아남기' },
                ]}
              />
            </div>

            <button className="btn btn--primary help__close" onClick={() => setOpen(false)}>
              {firstTime ? '알겠어요, 시작할게요' : '닫기'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
