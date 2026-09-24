// "Bobo" the bunny - a friendly listener who reacts to the child's answers.

export function mascotSVG() {
  return `
<svg class="bunny" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g class="ear-l">
    <ellipse cx="72" cy="42" rx="20" ry="46" fill="#fff" stroke="#e3d9f5" stroke-width="3"/>
    <ellipse cx="72" cy="46" rx="10" ry="34" fill="#ffc2d6"/>
  </g>
  <g class="ear-r">
    <ellipse cx="128" cy="42" rx="20" ry="46" fill="#fff" stroke="#e3d9f5" stroke-width="3"/>
    <ellipse cx="128" cy="46" rx="10" ry="34" fill="#ffc2d6"/>
  </g>
  <g class="body">
    <ellipse cx="100" cy="206" rx="56" ry="48" fill="#fff" stroke="#e3d9f5" stroke-width="3"/>
    <ellipse cx="100" cy="214" rx="32" ry="30" fill="#fff4f8"/>
    <ellipse cx="66" cy="250" rx="22" ry="11" fill="#fff" stroke="#e3d9f5" stroke-width="3"/>
    <ellipse cx="134" cy="250" rx="22" ry="11" fill="#fff" stroke="#e3d9f5" stroke-width="3"/>
    <circle cx="100" cy="116" r="62" fill="#fff" stroke="#e3d9f5" stroke-width="3"/>
    <circle cx="62" cy="134" r="11" fill="#ffc2d6" opacity="0.8"/>
    <circle cx="138" cy="134" r="11" fill="#ffc2d6" opacity="0.8"/>
    <ellipse cx="100" cy="128" rx="7" ry="5" fill="#ff8fab"/>

    <g class="face-normal">
      <circle cx="78" cy="108" r="9" fill="#2b3a67"/><circle cx="81" cy="104" r="3" fill="#fff"/>
      <circle cx="122" cy="108" r="9" fill="#2b3a67"/><circle cx="125" cy="104" r="3" fill="#fff"/>
      <path d="M88 138 Q100 150 112 138" stroke="#2b3a67" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>
    <g class="face-happy">
      <path d="M68 110 Q78 96 88 110" stroke="#2b3a67" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M112 110 Q122 96 132 110" stroke="#2b3a67" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M84 136 Q100 164 116 136 Z" fill="#2b3a67"/>
      <path d="M92 146 Q100 156 108 146 Z" fill="#ff8fab"/>
    </g>
    <g class="face-sad">
      <circle cx="78" cy="110" r="9" fill="#2b3a67"/><circle cx="81" cy="106" r="3" fill="#fff"/>
      <circle cx="122" cy="110" r="9" fill="#2b3a67"/><circle cx="125" cy="106" r="3" fill="#fff"/>
      <path d="M66 94 L88 98" stroke="#2b3a67" stroke-width="4" stroke-linecap="round"/>
      <path d="M134 94 L112 98" stroke="#2b3a67" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="100" cy="144" rx="8" ry="7" fill="#2b3a67"/>
    </g>
    <g class="hand-ear">
      <ellipse cx="160" cy="100" rx="16" ry="20" fill="#fff" stroke="#e3d9f5" stroke-width="3" transform="rotate(20 160 100)"/>
    </g>
  </g>
</svg>`;
}

// Put the bunny into a mood: 'idle' | 'listen' | 'happy' | 'sad'.
export function setMood(root, mood) {
  const svg = root.querySelector('.bunny');
  if (!svg) return;
  svg.classList.remove('listen', 'happy', 'sad');
  // Restart the animation even if the same mood repeats.
  void svg.getBoundingClientRect();
  if (mood !== 'idle') svg.classList.add(mood);
}
