// hello this is vishal project
// =============================================================================
// Architectural Line Drawing & 2D Schematic Preview Component
// Renders live parametric technical blueprints / line drawings for:
// - Curtains (Rod/Track, Pinch Pleats, Drapery Folds, Width x Drop, Floor Clearance)
// - Window Blinds (Venetian Slats, Honeycomb Cellular, Roller Cassette & Drop)
// - Wallpapers (Wall Elevation, Vertical Panels/Seams, Roll Repeat Grid)
// - Mattresses (3D Isometric Wireframe, Thickness/Depth, Size Presets)
// - Upholstery (Sofa / Seating Layout, Cushion Segments, Yardage Calculation)
// =============================================================================

export type ProductTypeCategory =
  | 'curtain'
  | 'blind-venetian'
  | 'blind-honeycomb'
  | 'blind-roller'
  | 'wallpaper'
  | 'mattress'
  | 'upholstery';

export interface LineDrawProps {
  category?: string;
  width: number;
  height: number;
  depth?: number;
  unit: string;
  quantity?: number;
  label?: string;
  measurementType?: string;
  room?: string;
  subType?: string;
  className?: string;
}

export function detectCategory(cat?: string, name?: string, room?: string): ProductTypeCategory {
  const c = `${cat ?? ''} ${name ?? ''} ${room ?? ''}`.toLowerCase();
  if (c.includes('venetian')) return 'blind-venetian';
  if (c.includes('honeycomb')) return 'blind-honeycomb';
  if (c.includes('roller') || c.includes('zebra') || c.includes('blind')) return 'blind-roller';
  if (c.includes('wallpaper') || c.includes('wall paper') || c.includes('wall')) return 'wallpaper';
  if (c.includes('mattress') || c.includes('bed') || c.includes('ortho') || c.includes('foam')) return 'mattress';
  if (c.includes('upholstery') || c.includes('sofa') || c.includes('fabric') || c.includes('chair') || c.includes('cushion')) return 'upholstery';
  return 'curtain';
}

