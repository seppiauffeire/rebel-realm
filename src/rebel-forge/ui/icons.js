const svg = (inner, extra = '') => `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false" ${extra}>${inner}</svg>`;

export const TYPE_ICON = {
  attack: svg('<path d="M4 20 L14 10 M14 10 L20 4 L20 9 M14 10 L9 5 L4 4 L5 9 M9 15 L6 18"/>'),
  defend: svg('<path d="M12 3 L20 6 V12 C20 17 16 20 12 21 C8 20 4 17 4 12 V6 Z"/>'),
  setup: svg('<path d="M7 3 H17 M7 21 H17 M8 3 C8 9 16 9 16 21 M16 3 C16 9 8 9 8 21"/>'),
  instant: svg('<path d="M13 2 L5 13 H11 L10 22 L19 10 H13 Z"/>'),
  permanent: svg('<circle cx="12" cy="5" r="2"/><path d="M12 7 V21 M7 11 H17 M5 15 C5 19 9 21 12 21 C15 21 19 19 19 15"/>'),
};

export const FAMILY_ICON = {
  damage: svg('<path d="M4 20 L15 9 M15 9 L20 4 M12 4 L20 12"/>'),
  defense: svg('<path d="M12 3 L20 6 V12 C20 17 16 20 12 21 C8 20 4 17 4 12 V6 Z"/>'),
  cards: svg('<rect x="6" y="3" width="12" height="16"/><path d="M9 21 H20 V7"/>'),
  setup: svg('<path d="M12 3 V8 M12 16 V21 M3 12 H8 M16 12 H21"/><circle cx="12" cy="12" r="3"/>'),
  disrupt: svg('<path d="M4 4 L20 20 M20 4 L4 20"/><circle cx="12" cy="12" r="8"/>'),
};

export const UI_ICON = {
  undo: svg('<path d="M9 7 H15 A5 5 0 0 1 15 17 H8 M9 7 L12 4 M9 7 L12 10"/>'),
  sound: svg('<path d="M4 9 H8 L13 5 V19 L8 15 H4 Z M17 9 C18.5 10.5 18.5 13.5 17 15"/>'),
  mute: svg('<path d="M4 9 H8 L13 5 V19 L8 15 H4 Z M17 9 L22 15 M22 9 L17 15"/>'),
  skip: svg('<path d="M5 5 L13 12 L5 19 Z M15 5 V19"/>'),
  plus: svg('<path d="M12 5 V19 M5 12 H19"/>'),
  minus: svg('<path d="M5 12 H19"/>'),
  x: svg('<path d="M6 6 L18 18 M18 6 L6 18"/>'),
  link: svg('<path d="M10 14 L14 10 M8 12 L6 14 A3 3 0 0 0 10 18 L12 16 M16 12 L18 10 A3 3 0 0 0 14 6 L12 8"/>'),
  download: svg('<path d="M12 4 V15 M7 10 L12 15 L17 10 M5 20 H19"/>'),
  anchor: svg('<circle cx="12" cy="5" r="2"/><path d="M12 7 V20 M7 11 H17 M5 15 C5 19 9 20 12 20 C15 20 19 19 19 15"/>'),
  chain: svg('<path d="M12 3 V21 M9 8 L12 11 L15 8 M9 16 L12 13 L15 16"/>'),
};
