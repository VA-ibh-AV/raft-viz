/**
 * Animated SVG demos for the docs panel.
 * Each shows one Raft concept in a continuous loop.
 */

const W = 280
const H = 180

/* ── Helpers ────────────────────────────────────────────────────────────── */

function nodePos(i: number, n: number, cx = W / 2, cy = H / 2 + 6, r = 56) {
  const a = (2 * Math.PI * i / n) - Math.PI / 2
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

interface SvgNodeProps {
  cx:    number
  cy:    number
  fill:  string
  label?: string
  alive?: boolean
}
function SvgNode({ cx, cy, fill, label, alive = true }: SvgNodeProps) {
  return (
    <g opacity={alive ? 1 : 0.35}>
      <circle cx={cx} cy={cy} r={14}
        fill={fill}
        stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
      {label && (
        <text x={cx} y={cy + 4} textAnchor="middle"
          fontSize={11} fontWeight={700} fill="white"
          fontFamily="ui-monospace, monospace">
          {label}
        </text>
      )}
    </g>
  )
}

/* ── Election ───────────────────────────────────────────────────────────── */
/**
 * 5 followers → one times out → becomes candidate →
 * vote requests fly out → votes return → wins → becomes leader → heartbeats
 */
export function ElectionAnim() {
  const positions = [0, 1, 2, 3, 4].map(i => nodePos(i, 5))
  const cand      = positions[0]

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#F59E0B"/>
        </marker>
      </defs>

      {/* Followers (turn into voters then back) */}
      {positions.slice(1).map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={14}
            fill="#64748B">
            <animate attributeName="fill"
              values="#64748B; #64748B; #F59E0B; #10B981; #64748B; #64748B"
              keyTimes="0; 0.35; 0.5; 0.65; 0.85; 1"
              dur="6s" repeatCount="indefinite"
              begin={`${i * 0.1}s`}/>
          </circle>
          <text x={p.x} y={p.y + 4} textAnchor="middle"
            fontSize={10} fontWeight={700} fill="white"
            fontFamily="ui-monospace, monospace">F</text>
        </g>
      ))}

      {/* Candidate / leader (transforms over loop) */}
      <g>
        <circle cx={cand.x} cy={cand.y} r={14} fill="#64748B">
          <animate attributeName="fill"
            values="#64748B; #F59E0B; #F59E0B; #3B82F6; #3B82F6; #64748B"
            keyTimes="0; 0.2; 0.55; 0.7; 0.95; 1"
            dur="6s" repeatCount="indefinite"/>
        </circle>
        {/* pulse ring during candidate phase */}
        <circle cx={cand.x} cy={cand.y} r={14} fill="none" stroke="#F59E0B" strokeWidth={1.5} opacity={0}>
          <animate attributeName="r" values="14; 26" dur="1s" begin="1.2s;7.2s;13.2s" repeatCount="1"/>
          <animate attributeName="opacity" values="0.9; 0" dur="1s" begin="1.2s;7.2s;13.2s" repeatCount="1"/>
        </circle>
        <text x={cand.x} y={cand.y + 4} textAnchor="middle"
          fontSize={10} fontWeight={700} fill="white"
          fontFamily="ui-monospace, monospace">
          <animate attributeName="font-size"
            values="10; 10; 9; 10"
            keyTimes="0; 0.2; 0.55; 1"
            dur="6s" repeatCount="indefinite"/>
          C
        </text>
      </g>

      {/* Vote request lines (candidate → followers) */}
      {positions.slice(1).map((p, i) => (
        <line key={`req-${i}`}
          x1={cand.x} y1={cand.y}
          x2={p.x}    y2={p.y}
          stroke="#F59E0B" strokeWidth={1.2}
          strokeDasharray="3 3"
          opacity={0}>
          <animate attributeName="opacity"
            values="0; 0; 0.7; 0.7; 0; 0"
            keyTimes="0; 0.2; 0.3; 0.5; 0.55; 1"
            dur="6s" repeatCount="indefinite"
            begin={`${i * 0.05}s`}/>
        </line>
      ))}

      {/* Heartbeat dots after leadership */}
      {positions.slice(1).map((p, i) => (
        <circle key={`hb-${i}`} r={3} fill="#3B82F6" opacity={0}>
          <animate attributeName="opacity" values="0; 0; 1; 1; 0"
            keyTimes="0; 0.72; 0.74; 0.93; 0.95"
            dur="6s" repeatCount="indefinite"
            begin={`${i * 0.07}s`}/>
          <animate attributeName="cx" values={`${cand.x}; ${p.x}`}
            keyTimes="0; 1"
            dur="0.6s" begin={`${4.3 + i * 0.07}s;${10.3 + i * 0.07}s`}
            repeatCount="1"/>
          <animate attributeName="cy" values={`${cand.y}; ${p.y}`}
            keyTimes="0; 1"
            dur="0.6s" begin={`${4.3 + i * 0.07}s;${10.3 + i * 0.07}s`}
            repeatCount="1"/>
        </circle>
      ))}

      {/* Caption */}
      <text x={W/2} y={H - 8} textAnchor="middle"
        fontSize={10} fill="var(--text3)" fontFamily="ui-monospace, monospace"
        letterSpacing="0.06em">
        timeout → candidate → wins quorum → leader
      </text>
    </svg>
  )
}

