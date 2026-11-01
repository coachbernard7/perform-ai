import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect, useMemo, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { buildMatrixStreams, getMatrixColumnSpec } from "@/lib/matrix-rain";

const GLYPH_SIZE = 13;
const GLYPH_LINE_HEIGHT = 18;
const STREAM_LENGTH = 30;

const RainColumn = memo(function RainColumn({
  index,
  stream,
  x,
  screenHeight,
  color,
  reduceMotion,
}: {
  index: number;
  stream: string;
  x: number;
  screenHeight: number;
  color: string;
  reduceMotion: boolean;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const spec = useMemo(() => getMatrixColumnSpec(index), [index]);
  const streamHeight = STREAM_LENGTH * GLYPH_LINE_HEIGHT;

  useEffect(() => {
    progress.stopAnimation();
    if (reduceMotion) {
      progress.setValue(spec.startOffset);
      return;
    }
    progress.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: spec.duration,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion, spec.delay, spec.duration, spec.startOffset]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-streamHeight, screenHeight + streamHeight * 0.15],
  });

  return (
    <Animated.View
      testID={`matrix-column-${index}`}
      style={[
        styles.column,
        {
          left: x,
          opacity: spec.opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.glyphs}>
        {Array.from(stream).map((glyph, row) => (
          <Text
            key={`${index}-${row}`}
            style={{
              color: row % 11 === 0 ? "#ECFFF3" : row % 5 === 0 ? "#7CFFAD" : color,
              opacity: Math.max(0.18, 1 - row / (STREAM_LENGTH * 1.1)),
            }}
          >
            {glyph}{"\n"}
          </Text>
        ))}
      </Text>
    </Animated.View>
  );
});

export function MatrixRain({ color = "#39FF88", background = "#010604", reduceMotion = false }: { color?: string; background?: string; reduceMotion?: boolean }) {
  const { width, height } = useWindowDimensions();
  const columnCount = Math.max(9, Math.min(22, Math.ceil(width / 31)));
  const streams = useMemo(() => buildMatrixStreams(columnCount, STREAM_LENGTH), [columnCount]);
  const gap = width / columnCount;

  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.container}>
      {streams.map((stream, index) => (
        <RainColumn
          key={`${columnCount}-${index}`}
          index={index}
          stream={stream}
          x={index * gap + (index % 3) * 3}
          screenHeight={height}
          color={color}
          reduceMotion={reduceMotion}
        />
      ))}
      <LinearGradient colors={[background, "transparent", "transparent", background]} locations={[0, 0.2, 0.76, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.scanlines} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  column: {
    position: "absolute",
    top: 0,
    width: 22,
  },
  glyphs: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: GLYPH_SIZE,
    lineHeight: GLYPH_LINE_HEIGHT,
    fontWeight: "700",
    textAlign: "center",
  },
  scanlines: {
    ...StyleSheet.absoluteFill,
    opacity: 0.13,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: "#A8FFC4",
  },
});
