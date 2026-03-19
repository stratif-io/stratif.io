import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { AnimatedText } from '../components/AnimatedText';

const centerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

// Scene 4 is visible frames 102–150
// Logo fades in frames 102–114
// CTA fades in frames 114–126
// Both hold through frame 150
export const EquationScene4: React.FC = () => {
  const frame = useCurrentFrame();

  // Only visible during frames 102–150
  const sceneVisible = frame >= 102 ? 1 : 0;

  return (
    <AbsoluteFill style={{ ...centerStyle, opacity: sceneVisible }}>
      {/* Logo: "$ stratifio" */}
      <AnimatedText
        opacityFrames={[102, 114]}
        opacityValues={[0, 1]}
        style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}
      >
        <span
          style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: 32,
            fontWeight: 700,
            color: '#3b82f6',
            letterSpacing: '-0.03em',
          }}
        >
          $
        </span>
        <span
          style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: 32,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.03em',
          }}
        >
          stratif.io
        </span>
      </AnimatedText>

      {/* CTA */}
      <AnimatedText
        opacityFrames={[114, 126]}
        opacityValues={[0, 1]}
        style={{
          fontFamily: 'Geist, sans-serif',
          fontSize: 14,
          fontWeight: 400,
          color: '#3b82f6',
          letterSpacing: '0.12em',
          marginTop: 16,
        }}
      >
        get started free
      </AnimatedText>
    </AbsoluteFill>
  );
};
