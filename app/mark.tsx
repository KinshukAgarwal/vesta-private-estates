/**
 * VESTA monogram — a heavy V resting on the hearth bar.
 *
 * Single definition: the pinned chrome and the footer both render this, so the
 * mark can never drift between the two the way the old inline copies could.
 * Filled (not stroked) so `fill: currentColor` in the chrome and the muted
 * footer fill both work without a second rule.
 */
export default function Mark() {
  return (
    <svg viewBox="0 0 40 34" aria-hidden>
      <path d="M0 0 H8 L20 20 L32 0 H40 L23 28 H17 Z" />
      <rect x="0" y="31" width="40" height="3" />
    </svg>
  );
}
