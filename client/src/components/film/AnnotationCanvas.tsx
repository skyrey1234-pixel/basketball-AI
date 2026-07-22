type Shape = {
  type: "circle" | "arrow" | "zone" | "label";
  x: number;
  y: number;
  x2: number;
  y2: number;
  radius: number;
  color: "red" | "green" | "yellow" | "blue" | "white";
  text: string;
};

const COLOR_MAP: Record<string, string> = {
  red: "#EF4444",
  green: "#22C55E",
  yellow: "#FACC15",
  blue: "#60A5FA",
  white: "#FFFFFF",
};

/** SVG overlay of AI-generated film annotations (percent coordinates 0-100). */
export default function AnnotationCanvas({ shapes }: { shapes: Shape[] }) {
  return (
    <svg viewBox="0 0 100 56.25" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
      <defs>
        <marker id="anno-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <polygon points="0 0, 5 2.5, 0 5" fill="context-stroke" />
        </marker>
      </defs>
      {shapes.map((shape, i) => {
        const color = COLOR_MAP[shape.color] || "#FFFFFF";
        // scale y from 0-100 range to viewBox height
        const sy = (v: number) => (v / 100) * 56.25;
        if (shape.type === "circle") {
          return (
            <g key={i}>
              <circle
                cx={shape.x}
                cy={sy(shape.y)}
                r={Math.min(Math.max(shape.radius || 6, 2), 18)}
                fill="none"
                stroke={color}
                strokeWidth="0.6"
                strokeDasharray="1.5,0.8"
              />
              {shape.text && (
                <text x={shape.x} y={sy(shape.y) - Math.min(Math.max(shape.radius || 6, 2), 18) - 1.2} textAnchor="middle" fontSize="2.2" fill={color} fontWeight="bold" style={{ paintOrder: "stroke", stroke: "#000", strokeWidth: 0.35 }}>
                  {shape.text}
                </text>
              )}
            </g>
          );
        }
        if (shape.type === "arrow") {
          return (
            <g key={i}>
              <line
                x1={shape.x}
                y1={sy(shape.y)}
                x2={shape.x2}
                y2={sy(shape.y2)}
                stroke={color}
                strokeWidth="0.7"
                markerEnd="url(#anno-arrow)"
              />
              {shape.text && (
                <text x={(shape.x + shape.x2) / 2} y={sy((shape.y + shape.y2) / 2) - 1.5} textAnchor="middle" fontSize="2.2" fill={color} fontWeight="bold" style={{ paintOrder: "stroke", stroke: "#000", strokeWidth: 0.35 }}>
                  {shape.text}
                </text>
              )}
            </g>
          );
        }
        if (shape.type === "zone") {
          const w = Math.abs(shape.x2 - shape.x) || 20;
          const h = Math.abs(shape.y2 - shape.y) || 15;
          return (
            <g key={i}>
              <rect
                x={shape.x}
                y={sy(shape.y)}
                width={w}
                height={sy(h)}
                fill={color}
                opacity="0.15"
                stroke={color}
                strokeWidth="0.4"
                strokeDasharray="2,1"
                rx="1"
              />
              {shape.text && (
                <text x={shape.x + w / 2} y={sy(shape.y) + 3} textAnchor="middle" fontSize="2.2" fill={color} fontWeight="bold" style={{ paintOrder: "stroke", stroke: "#000", strokeWidth: 0.35 }}>
                  {shape.text}
                </text>
              )}
            </g>
          );
        }
        // label
        return (
          <g key={i}>
            <rect x={shape.x - 1} y={sy(shape.y) - 3} width={Math.min(shape.text.length * 1.4 + 2, 40)} height="4.5" fill="#000" opacity="0.6" rx="0.8" />
            <text x={shape.x} y={sy(shape.y)} fontSize="2.4" fill={color} fontWeight="bold">
              {shape.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
