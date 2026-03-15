import { useState } from 'react';

interface Cursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

export function CursorOverlay() {
  const [cursors] = useState<Cursor[]>([]);

  // In production, cursors would come from Y-Sweet awareness protocol.
  // Each connected user broadcasts their pointer position, and this overlay
  // renders all remote cursors with smooth interpolation.

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {cursors.map((c) => (
        <div
          key={c.id}
          className="absolute transition-all duration-100"
          style={{ left: c.x, top: c.y }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill={c.color}
          >
            <path d="M0 0l6 14 2-6 6-2z" />
          </svg>
          <span
            className="ml-4 rounded px-1 py-0.5 text-[10px] text-white"
            style={{ backgroundColor: c.color }}
          >
            {c.name}
          </span>
        </div>
      ))}
    </div>
  );
}
