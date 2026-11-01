const MATRIX_GLYPHS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾗﾘﾙﾚﾛﾜﾝ";

function seededValue(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export type MatrixColumnSpec = {
  delay: number;
  duration: number;
  opacity: number;
  startOffset: number;
};

export function buildMatrixStreams(columnCount: number, streamLength = 28): string[] {
  const safeColumns = Math.max(1, Math.min(32, Math.floor(columnCount)));
  const safeLength = Math.max(8, Math.min(64, Math.floor(streamLength)));
  return Array.from({ length: safeColumns }, (_, column) =>
    Array.from({ length: safeLength }, (_, row) => {
      const index = Math.floor(seededValue((column + 1) * 101 + row * 17) * MATRIX_GLYPHS.length);
      return MATRIX_GLYPHS[index] ?? "0";
    }).join(""),
  );
}

export function getMatrixColumnSpec(index: number): MatrixColumnSpec {
  return {
    delay: Math.round(seededValue(index * 31 + 7) * 3600),
    duration: 5200 + Math.round(seededValue(index * 47 + 13) * 5200),
    opacity: 0.34 + seededValue(index * 61 + 19) * 0.38,
    startOffset: seededValue(index * 79 + 23),
  };
}
