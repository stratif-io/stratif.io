import React from 'react';
import { AbsoluteFill } from 'remotion';
import { EquationScene1 } from './scenes/EquationScene1';
import { EquationScene2 } from './scenes/EquationScene2';
import { EquationScene3 } from './scenes/EquationScene3';
import { EquationScene4 } from './scenes/EquationScene4';
import './fonts.css';

export const ProductVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#000000' }}>
      <EquationScene1 />
      <EquationScene2 />
      <EquationScene3 />
      <EquationScene4 />
    </AbsoluteFill>
  );
};
