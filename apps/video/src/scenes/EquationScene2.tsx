import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { AnimatedText } from '../components/AnimatedText';

const easing = Easing.out(Easing.cubic);

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const tokenStyle: React.CSSProperties = {
  fontFamily: 'Geist, sans-serif',
  fontSize: 64,
  letterSpacing: '-0.03em',
};

// Scene 2 is visible frames 36–66
// "your data" dims (opacity 1→0.3, frames 36–48)
// "+" and "your warehouse" enter from right (opacity 0→1, translateX +40→0, frames 36–48)
// holds frames 48–66
export const EquationScene2: React.FC = () => {
  const frame = useCurrentFrame();

  // Only visible during frames 36–66
  const sceneVisible = frame >= 36 && frame <= 66 ? 1 : 0;

  const yourDataOpacity = interpolate(frame, [36, 48], [1, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

  return (
    <AbsoluteFill style={{ ...centerStyle, opacity: sceneVisible }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {/* "your data" — dimming */}
        <span
          style={{
            ...tokenStyle,
            fontWeight: 700,
            color: '#ffffff',
            opacity: yourDataOpacity,
          }}
        >
          your data
        </span>

        {/* "+" — enters from right */}
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <AnimatedText
            opacityFrames={[36, 48]}
            opacityValues={[0, 1]}
            translateXFrames={[36, 48]}
            translateXValues={[40, 0]}
            style={{
              ...tokenStyle,
              fontWeight: 400,
              color: '#555555',
              padding: '0 16px',
            }}
          >
            +
          </AnimatedText>
        </span>

        {/* "your warehouse" — enters from right */}
        <AnimatedText
          opacityFrames={[36, 48]}
          opacityValues={[0, 1]}
          translateXFrames={[36, 48]}
          translateXValues={[40, 0]}
          style={{
            ...tokenStyle,
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          your warehouse
        </AnimatedText>
      </div>
    </AbsoluteFill>
  );
};
