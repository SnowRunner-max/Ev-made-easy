const paths = {
  bolt: <path d="m13.5 2-9 12H11l-.5 8 9-12H13z" />,
  calculator: (
    <>
      <rect x="5" y="2.5" width="14" height="19" rx="3" />
      <path d="M8.5 7h7M9 11h.01M15 11h.01M9 15h.01M15 15v3M9 18h.01" />
    </>
  ),
  setup: (
    <>
      <path d="M3 3v18h18M7 16v-5m5 5V6m5 10v-7" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v7m0-11v1" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
};
export default function AppIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
