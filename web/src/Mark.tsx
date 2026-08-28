export function Sigil({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 3.5 58 18.5v27L32 60.5 6 45.5v-27L32 3.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        className="text-signal"
      />
      <path
        d="M32 16 46 24v16L32 48 18 40V24l14-8Z"
        stroke="#e8fff6"
        strokeWidth="1"
        opacity="0.85"
      />
      <path d="M32 16v32M18 24l14 8 14-8" stroke="#5eeab4" strokeWidth="1" />
      <circle cx="32" cy="32" r="3.2" fill="#5eeab4" />
    </svg>
  );
}

export function OrbitField({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 640 720"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="320" cy="360" r="210" stroke="rgba(232,255,246,0.12)" />
      <circle cx="320" cy="360" r="148" stroke="rgba(94,234,180,0.28)" />
      <circle cx="320" cy="360" r="86" stroke="rgba(232,255,246,0.2)" />
      <path
        d="M320 80v80M320 560v80M80 360h80M480 360h80"
        stroke="rgba(94,234,180,0.35)"
        strokeWidth="1"
      />
      <circle cx="320" cy="150" r="5" fill="#5eeab4" />
      <circle cx="498" cy="248" r="3.5" fill="#e8fff6" />
      <circle cx="168" cy="470" r="4" fill="#5eeab4" />
      <path
        d="M220 250 320 360l140-40"
        stroke="rgba(94,234,180,0.55)"
        strokeWidth="1.2"
      />
    </svg>
  );
}