/* ── Log replication ────────────────────────────────────────────────────── */
/**
 * Leader at top, 3 followers below.
 * Entry appears in leader → travels to followers → all turn green (committed).
 */
export function ReplicationAnim() {
  const lx = W / 2, ly = 38
  const fy = 132
  const fxs = [W/2 - 90, W/2, W/2 + 90]

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Leader */}
      <SvgNode cx={lx} cy={ly} fill="#3B82F6" label="L"/>
      <text x={lx} y={ly - 24} textAnchor="middle"
        fontSize={9} fill="var(--text3)" fontFamily="ui-monospace, monospace">
        leader
      </text>

      {/* Followers */}
      {fxs.map((x, i) => (
        <g key={i}>
          <SvgNode cx={x} cy={fy} fill="#64748B" label="F"/>
        </g>
      ))}

      {/* Connection lines */}
      {fxs.map((x, i) => (
        <line key={i} x1={lx} y1={ly + 14} x2={x} y2={fy - 14}
          stroke="var(--border2)" strokeWidth={1} strokeDasharray="2 3" opacity={0.4}/>
      ))}

      {/* New entry pulse in leader (cyclic) */}
      <rect x={lx - 12} y={ly + 18} width={24} height={9} rx={2}
        fill="#F59E0B" opacity={0}>
        <animate attributeName="opacity" values="0; 1; 1; 0; 0"
          keyTimes="0; 0.05; 0.2; 0.3; 1"
          dur="3.5s" repeatCount="indefinite"/>
      </rect>

      {/* Entries flying to followers */}
      {fxs.map((x, i) => (
        <rect key={`e-${i}`} width={22} height={8} rx={2} fill="#F59E0B" opacity={0}>
          <animate attributeName="opacity"
            values="0; 0; 0.9; 0.9; 0"
            keyTimes="0; 0.2; 0.25; 0.45; 0.5"
            dur="3.5s" repeatCount="indefinite"
            begin={`${i * 0.08}s`}/>
          <animate attributeName="x"
            values={`${lx - 11}; ${x - 11}`}
            keyTimes="0; 1"
            dur="0.5s"
            begin={`${0.7 + i * 0.08}s;${4.2 + i * 0.08}s;${7.7 + i * 0.08}s;${11.2 + i * 0.08}s`}
            repeatCount="1"/>
          <animate attributeName="y"
            values={`${ly + 22}; ${fy - 6}`}
            keyTimes="0; 1"
            dur="0.5s"
            begin={`${0.7 + i * 0.08}s;${4.2 + i * 0.08}s;${7.7 + i * 0.08}s;${11.2 + i * 0.08}s`}
            repeatCount="1"/>
        </rect>
      ))}

      {/* Stored entry slot on followers (turns green when committed) */}
      {fxs.map((x, i) => (
        <rect key={`s-${i}`} x={x - 11} y={fy + 18} width={22} height={8} rx={2}
          fill="#64748B" opacity={0}>
          <animate attributeName="opacity"
            values="0; 0; 0.7; 0.7; 0"
            keyTimes="0; 0.5; 0.55; 0.92; 1"
            dur="3.5s" repeatCount="indefinite"/>
          <animate attributeName="fill"
            values="#F59E0B; #F59E0B; #10B981; #10B981"
            keyTimes="0; 0.6; 0.8; 1"
            dur="3.5s" repeatCount="indefinite"/>
        </rect>
      ))}

      {/* Caption */}
      <text x={W/2} y={H - 8} textAnchor="middle"
        fontSize={10} fill="var(--text3)" fontFamily="ui-monospace, monospace"
        letterSpacing="0.06em">
        leader appends → replicates → quorum → committed
      </text>
    </svg>
  )
}

