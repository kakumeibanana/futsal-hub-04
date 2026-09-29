import { useEffect, useId, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Tactic, VBS, RADII, SEG_MS, HOLD_MS, SPEEDS, positionsAt } from "@/lib/tactics";

// 見るだけの作戦盤。コート・床・コマを1枚のSVGで描き、コマ送りを補間して自動で繰り返し再生する。
// 座標は作戦盤と同じ実寸メートルなので、変換なしでそのまま描ける。

const TacticsBoard = ({ tactic }: { tactic: Tactic }) => {
  const uid = useId().replace(/:/g, "");
  const { frames, pieces, court } = tactic;
  const VB = VBS[court];
  const half = court === "half";
  const BOARD_WIDTH = `min(100%, calc(70vh * ${VB.w} / ${VB.h}))`;
  const total = (frames.length - 1) * SEG_MS;
  const canPlay = frames.length > 1;

  const reduceMotion =
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [clock, setClock] = useState(0);
  const [playing, setPlaying] = useState(canPlay && !reduceMotion);
  const clockRef = useRef(0);

  // 再生速度。作戦盤と同じキーで覚えておく（storageが使えない環境でも動く）
  const [speed, setSpeed] = useState<number>(() => {
    try {
      const v = parseFloat(window.localStorage.getItem("futsal-board-speed.v1") ?? "");
      return (SPEEDS as readonly number[]).includes(v) ? v : 1;
    } catch {
      return 1;
    }
  });
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const chooseSpeed = (v: number) => {
    setSpeed(v);
    try {
      window.localStorage.setItem("futsal-board-speed.v1", String(v));
    } catch {
      /* 保存できなくても再生には影響しない */
    }
  };

  // 作戦を切り替えたら頭から
  useEffect(() => {
    clockRef.current = 0;
    setClock(0);
    setPlaying(canPlay && !reduceMotion);
  }, [tactic.id, canPlay, reduceMotion]);

  useEffect(() => {
    if (!playing || !canPlay) return;
    // 時計は「前のtickからの経過 × 速度」を足していく。速度を途中で変えても飛ばない。
    // 基準は最初のtickのタイムスタンプから取る（rAFの時刻は直前のperformance.now()より過去になりうる）
    let last: number | null = null;
    let raf = 0;
    let c = clockRef.current;
    const tick = (now: number) => {
      if (last === null) last = now;
      c += Math.max(0, now - last) * speedRef.current;
      last = now;
      if (c >= total + HOLD_MS) c = 0;
      clockRef.current = c;
      setClock(c);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, canPlay, total]);

  const pos = positionsAt(frames, clock);
  const shown = canPlay ? Math.min(Math.round(Math.min(clock, total) / SEG_MS), frames.length - 1) : 0;

  const jump = (i: number) => {
    setPlaying(false);
    clockRef.current = i * SEG_MS;
    setClock(i * SEG_MS);
  };

  const restart = () => {
    clockRef.current = 0;
    setClock(0);
    setPlaying(true);
  };

  const id = (s: string) => `${s}-${uid}`;
  const fill = { a: `url(#${id("magA")})`, b: `url(#${id("magB")})`, ball: `url(#${id("magBall")})` };

  return (
    <div className="w-full">
      <div
        className="mx-auto rounded-xl overflow-hidden border border-border shadow-sm"
        style={{ width: BOARD_WIDTH, aspectRatio: `${VB.w} / ${VB.h}` }}
      >
        <svg
          viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
          className="block w-full h-full"
          role="img"
          aria-label={`${tactic.name}のコート図。コマ ${shown + 1} / ${frames.length}`}
        >
          <defs>
            <linearGradient id={id("wood")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#EFE0C8" />
              <stop offset="0.54" stopColor="#E6D3B6" />
              <stop offset="1" stopColor="#DCC6A4" />
            </linearGradient>
            <radialGradient id={id("gym")} cx="0.5" cy="0.1" r="0.75">
              <stop offset="0" stopColor="#FFF6E0" stopOpacity="0.1" />
              <stop offset="1" stopColor="#FFF6E0" stopOpacity="0" />
            </radialGradient>
            <pattern id={id("net")} width="0.42" height="0.42" patternUnits="userSpaceOnUse">
              <path d="M0.42 0V0.42M0 0.42H0.42" stroke="#FFFCF6" strokeOpacity="0.5" strokeWidth="0.055" />
            </pattern>
            <radialGradient id={id("magA")} cx="0.34" cy="0.26" r="0.84">
              <stop offset="0" stopColor="#E8604F" />
              <stop offset="0.62" stopColor="#CE3A2E" />
              <stop offset="1" stopColor="#96261D" />
            </radialGradient>
            <radialGradient id={id("magB")} cx="0.34" cy="0.26" r="0.84">
              <stop offset="0" stopColor="#3F87D6" />
              <stop offset="0.62" stopColor="#1D5CA6" />
              <stop offset="1" stopColor="#123F73" />
            </radialGradient>
            <radialGradient id={id("magBall")} cx="0.33" cy="0.25" r="0.85">
              <stop offset="0" stopColor="#FFF3BE" />
              <stop offset="0.55" stopColor="#F0CE3F" />
              <stop offset="1" stopColor="#C79E19" />
            </radialGradient>
          </defs>

          {/* 体育館のフローリング */}
          <rect x={VB.x} y={VB.y} width={VB.w} height={VB.h} fill={`url(#${id("wood")})`} />
          <rect x={VB.x} y={VB.y} width={VB.w} height={VB.h} fill={`url(#${id("gym")})`} />

          {half ? (
            <>
              {/* ゴールネット（上） */}
              <rect x="8.5" y="-1.1" width="3" height="1.1" fill={`url(#${id("net")})`} />
              <g fill="none" stroke="#FFFFFF" strokeWidth="0.24" strokeLinecap="round">
                <path d="M8.5 0V-1.1H11.5V0" strokeWidth="0.28" />
                <path d="M0 20V0H20V20" />
                <path d="M0 20H20" />
                <path d="M7 20A3 3 0 0 1 13 20" />
                <path d="M2.5 0A6 6 0 0 0 8.5 6L11.5 6A6 6 0 0 0 17.5 0" />
                <path d="M0 0.25A0.25 0.25 0 0 0 0.25 0" />
                <path d="M19.75 0A0.25 0.25 0 0 0 20 0.25" />
                <path d="M0 10H-0.8M0 15H-0.8" strokeWidth="0.22" />
              </g>
              <g fill="#FFFFFF">
                {[6, 10, 20].map((y) => (
                  <circle key={y} cx="10" cy={y} r="0.15" />
                ))}
              </g>
            </>
          ) : (
            <>
              {/* ゴールネット */}
              <rect x="8.5" y="-1.1" width="3" height="1.1" fill={`url(#${id("net")})`} />
              <rect x="8.5" y="40" width="3" height="1.1" fill={`url(#${id("net")})`} />

              {/* ライン（実寸: コート 20m × 40m） */}
              <g fill="none" stroke="#FFFFFF" strokeWidth="0.24" strokeLinecap="round">
                <path d="M8.5 0V-1.1H11.5V0" strokeWidth="0.28" />
                <path d="M8.5 40V41.1H11.5V40" strokeWidth="0.28" />
                <rect x="0" y="0" width="20" height="40" />
                <path d="M0 20H20" />
                <circle cx="10" cy="20" r="3" />
                <path d="M2.5 0 A6 6 0 0 0 8.5 6 L11.5 6 A6 6 0 0 0 17.5 0" />
                <path d="M2.5 40 A6 6 0 0 1 8.5 34 L11.5 34 A6 6 0 0 1 17.5 40" />
                <path d="M0 0.25A0.25 0.25 0 0 0 0.25 0" />
                <path d="M19.75 0A0.25 0.25 0 0 0 20 0.25" />
                <path d="M20 39.75A0.25 0.25 0 0 0 19.75 40" />
                <path d="M0.25 40A0.25 0.25 0 0 0 0 39.75" />
                <path d="M0 10H-0.8M0 15H-0.8M0 25H-0.8M0 30H-0.8" strokeWidth="0.22" />
              </g>
              <g fill="#FFFFFF">
                {[6, 34, 10, 30, 20].map((y) => (
                  <circle key={y} cx="10" cy={y} r="0.15" />
                ))}
              </g>
            </>
          )}

          {/* コマ */}
          {pieces.map((p, i) => {
            const r = p.t === "ball" ? RADII[court].ball : RADII[court].player;
            return (
              <g key={i} transform={`translate(${pos[i].x} ${pos[i].y})`}>
                <circle r={r} fill={fill[p.t]} />
                <circle r={r} fill="none" stroke="#000" strokeOpacity="0.32" strokeWidth="0.1" />
                {p.t !== "ball" && (
                  <text
                    dy="0.36em"
                    textAnchor="middle"
                    fill="#fff"
                    style={{ fontSize: r * 1.015, fontWeight: 700, pointerEvents: "none" }}
                  >
                    {p.n}
                  </text>
                )}
                {p.t !== "ball" && tactic.names[p.t][p.n! - 1] && (
                  // 名前はコマの下に出す。作戦盤と同じ大きさ・縁取り
                  <text
                    y={r + r * 0.9 * tactic.nameScale * 0.95}
                    dy="0.36em"
                    textAnchor="middle"
                    fill="#fff"
                    stroke="#241D15"
                    strokeWidth={r * 0.9 * tactic.nameScale * 0.26}
                    strokeLinejoin="round"
                    style={{ fontSize: r * 0.9 * tactic.nameScale, fontWeight: 700, paintOrder: "stroke", pointerEvents: "none" }}
                  >
                    {tactic.names[p.t][p.n! - 1]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {canPlay && (
        <div className="mx-auto mt-3 flex items-center gap-2" style={{ width: BOARD_WIDTH }}>
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            className="h-10 w-10 flex-none inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90"
            aria-label={playing ? "一時停止" : "再生"}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            type="button"
            onClick={restart}
            className="h-10 w-10 flex-none inline-flex items-center justify-center rounded-lg border border-border bg-muted text-foreground hover:opacity-90"
            aria-label="最初から"
          >
            <RotateCcw size={16} />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto">
            {frames.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => jump(i)}
                aria-label={`コマ ${i + 1} へ`}
                aria-current={i === shown}
                className={`h-9 min-w-9 px-2 flex-none rounded-lg border text-sm font-bold tabular-nums transition-colors ${
                  i === shown
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {canPlay && (
        <div className="mx-auto mt-3" style={{ width: BOARD_WIDTH }}>
          <div className="text-[11px] font-bold text-muted-foreground mb-1">再生速度（倍）</div>
          <div className="grid grid-cols-7 gap-1.5">
            {SPEEDS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => chooseSpeed(v)}
                aria-pressed={v === speed}
                aria-label={`再生速度 ${v} 倍`}
                className={`h-8 rounded-lg border text-xs font-bold tabular-nums transition-colors ${
                  v === speed
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticsBoard;
