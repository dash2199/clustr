export default function ClustrLogo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 5 A45 45 0 1 1 15 75"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M30 18 Q55 45 78 30"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M20 55 Q50 35 75 65"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M22 72 Q50 60 50 90"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="30" cy="18" r="6" fill="currentColor" />
      <circle cx="78" cy="30" r="6" fill="currentColor" />
      <circle cx="75" cy="65" r="6" fill="currentColor" />
      <circle cx="22" cy="72" r="6" fill="currentColor" />
      <circle cx="50" cy="90" r="5.5" fill="currentColor" />
    </svg>
  );
}