/* ── Heartbeat ──────────────────────────────────────────────────────────── */
/**
 * Leader at center, 4 followers around. Continuous heartbeat dots travel out.
 */
export function HeartbeatAnim() {
  const cx = W / 2, cy = H / 2 - 4
  const followers = [0, 1, 2, 3].map(i => {
    const a = (2 * Math.PI * i / 4) - Math.PI / 2 + Math.PI / 4
    return { x: cx + 60 * Math.cos(a), y: cy + 60 * Math.sin(a) }
  })

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Connection lines */}
      {followers.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y}
          stroke="var(--border2)" strokeWidth={1} strokeDasharray="2 3" opacity={0.4}/>
      ))}

      {/* Followers */}
      {followers.map((p, i) => (
        <SvgNode key={i} cx={p.x} cy={p.y} fill="#64748B" label="F"/>
      ))}

      {/* Leader (pulsing) */}
      <circle cx={cx} cy={cy} r={20} fill="none" stroke="#3B82F6" strokeWidth={1} opacity={0.5}>
        <animate attributeName="r" values="14; 24" dur="1.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6; 0" dur="1.4s" repeatCount="indefinite"/>
      </circle>
      <SvgNode cx={cx} cy={cy} fill="#3B82F6" label="L"/>

      {/* Traveling heartbeat dots — 4 staggered */}
      {followers.map((p, i) => (
        <circle key={i} r={4} fill="#60A5FA" opacity={0.9}>
          <animate attributeName="cx" values={`${cx}; ${p.x}`}
            dur="1.2s" begin={`${i * 0.3}s`} repeatCount="indefinite"/>
          <animate attributeName="cy" values={`${cy}; ${p.y}`}
            dur="1.2s" begin={`${i * 0.3}s`} repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9; 0.9; 0"
            keyTimes="0; 0.85; 1"
            dur="1.2s" begin={`${i * 0.3}s`} repeatCount="indefinite"/>
        </circle>
      ))}

      <text x={W/2} y={H - 8} textAnchor="middle"
        fontSize={10} fill="var(--text3)" fontFamily="ui-monospace, monospace"
        letterSpacing="0.06em">
        leader pings followers — proves it is alive
      </text>
    </svg>
  )
}

/* ── Quorum ─────────────────────────────────────────────────────────────── */
/**
 * Static-ish: 5 nodes; 3 highlighted as quorum; one is dead. Pulse animations.
 */
