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

// Scene 3 is visible frames 66–108
// Equation tokens exit (fade + translateY up, frames 66–78)
// "=" enters (fade + translateY down, frames 72–90)
// "analytics" enters (fade + scale, frames 76–94)
// holds 94–102, cross-fades out 102–108
export const EquationScene3: React.FC = () => {
  const frame = useCurrentFrame();

  // Only visible during frames 66–108
  const sceneVisible = frame >= 66 && frame <= 108 ? 1 : 0;

  // Exit: equation tokens fade out + move up, frames 66–78
  const exitOpacityYourData = interpolate(frame, [66, 78], [0.3, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing,
  });
  const exitOpacityOthers = interpolate(frame, [66, 78], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing,
  });
  const exitTranslateY = interpolate(frame, [66, 78], [0, -20], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing,
  });

  // Cross-fade out "= analytics" result at frames 102–108
  const resultOpacity = interpolate(frame, [102, 108], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing,
  });

  return (
    <AbsoluteFill style={{ ...centerStyle, opacity: sceneVisible }}>
      {/* Exiting equation row */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          transform: `translateY(${exitTranslateY}px)`,
        }}
      >
        <span style={{ ...tokenStyle, fontWeight: 700, color: '#ffffff', opacity: exitOpacityYourData }}>
          your data
        </span>
        <span style={{ ...tokenStyle, fontWeight: 400, color: '#555555', opacity: exitOpacityOthers, padding: '0 16px' }}>
          +
        </span>
        <span style={{ ...tokenStyle, fontWeight: 700, color: '#ffffff', opacity: exitOpacityOthers }}>
          your warehouse
        </span>
      </div>

      {/* Entering result: "= analytics" */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: resultOpacity }}>
        <AnimatedText
          opacityFrames={[72, 90]}
          opacityValues={[0, 1]}
          translateYFrames={[72, 90]}
          translateYValues={[-16, 0]}
          style={{
            ...tokenStyle,
            fontWeight: 400,
            color: '#555555',
          }}
        >
          =
        </AnimatedText>

        <AnimatedText
          opacityFrames={[76, 94]}
          opacityValues={[0, 1]}
          scaleFrames={[76, 94]}
          scaleValues={[0.95, 1]}
          style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: 72,
            fontWeight: 700,
            color: '#3b82f6',
            letterSpacing: '-0.03em',
          }}
        >
          analytics
        </AnimatedText>
      </div>
    </AbsoluteFill>
  );
};
