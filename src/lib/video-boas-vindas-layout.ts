import { NextResponse } from 'next/server';

/** Vídeo institucional em formato vertical (9:16). */
export const VIDEO_ASPECT_CLASS = 'aspect-[9/16]';
export const VIDEO_FRAME_CLASS = `relative mx-auto w-full max-w-[min(100%,420px)] ${VIDEO_ASPECT_CLASS} overflow-hidden rounded-xl bg-black`;
