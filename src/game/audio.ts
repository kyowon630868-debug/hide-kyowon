/**
 * 아주 단순한 자체 제작 BGM (WebAudio).
 * 지금은 잔잔한 아르페지오만 — 나중에 진짜 음원을 넣을 때는
 * playHiding() 내부만 <audio> 재생으로 바꾸면 된다. (호출부는 그대로)
 */

const SCALE = [261.63, 329.63, 392.0, 493.88, 523.25, 493.88, 392.0, 329.63]; // Cmaj7 위아래
const STEP_MS = 700;

class Bgm {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;

  /** 사용자 제스처(클릭 등) 시점에 한 번 호출해 오디오를 깨운다 */
  unlock() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0001;
      this.master.connect(this.ctx.destination);
    }
    void this.ctx.resume();
  }

  /** 숨는 시간 BGM 시작 */
  playHiding() {
    this.unlock();
    if (!this.ctx || !this.master || this.timer) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0.12, this.ctx.currentTime, 1.2);
    this.step = 0;
    this.tick();
    this.timer = setInterval(() => this.tick(), STEP_MS);
  }

  stop() {
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const freq = SCALE[this.step % SCALE.length];
    this.step++;

    // 화음의 근음 + 한 옥타브 아래를 아주 작게
    this.note(freq, t, 1.4, 'triangle', 0.9);
    if (this.step % 4 === 1) this.note(freq / 2, t, 2.2, 'sine', 0.35);
  }

  private note(freq: number, start: number, dur: number, type: OscillatorType, level: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(level, start + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(this.master!);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }
}

export const bgm = new Bgm();
