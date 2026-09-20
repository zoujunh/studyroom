import type { SVGProps } from 'react';

export type IconName =
  | 'home'
  | 'cards'
  | 'book'
  | 'chart'
  | 'gear'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'back'
  | 'star'
  | 'flame'
  | 'clock'
  | 'shuffle'
  | 'undo'
  | 'check'
  | 'close'
  | 'search'
  | 'layers'
  | 'sparkle'
  | 'play'
  | 'pause'
  | 'stepForward'
  | 'stepBack'
  | 'reset'
  | 'arrowRight'
  | 'share'
  | 'dice';

const PATHS: Record<IconName, string> = {
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z',
  cards: 'M7 4.5h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Zm0 0v15M9.5 9h7M9.5 12.5h4',
  book: 'M5 5.5A1.5 1.5 0 0 1 6.5 4H19v13.5H6.5A1.5 1.5 0 0 0 5 19V5.5ZM5 19a1.5 1.5 0 0 1 1.5-1.5H19V20H6.5A1.5 1.5 0 0 1 5 18.5Z',
  chart: 'M5 19V11M10 19V5M15 19v-5M20 19v-9',
  gear:
    'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm7.4-2.6c.05-.4.05-.8 0-1.2l1.7-1.3-1.6-2.8-2 .8a7.6 7.6 0 0 0-1-.6l-.3-2.1h-3.2l-.3 2.1c-.36.15-.7.35-1 .6l-2-.8-1.6 2.8 1.7 1.3a7 7 0 0 0 0 1.2l-1.7 1.3 1.6 2.8 2-.8c.3.25.64.45 1 .6l.3 2.1h3.2l.3-2.1c.36-.15.7-.35 1-.6l2 .8 1.6-2.8-1.7-1.3Z',
  chevronRight: 'M9 5l7 7-7 7',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronDown: 'M5 9l7 7 7-7',
  back: 'M11 5l-7 7 7 7M4 12h16',
  star: 'M12 4.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 10.2l5.4-.8L12 4.5Z',
  flame:
    'M12 21c3.6 0 6-2.4 6-5.6 0-4.2-4.2-5.4-3.6-10.4-2.2.6-4.2 2.6-4.2 5 0 1-.6 1.6-1.4 1.6-.9 0-1.4-.8-1.4-1.8C6.3 11 6 12.6 6 14.4 6 18 8.4 21 12 21Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3.5 2',
  shuffle: 'M4 7h3.5l9 10H20M4 17h3.5l2.2-2.4M13 9l1.5-2H20M17 4l3 3-3 3M17 14l3 3-3 3',
  undo: 'M4 9h10a5 5 0 1 1 0 10H8M4 9l4-4M4 9l4 4',
  check: 'M5 13l4.5 4.5L19 7',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5.5-1.5L21 21',
  layers: 'M12 4l8 4-8 4-8-4 8-4Zm8 8-8 4-8-4m16 4-8 4-8-4',
  sparkle: 'M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Zm6 9l.7 1.8L20.5 16l-1.8.7L18 18.5l-.7-1.8L15.5 16l1.8-.7L18 13Z',
  play: 'M7.5 4.8v14.4L19 12 7.5 4.8Z',
  pause: 'M9 5v14M15 5v14',
  stepForward: 'M8 5.5v13L17 12 8 5.5ZM19 5v14',
  stepBack: 'M16 5.5v13L7 12l9-6.5ZM5 5v14',
  reset: 'M4 12a8 8 0 1 0 2.6-5.9M4 4.5V9h4.5',
  arrowRight: 'M4 12h15M13 6l6 6-6 6',
  share: 'M12 15V4M8 7.5 12 4l4 3.5M5 13v5.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V13',
  dice: 'M5 5.5h14v13H5v-13Zm3 3h.01M16 15.5h.01M12 12h.01M9 15.5h.01M15 8.5h.01',
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 20, filled, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
