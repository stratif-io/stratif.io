import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { AnimatedText } from '../components/AnimatedText';

const easing = Easing.out(Easing.cubic);

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// Scene 1 is visible frames 0–36
// "your data" fades in + scales up frames 0–12, holds 12–36
export const EquationScene1: React.FC = () => {
  const frame = useCurrentFrame();

  // Outer opacity: fade out at end of scene (frame 36 = hard cut, clamped)
  const outerOpacity = interpolate(frame, [0, 36], [1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

  // Scene visibility: invisible after frame 36
  const sceneVisible = frame <= 36 ? 1 : 0;

  return (
    <AbsoluteFill style={{ ...centerStyle, opacity: sceneVisible }}>
      <AnimatedText
        opacityFrames={[0, 12]}
        opacityValues={[0, 1]}
        scaleFrames={[0, 12]}
        scaleValues={[0.95, 1]}
        style={{
          fontFamily: 'Geist, sans-serif',
          fontSize: 64,
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.03em',
        }}
      >
        your data
      </AnimatedText>
    </AbsoluteFill>
  );
};
