// src/components/icons/logo.tsx
import type { SVGProps } from 'react';

// Ce logo n'est plus utilisé directement car remplacé par SakaiLogo dans chat-assistant.tsx
// Mais on le garde au cas où.
export function LifeInsightsLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12h2.58a2 2 0 0 1 1.8.95l1.24 2.1A2 2 0 0 0 10.42 16H12" />
      <path d="M21 12h-2.58a2 2 0 0 0-1.8-.95l-1.24-2.1A2 2 0 0 1 13.58 8H12" />
      <path d="M12 2v2" />
      <path d="M12 18v4" />
      <path d="M20.49 4.51l-1.41 1.41" />
      <path d="M3.51 19.49l1.41-1.41" />
      <path d="M20.49 19.49l-1.41-1.41" />
      <path d="M3.51 4.51l1.41 1.41" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

// Nouveau logo simple pour Sakai, peut être affiné.
export function SakaiLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      {...props}
    >
      {/* Simple cercle avec un point central stylisé pour 'S' ou 'oeil' */}
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="5" fill="none" />
      <circle cx="50" cy="50" r="15" fill="currentColor" />
       <path d="M50 30 A20 20 0 0 1 50 70 A20 20 0 0 1 50 30 M50 40 A10 10 0 0 0 50 60 A10 10 0 0 0 50 40" fill="var(--background)" />
    </svg>
  );
}
