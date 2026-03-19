import { useCurrentFrame, interpolate, Easing } from 'remotion';
import React from 'react';

const easing = Easing.out(Easing.cubic);

interface AnimatedTextProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  opacityFrames?: [number, number];
  opacityValues?: [number, number];
  scaleFrames?: [number, number];
  scaleValues?: [number, number];
  translateXFrames?: [number, number];
  translateXValues?: [number, number];
  translateYFrames?: [number, number];
  translateYValues?: [number, number];
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  children,
  style,
  opacityFrames,
  opacityValues = [0, 1],
  scaleFrames,
  scaleValues = [0.95, 1],
  translateXFrames,
  translateXValues = [40, 0],
  translateYFrames,
  translateYValues = [0, -20],
}) => {
  const frame = useCurrentFrame();

  const opacity = opacityFrames
    ? interpolate(frame, opacityFrames, opacityValues, {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing,
      })
    : opacityValues[1];

  const scale = scaleFrames
    ? interpolate(frame, scaleFrames, scaleValues, {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing,
      })
    : 1;

  const translateX = translateXFrames
    ? interpolate(frame, translateXFrames, translateXValues, {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing,
      })
    : 0;

  const translateY = translateYFrames
    ? interpolate(frame, translateYFrames, translateYValues, {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing,
      })
    : 0;

  return (
    <span
      style={{
        display: 'inline-block',
        opacity,
        transform: `scale(${scale}) translateX(${translateX}px) translateY(${translateY}px)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
};
