import { useEffect, useState } from "react";
import {
  usePerPeerValue,
  useNamedPeer,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };
type Mood = { hue: number; ts: number };

const NEUTRAL_HUE = 220;

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <div className="mood-screen">
        <h1>mood ring</h1>
        <p className="mood-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const { name, setName, nameOf } = useNamedPeer(config, room);
  const moods = usePerPeerValue<Mood>(room, "moods", { hue: NEUTRAL_HUE, ts: 0 });

  const [myHue, setMyHue] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${config.storagePrefix}:hue`);
      if (saved != null) return Math.max(0, Math.min(360, Number(saved)));
    } catch {
      /* ignore */
    }
    return Math.floor(Math.random() * 360);
  });

  useEffect(() => {
    moods.setMy({ hue: myHue, ts: Date.now() });
    try {
      localStorage.setItem(`${config.storagePrefix}:hue`, String(myHue));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myHue, room, config.storagePrefix]);

  const entries = moods.entries.filter(([, v]) => v && typeof v.hue === "number");
  const hues = entries.map(([, v]) => v.hue);
  let avg = NEUTRAL_HUE;
  if (hues.length > 0) {
    const xs = hues.map((h) => Math.cos((h * Math.PI) / 180)).reduce((a, b) => a + b, 0);
    const ys = hues.map((h) => Math.sin((h * Math.PI) / 180)).reduce((a, b) => a + b, 0);
    avg = ((Math.atan2(ys, xs) * 180) / Math.PI + 360) % 360;
  }
  const avgRounded = Math.round(avg);
  const present = room.peerCount + 1;

  return (
    <div className="mood-screen">
      <div className="mood-bg" aria-hidden="true" style={{ background: `hsl(${avg} 70% 25%)` }} />
      <header className="mood-header">
        <h1>mood ring</h1>
        <p className="mood-status">
          {entries.length} mood{entries.length === 1 ? "" : "s"} · {present}{" "}
          {present === 1 ? "peer" : "peers"}
        </p>
      </header>

      <div className="mood-name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          maxLength={48}
          aria-label="your name"
        />
      </div>

      <div className="mood-control">
        <input
          className="mood-slider"
          type="range"
          min={0}
          max={360}
          step={1}
          value={myHue}
          onChange={(e) => setMyHue(Number(e.target.value))}
          aria-label="your hue"
        />
        <div className="mood-chips">
          <span className="mood-mine" style={{ background: `hsl(${myHue} 80% 55%)` }}>
            you: {myHue}°
          </span>
          <span className="mood-avg" data-avg={avgRounded}>
            group avg: {avgRounded}°
          </span>
        </div>
      </div>

      <div className="mood-swatches" aria-label="peer moods">
        {entries.map(([pid, m]) => {
          const label = nameOf(pid) ?? `peer-${pid.slice(0, 6)}`;
          return (
            <span key={pid} className="mood-swatch" title={`${label} · ${Math.round(m.hue)}°`}>
              <span
                className="mood-dot"
                style={{ background: `hsl(${m.hue} 80% 55%)` }}
                aria-hidden="true"
              />
              <span className="mood-name-label">{label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
