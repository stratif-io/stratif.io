import React from 'react'
import { Composition } from 'remotion'
import { ProductVideo } from './ProductVideo'

export const Root: React.FC = () => {
  return (
    <Composition
      id="ProductVideo"
      component={ProductVideo}
      durationInFrames={150}
      fps={30}
      width={1280}
      height={720}
    />
  )
}