export function ProductLineDraw({
  category,
  width,
  height,
  depth = 8,
  unit,
  quantity = 1,
  label = 'Window A',
  measurementType = 'Rod-to-rod',
  room = 'Living Room',
  className = '',
}: LineDrawProps) {
  const type = detectCategory(category);
  const wNum = Math.max(1, Number(width) || 60);
  const hNum = Math.max(1, Number(height) || 72);
  const dNum = Math.max(1, Number(depth) || 8);

  const dimLine = (x1: number, y1: number, x2: number, y2: number, color = '#0f766e') => (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth="1.2"
      markerEnd="url(#arwEnd)"
      markerStart="url(#arwStart)"
    />
  );

  return (
    <div className={`relative overflow-hidden rounded-xl border border-line-soft bg-gradient-to-b from-slate-50 to-white p-2.5 ${className}`}>
      {/* Title & Badge */}
      <div className="mb-1.5 flex items-center justify-between border-b border-line-soft/60 pb-1 text-[11px]">
        <span className="font-semibold text-ink">
          {label || room} · <span className="text-teal-700 capitalize">{type.replace('-', ' ')}</span>
        </span>
        <span className="rounded bg-teal-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-teal-800">
          {wNum} × {hNum} {unit} {type === 'mattress' ? `× ${dNum}"` : ''}
        </span>
      </div>

      <svg viewBox="0 0 340 230" className="w-full select-none" style={{ maxHeight: '230px' }}>
        <defs>
          <marker id="arwStart" markerWidth="7" markerHeight="5" refX="2" refY="2.5" orient="auto">
            <path d="M7 0 L0 2.5 L7 5 Z" fill="#0f766e" />
          </marker>
          <marker id="arwEnd" markerWidth="7" markerHeight="5" refX="5" refY="2.5" orient="auto">
            <path d="M0 0 L7 2.5 L0 5 Z" fill="#0f766e" />
          </marker>
          <pattern id="blueprintGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
          </pattern>
          <linearGradient id="curtainGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.18" />
            <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.18" />
          </linearGradient>
        </defs>

        {/* Blueprint background grid */}
        <rect x="2" y="2" width="336" height="226" rx="8" fill="url(#blueprintGrid)" stroke="#e2e8f0" strokeWidth="1" />

        {/* ------------------------------------------------------------- */}
        {/* CASE 1: CURTAINS                                              */}
        {/* ------------------------------------------------------------- */}
        {type === 'curtain' && (() => {
          const aspect = Math.max(0.6, Math.min(2.2, wNum / hNum));
          const w = Math.min(200, Math.max(100, 150 * aspect));
          const h = Math.min(130, Math.max(70, w / aspect));
          const ox = (340 - w) / 2;
          const oy = 48;
          const rodY = oy - 14;
          const floorY = oy + h + 12;

          return (
            <g>
              {/* Floor line */}
              <line x1="16" y1={floorY} x2="324" y2={floorY} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" />
              <text x="320" y={floorY - 4} textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">FLOOR LINE</text>

              {/* Curtain Rod & Finials */}
              <line x1={ox - 18} y1={rodY} x2={ox + w + 18} y2={rodY} stroke="#334155" strokeWidth="4" strokeLinecap="round" />
              <circle cx={ox - 18} cy={rodY} r="5" fill="#475569" stroke="#1e293b" strokeWidth="1" />
              <circle cx={ox + w + 18} cy={rodY} r="5" fill="#475569" stroke="#1e293b" strokeWidth="1" />
              {/* Brackets */}
              <rect x={ox - 6} y={rodY - 6} width="6" height="10" fill="#64748b" rx="1" />
              <rect x={ox + w} y={rodY - 6} width="6" height="10" fill="#64748b" rx="1" />
              {/* Middle bracket if wide */}
              {w > 140 && <rect x={ox + w / 2 - 3} y={rodY - 6} width="6" height="10" fill="#64748b" rx="1" />}

              {/* Window Frame in background */}
              <rect x={ox + 8} y={oy + 2} width={w - 16} height={h - 4} rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1={ox + w / 2} y1={oy + 2} x2={ox + w / 2} y2={oy + h - 2} stroke="#cbd5e1" strokeWidth="1.2" />
              <line x1={ox + 8} y1={oy + h / 2} x2={ox + w - 8} y2={oy + h / 2} stroke="#cbd5e1" strokeWidth="1.2" />

              {/* Left Curtain Panel with Drapes / Pleats */}
              <path
                d={`M${ox - 14},${rodY + 2} Q${ox - 10},${oy + 6} ${ox + 4},${oy + 10} L${ox + w / 2 - 4},${oy + 10} L${ox + w / 2 - 4},${oy + h + 8} L${ox - 10},${oy + h + 8} Q${ox - 18},${oy + h / 2} ${ox - 14},${rodY + 2}`}
                fill="url(#curtainGradient)"
                stroke="#0f766e"
                strokeWidth="1.4"
              />
              {/* Pleat vertical folds */}
              {Array.from({ length: 5 }).map((_, i) => {
                const px = ox - 6 + (w / 2 - 2) * (i / 4.5);
                return (
                  <path
                    key={`pleat-l-${i}`}
                    d={`M${px},${oy + 10} Q${px - 2},${oy + h / 2} ${px + 2},${oy + h + 8}`}
                    stroke="#0f766e"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                    fill="none"
                  />
                );
              })}

              {/* Right Curtain Panel with Drapes / Pleats */}
              <path
                d={`M${ox + w / 2 + 4},${oy + 10} L${ox + w - 4},${oy + 10} Q${ox + w + 10},${oy + 6} ${ox + w + 14},${rodY + 2} L${ox + w + 10},${oy + h + 8} L${ox + w / 2 + 4},${oy + h + 8} Z`}
                fill="url(#curtainGradient)"
                stroke="#0f766e"
                strokeWidth="1.4"
              />
              {/* Pleat vertical folds */}
              {Array.from({ length: 5 }).map((_, i) => {
                const px = ox + w / 2 + 8 + (w / 2 - 16) * (i / 4);
                return (
                  <path
                    key={`pleat-r-${i}`}
                    d={`M${px},${oy + 10} Q${px + 2},${oy + h / 2} ${px - 2},${oy + h + 8}`}
                    stroke="#0f766e"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                    fill="none"
                  />
                );
              })}

              {/* Tiebacks / hooks indicator */}
              <circle cx={ox - 10} cy={oy + h * 0.6} r="3" fill="#0f766e" opacity="0.6" />
              <circle cx={ox + w + 10} cy={oy + h * 0.6} r="3" fill="#0f766e" opacity="0.6" />

              {/* Width Dimension Line Top */}
              {dimLine(ox - 14, rodY - 14, ox + w + 14, rodY - 14)}
              <text x={ox + w / 2} y={rodY - 18} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f766e">
                Width: {wNum} {unit}
              </text>

              {/* Drop Dimension Line Left */}
              {dimLine(ox - 28, rodY, ox - 28, oy + h + 8)}
              <text
                x={ox - 34}
                y={oy + h / 2}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#0f766e"
                transform={`rotate(-90 ${ox - 34} ${oy + h / 2})`}
              >
                Drop: {hNum} {unit}
              </text>

              {/* Floor clearance label */}
              <line x1={ox + w + 18} y1={oy + h + 8} x2={ox + w + 26} y2={oy + h + 8} stroke="#94a3b8" strokeWidth="0.8" />
              <line x1={ox + w + 18} y1={floorY} x2={ox + w + 26} y2={floorY} stroke="#94a3b8" strokeWidth="0.8" />
              <text x={ox + w + 30} y={floorY - 2} fontSize="8" fill="#64748b">1" clearance</text>
            </g>
          );
        })()}

        {/* ------------------------------------------------------------- */}
        {/* CASE 2: WINDOW BLINDS (Venetian, Honeycomb, Roller)          */}
        {/* ------------------------------------------------------------- */}
        {(type.startsWith('blind-')) && (() => {
          const aspect = Math.max(0.7, Math.min(2.0, wNum / hNum));
          const w = Math.min(190, Math.max(110, 140 * aspect));
          const h = Math.min(130, Math.max(80, w / aspect));
          const ox = (340 - w) / 2;
          const oy = 48;
          const isVenetian = type === 'blind-venetian';
          const isHoneycomb = type === 'blind-honeycomb';
          const slatCount = Math.min(14, Math.max(6, Math.floor(h / 9)));

          return (
            <g>
              {/* Outer Window Recess/Frame */}
              <rect x={ox - 8} y={oy - 6} width={w + 16} height={h + 16} rx="4" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.8" />
              <rect x={ox - 3} y={oy - 1} width={w + 6} height={h + 6} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />

              {/* Top Cassette / Headrail */}
              <rect x={ox} y={oy} width={w} height="14" rx="2" fill="#334155" stroke="#1e293b" strokeWidth="1.2" />
              <rect x={ox + 2} y={oy + 2} width={w - 4} height="3" fill="#64748b" opacity="0.6" />

              {/* Bottom Weight Bar */}
              <rect x={ox} y={oy + h - 8} width={w} height="10" rx="2" fill="#475569" stroke="#334155" strokeWidth="1" />

              {/* Internal Structure */}
              {isVenetian && (
                <g>
                  {/* Slats */}
                  {Array.from({ length: slatCount }).map((_, i) => {
                    const sy = oy + 18 + (i * (h - 28)) / (slatCount - 1);
                    return (
                      <g key={`slat-${i}`}>
                        <rect x={ox + 2} y={sy} width={w - 4} height="4.5" rx="1.5" fill="#f0fdfa" stroke="#0f766e" strokeWidth="0.8" />
                        <line x1={ox + 4} y1={sy + 2} x2={ox + w - 4} y2={sy + 2} stroke="#14b8a6" strokeWidth="0.5" />
                      </g>
                    );
                  })}
                  {/* Ladder cords */}
                  <line x1={ox + w * 0.25} y1={oy + 14} x2={ox + w * 0.25} y2={oy + h - 8} stroke="#0d9488" strokeWidth="0.8" strokeDasharray="3 2" />
                  <line x1={ox + w * 0.75} y1={oy + 14} x2={ox + w * 0.75} y2={oy + h - 8} stroke="#0d9488" strokeWidth="0.8" strokeDasharray="3 2" />
                  {/* Wand / Cord */}
                  <line x1={ox + w + 4} y1={oy + 6} x2={ox + w + 4} y2={oy + h * 0.7} stroke="#475569" strokeWidth="1.5" />
                  <circle cx={ox + w + 4} cy={oy + h * 0.7} r="3" fill="#64748b" />
                </g>
              )}

              {isHoneycomb && (
                <g>
                  {/* Cellular Honeycomb Hex/Pleat Rows */}
                  {Array.from({ length: Math.min(12, Math.floor(h / 10)) }).map((_, i) => {
                    const cy = oy + 16 + (i * (h - 26)) / 11;
                    return (
                      <g key={`honey-${i}`}>
                        <rect x={ox + 2} y={cy} width={w - 4} height="7" rx="2" fill="#ccfbf1" stroke="#0d9488" strokeWidth="0.8" opacity="0.85" />
                        <path d={`M${ox + 4},${cy + 3.5} L${ox + 10},${cy + 1} L${ox + 16},${cy + 3.5}`} stroke="#0f766e" strokeWidth="0.5" fill="none" />
                      </g>
                    );
                  })}
                  <text x={ox + w / 2} y={oy + h / 2} textAnchor="middle" fontSize="8" fontWeight="600" fill="#0f766e" opacity="0.7">
                    DUAL CELLULAR CORE
                  </text>
                </g>
              )}

              {type === 'blind-roller' && (
                <g>
                  {/* Smooth Fabric Drop */}
                  <rect x={ox + 3} y={oy + 14} width={w - 6} height={h - 22} fill="#e6fffa" stroke="#5eead4" strokeWidth="1" />
                  {/* Subtle vertical texture */}
                  <line x1={ox + w * 0.33} y1={oy + 14} x2={ox + w * 0.33} y2={oy + h - 8} stroke="#99f6e4" strokeWidth="0.8" strokeDasharray="4 4" />
                  <line x1={ox + w * 0.66} y1={oy + 14} x2={ox + w * 0.66} y2={oy + h - 8} stroke="#99f6e4" strokeWidth="0.8" strokeDasharray="4 4" />
                  {/* Beaded loop chain on right */}
                  <path d={`M${ox + w + 4},${oy + 6} L${ox + w + 4},${oy + h * 0.65} Q${ox + w + 6},${oy + h * 0.65 + 4} ${ox + w + 8},${oy + h * 0.65} L${ox + w + 8},${oy + 6}`} stroke="#64748b" strokeWidth="1" fill="none" strokeDasharray="2 2" />
                </g>
              )}

              {/* Dimensions */}
              {dimLine(ox, oy - 14, ox + w, oy - 14)}
              <text x={ox + w / 2} y={oy - 18} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f766e">
                Recess Width: {wNum} {unit}
              </text>

              {dimLine(ox - 18, oy, ox - 18, oy + h)}
              <text
                x={ox - 24}
                y={oy + h / 2}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#0f766e"
                transform={`rotate(-90 ${ox - 24} ${oy + h / 2})`}
              >
                Drop: {hNum} {unit}
              </text>
            </g>
          );
        })()}

        {/* ------------------------------------------------------------- */}
        {/* CASE 3: WALLPAPERS (Wall Elevation & Roll Seams)              */}
        {/* ------------------------------------------------------------- */}
        {type === 'wallpaper' && (() => {
          const aspect = Math.max(0.8, Math.min(2.4, wNum / hNum));
          const w = Math.min(220, Math.max(120, 150 * aspect));
          const h = Math.min(130, Math.max(80, w / aspect));
          const ox = (340 - w) / 2;
          const oy = 46;
          // Standard wallpaper rolls in India: 21 inch width (approx 0.53m)
          const panels = Math.max(2, Math.min(8, Math.ceil((wNum / 21) || 4)));

          return (
            <g>
              {/* Wall Frame Outline */}
              <rect x={ox} y={oy} width={w} height={h} fill="#f0fdfa" stroke="#0f766e" strokeWidth="2" rx="2" />
              {/* Floor Baseboard & Skirting */}
              <rect x={ox - 6} y={oy + h} width={w + 12} height="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
              <text x={ox + w / 2} y={oy + h + 6} textAnchor="middle" fontSize="6.5" fill="#64748b" fontWeight="600">SKIRTING BOARD</text>

              {/* Vertical Panel Drops / Seams */}
              {Array.from({ length: panels - 1 }).map((_, i) => {
                const px = ox + ((i + 1) * w) / panels;
                return (
                  <g key={`seam-${i}`}>
                    <line x1={px} y1={oy} x2={px} y2={oy + h} stroke="#0f766e" strokeWidth="1.2" strokeDasharray="3 3" />
                    <text x={px} y={oy + 10} textAnchor="middle" fontSize="6" fill="#0d9488">Drop {i + 2}</text>
                  </g>
                );
              })}
              <text x={ox + w / (panels * 2)} y={oy + 10} textAnchor="middle" fontSize="6" fill="#0d9488">Drop 1</text>

              {/* Subtle Wallpaper Pattern Repeat Motif */}
              {Array.from({ length: panels }).map((_, pi) => {
                const cx = ox + (pi + 0.5) * (w / panels);
                return (
                  <g key={`motif-${pi}`} opacity="0.35">
                    <circle cx={cx} cy={oy + h * 0.35} r="6" stroke="#0d9488" fill="none" strokeWidth="0.8" />
                    <circle cx={cx} cy={oy + h * 0.7} r="6" stroke="#0d9488" fill="none" strokeWidth="0.8" />
                  </g>
                );
              })}

              {/* Area & Roll calculation indicator badge */}
              <rect x={ox + w / 2 - 45} y={oy + h / 2 - 10} width="90" height="20" rx="4" fill="#ffffff" stroke="#14b8a6" strokeWidth="1" />
              <text x={ox + w / 2} y={oy + h / 2 + 3} textAnchor="middle" fontSize="8" fontWeight="700" fill="#0f766e">
                {panels} Drops · ~{Math.ceil(panels / 3)} Rolls (57 sq.ft/roll)
              </text>

              {/* Dimensions */}
              {dimLine(ox, oy - 14, ox + w, oy - 14)}
              <text x={ox + w / 2} y={oy - 18} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f766e">
                Wall Width: {wNum} {unit}
              </text>

              {dimLine(ox - 18, oy, ox - 18, oy + h)}
              <text
                x={ox - 24}
                y={oy + h / 2}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#0f766e"
                transform={`rotate(-90 ${ox - 24} ${oy + h / 2})`}
              >
                Wall Height: {hNum} {unit}
              </text>
            </g>
          );
        })()}

        {/* ------------------------------------------------------------- */}
        {/* CASE 4: MATTRESS (Isometric 3D Wireframe Drawing)             */}
        {/* ------------------------------------------------------------- */}
        {type === 'mattress' && (() => {
          // Standard Indian Mattress sizes: Single 72x36, Queen 72x60, King 72x72
          const isKing = wNum >= 70 && hNum >= 70;
          const isQueen = (wNum >= 58 && hNum >= 70) || (wNum >= 70 && hNum >= 58);
          const sizeName = isKing ? 'King Size' : isQueen ? 'Queen Size' : wNum <= 42 ? 'Single Size' : 'Custom Size';

          // Isometric coordinates
          const cx = 170;
          const cy = 100;
          const dx = 80;
          const dy = 38;
          const depthPx = Math.min(30, Math.max(16, dNum * 2));

          // Top face points
          const pTop = `${cx},${cy - dy} ${cx + dx},${cy} ${cx},${cy + dy} ${cx - dx},${cy}`;
          // Bottom edges
          const bRight = `${cx + dx},${cy + depthPx} ${cx},${cy + dy + depthPx}`;
          const bLeft = `${cx - dx},${cy + depthPx} ${cx},${cy + dy + depthPx}`;

          return (
            <g>
              {/* Mattress Top Face */}
              <polygon points={pTop} fill="#f0fdfa" stroke="#0f766e" strokeWidth="1.8" />
              {/* Quilted diamond stitching on top */}
              <line x1={cx} y1={cy - dy} x2={cx} y2={cy + dy} stroke="#5eead4" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={cx - dx} y1={cy} x2={cx + dx} y2={cy} stroke="#5eead4" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={cx - dx / 2} y1={cy - dy / 2} x2={cx + dx / 2} y2={cy + dy / 2} stroke="#5eead4" strokeWidth="0.8" strokeDasharray="2 2" />
              <line x1={cx + dx / 2} y1={cy - dy / 2} x2={cx - dx / 2} y2={cy + dy / 2} stroke="#5eead4" strokeWidth="0.8" strokeDasharray="2 2" />

              {/* Front-Right Face */}
              <polygon
                points={`${cx},${cy + dy} ${cx + dx},${cy} ${cx + dx},${cy + depthPx} ${cx},${cy + dy + depthPx}`}
                fill="#ccfbf1"
                stroke="#0f766e"
                strokeWidth="1.6"
              />
              {/* Front-Left Face */}
              <polygon
                points={`${cx},${cy + dy} ${cx - dx},${cy} ${cx - dx},${cy + depthPx} ${cx},${cy + dy + depthPx}`}
                fill="#99f6e4"
                stroke="#0f766e"
                strokeWidth="1.6"
                opacity="0.8"
              />

              {/* Corner piping cord */}
              <circle cx={cx} cy={cy + dy} r="2.5" fill="#0f766e" />
              <circle cx={cx + dx} cy={cy} r="2.5" fill="#0f766e" />
              <circle cx={cx - dx} cy={cy} r="2.5" fill="#0f766e" />

              {/* Dimension: Length along left iso axis */}
              {dimLine(cx - dx - 10, cy + 4, cx - 10, cy + dy + 4)}
              <text x={cx - dx / 2 - 18} y={cy + dy / 2 + 10} fontSize="9" fontWeight="700" fill="#0f766e">
                L: {hNum} {unit}
              </text>

              {/* Dimension: Width along right iso axis */}
              {dimLine(cx + 10, cy + dy + 4, cx + dx + 10, cy + 4)}
              <text x={cx + dx / 2 + 18} y={cy + dy / 2 + 10} fontSize="9" fontWeight="700" fill="#0f766e">
                W: {wNum} {unit}
              </text>

              {/* Dimension: Thickness/Height vertical */}
              {dimLine(cx + dx + 16, cy, cx + dx + 16, cy + depthPx)}
              <text x={cx + dx + 22} y={cy + depthPx / 2 + 3} fontSize="9" fontWeight="700" fill="#0f766e">
                {dNum}" Thick
              </text>

              {/* Size preset badge */}
              <rect x="110" y="196" width="120" height="20" rx="10" fill="#0f766e" />
              <text x="170" y="210" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#ffffff">
                {sizeName.toUpperCase()}
              </text>
            </g>
          );
        })()}

        {/* ------------------------------------------------------------- */}
        {/* CASE 5: UPHOLSTERY (Sofa & Seating Wireframe Diagram)         */}
        {/* ------------------------------------------------------------- */}
        {type === 'upholstery' && (() => {
          // Determine seating capacity from width (e.g. 72" ~ 3-seater, 54" ~ 2-seater, 36" ~ 1-seater / Armchair)
          const seats = wNum >= 78 ? 3 : wNum >= 50 ? 2 : 1;
          const seatLabel = `${seats}-Seater ${seats === 1 ? 'Armchair' : 'Sofa'}`;

          const ox = 70;
          const oy = 60;
          const w = 200;
          const h = 100;
          const armW = 18;
          const cushionW = (w - 2 * armW) / seats;

          return (
            <g>
              {/* Backrest frame */}
              <rect x={ox + armW} y={oy} width={w - 2 * armW} height="28" rx="4" fill="#ccfbf1" stroke="#0f766e" strokeWidth="1.6" />
              {/* Left Armrest */}
              <rect x={ox} y={oy + 10} width={armW} height={h - 10} rx="6" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.6" />
              {/* Right Armrest */}
              <rect x={ox + w - armW} y={oy + 10} width={armW} height={h - 10} rx="6" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.6" />

              {/* Seat Cushions */}
              {Array.from({ length: seats }).map((_, i) => {
                const sx = ox + armW + i * cushionW;
                return (
                  <g key={`cushion-${i}`}>
                    {/* Backrest Cushion */}
                    <rect x={sx + 2} y={oy + 2} width={cushionW - 4} height="24" rx="3" fill="#f0fdfa" stroke="#0f766e" strokeWidth="1.2" />
                    {/* Seat Cushion */}
                    <rect x={sx + 2} y={oy + 30} width={cushionW - 4} height="58" rx="4" fill="#f8fafc" stroke="#0f766e" strokeWidth="1.4" />
                    {/* Tufting button / piping */}
                    <circle cx={sx + cushionW / 2} cy={oy + 58} r="2" fill="#0f766e" opacity="0.6" />
                  </g>
                );
              })}

              {/* Sofa Front Base Skirt */}
              <rect x={ox + armW} y={oy + 88} width={w - 2 * armW} height="12" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
              {/* Feet */}
              <rect x={ox + 2} y={oy + h} width="12" height="8" rx="1" fill="#334155" />
              <rect x={ox + w - 14} y={oy + h} width="12" height="8" rx="1" fill="#334155" />

              {/* Dimensions */}
              {dimLine(ox, oy - 14, ox + w, oy - 14)}
              <text x={ox + w / 2} y={oy - 18} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f766e">
                Overall Width: {wNum} {unit}
              </text>

              {dimLine(ox - 16, oy, ox - 16, oy + h)}
              <text
                x={ox - 22}
                y={oy + h / 2}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#0f766e"
                transform={`rotate(-90 ${ox - 22} ${oy + h / 2})`}
              >
                Depth: {hNum} {unit}
              </text>

              {/* Upholstery Fabric yardage estimate badge */}
              <rect x="100" y="196" width="140" height="20" rx="10" fill="#0f766e" />
              <text x="170" y="210" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff">
                {seatLabel.toUpperCase()} · ~{seats * 4.5} Mtr Fabric
              </text>
            </g>
          );
        })()}

        {/* Footer Technical Metadata Label */}
        <text x="170" y="224" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">
          ARADHANA FURNISHING TECHNICAL SCHEMATIC · SCALE 1:20 · NORMAL FRONT/PLAN VIEW
        </text>
      </svg>
    </div>
  );
}
