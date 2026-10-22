/// <reference types="vite/client" />

declare module 'page-mascot' {
  import React from 'react';

  export interface MascotProps {
    [key: string]: any;
  }

  export const Mascot: React.FC<MascotProps>;
}