export function QuorumAnim() {
  const positions = [0, 1, 2, 3, 4].map(i => nodePos(i, 5, W/2, H/2, 50))
  const dead     = [3, 4]
  const inQuorum = [0, 1, 2]

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {positions.map((p, i) => {
        const isDead = dead.includes(i)
        const isQ    = inQuorum.includes(i)
        return (
          <g key={i} opacity={isDead ? 0.3 : 1}>
            {isQ && (
              <circle cx={p.x} cy={p.y} r={20} fill="none" stroke="#10B981"
                strokeWidth={1.5} opacity={0.6}>
                <animate attributeName="r" values="16; 22" dur="1.6s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.7; 0.2" dur="1.6s" repeatCount="indefinite"/>
              </circle>
            )}
            <circle cx={p.x} cy={p.y} r={14}
              fill={isQ ? '#10B981' : isDead ? '#1F2937' : '#64748B'}
              stroke="rgba(0,0,0,0.4)" strokeWidth={1}/>
            {isDead ? (
              <text x={p.x} y={p.y + 4} textAnchor="middle"
                fontSize={11} fill="#EF4444"
                fontFamily="ui-monospace, monospace">✕</text>
            ) : (
              <text x={p.x} y={p.y + 4} textAnchor="middle"
                fontSize={10} fontWeight={700} fill="white"
                fontFamily="ui-monospace, monospace">
                {isQ ? '✓' : 'F'}
              </text>
            )}
          </g>
        )
      })}

      {/* Math label */}
      <g transform="translate(20, 22)">
        <rect width={84} height={22} rx={4} fill="var(--surface2)" stroke="var(--border)"/>
        <text x={8} y={15} fontSize={11} fill="#10B981"
          fontFamily="ui-monospace, monospace" fontWeight={700}>
          3 / 5 alive ✓
        </text>
      </g>
      <text x={W/2} y={H - 8} textAnchor="middle"
        fontSize={10} fill="var(--text3)" fontFamily="ui-monospace, monospace"
        letterSpacing="0.06em">
        quorum = ⌊N/2⌋+1 = majority required
      </text>
    </svg>
  )
}

/* ── Term progression ───────────────────────────────────────────────────── */
/**
 * Shows how terms increment with each election.
 */
export function TermAnim() {
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Timeline */}
      <line x1={20} y1={H/2} x2={W - 20} y2={H/2}
        stroke="var(--border2)" strokeWidth={1.5} strokeDasharray="3 3"/>

      {/* Term markers */}
      {[1, 2, 3, 4, 5].map((t, i) => {
        const x = 30 + i * 56
        return (
          <g key={t}>
            <line x1={x} y1={H/2 - 8} x2={x} y2={H/2 + 8}
              stroke="var(--border2)" strokeWidth={1}/>
            <circle cx={x} cy={H/2} r={16} fill="var(--surface)"
              stroke="#3B82F6" strokeWidth={1.5} opacity={0}>
              <animate attributeName="opacity"
                values="0; 0; 1; 1; 0.3; 0.3"
                keyTimes={`0; ${i * 0.16}; ${i * 0.16 + 0.05}; ${(i + 1) * 0.16}; ${(i + 1) * 0.16 + 0.05}; 1`}
                dur="6s" repeatCount="indefinite"/>
            </circle>
            <text x={x} y={H/2 + 4} textAnchor="middle"
              fontSize={11} fontWeight={700} fill="var(--accent2)"
              fontFamily="ui-monospace, monospace">
              t{t}
            </text>
            <text x={x} y={H/2 - 16} textAnchor="middle"
              fontSize={9} fill="var(--text3)"
              fontFamily="ui-monospace, monospace"
              opacity={0}>
              <animate attributeName="opacity"
                values="0; 0; 1; 1; 0"
                keyTimes={`0; ${i * 0.16}; ${i * 0.16 + 0.05}; ${(i + 1) * 0.16}; ${(i + 1) * 0.16 + 0.06}`}
                dur="6s" repeatCount="indefinite"/>
              election
            </text>
          </g>
        )
      })}

      <text x={W/2} y={H - 8} textAnchor="middle"
        fontSize={10} fill="var(--text3)" fontFamily="ui-monospace, monospace"
        letterSpacing="0.06em">
        term = logical clock; higher term always wins
      </text>
    </svg>
  )
}
