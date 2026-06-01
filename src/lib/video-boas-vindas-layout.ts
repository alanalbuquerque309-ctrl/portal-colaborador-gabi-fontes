/** Moldura vertical 9:16 — `style` inline garante altura mesmo se Tailwind purgar `aspect-[9/16]`. */
export const VIDEO_FRAME_STYLE = { aspectRatio: '9 / 16' } as const;

export const VIDEO_FRAME_OUTER_CLASS =
  'mx-auto w-full max-w-[420px] overflow-hidden rounded-xl bg-black shadow-md';

export const VIDEO_FRAME_INNER_CLASS =
  'relative w-full h-full min-h-[200px] flex items-center justify-center';

export const VIDEO_ELEMENT_CLASS = 'w-full h-full object-contain';
