import { shade, SAMPLE_PHOTO } from '../utils/format';

// Border thickness as a % of the frame's width, so it scales at any display size.
const BORDER = { thin: 3, classic: 5.5, wide: 8, ornate: 6.5 };
const MAT = { thin: 7, classic: 7, wide: 9, ornate: 8 };

/**
 * Live mock-up of a photo inside a frame. Pure CSS, so it updates instantly
 * as the customer changes design, colour, size, orientation or photo.
 */
export default function FramePreview({
  colorHex = '#1F1D1B',
  matHex = '#FFFFFF',
  borderStyle = 'classic',
  photoUrl,
  widthIn = 8,
  heightIn = 10,
  orientation = 'portrait',
  placeholder = true,
  className = '',
  maxHeight = 520,
  alt = 'Frame preview',
}) {
  const short = Math.min(widthIn, heightIn);
  const long = Math.max(widthIn, heightIn);
  const ratio = orientation === 'landscape' ? long / short : short / long;
  const b = BORDER[borderStyle] ?? 5.5;
  const m = MAT[borderStyle] ?? 7;
  const light = shade(colorHex, 40);
  const dark = shade(colorHex, -45);
  const src = photoUrl || (placeholder ? SAMPLE_PHOTO : null);

  return (
    <div className={`mx-auto w-full ${className}`} style={{ maxWidth: `${maxHeight * ratio}px` }}>
      <div
        className="relative w-full shadow-soft"
        style={{
          aspectRatio: String(ratio),
          padding: `${b}%`,
          background: `linear-gradient(135deg, ${light} 0%, ${colorHex} 45%, ${dark} 100%)`,
          boxShadow: '0 24px 40px -18px rgba(31,29,27,.45), inset 0 0 0 1px rgba(255,255,255,.18), inset 0 0 12px rgba(0,0,0,.25)',
        }}
      >
        {borderStyle === 'ornate' && (
          <>
            <div className="pointer-events-none absolute inset-[1.6%] border" style={{ borderColor: light, opacity: 0.9 }} />
            <div className="pointer-events-none absolute" style={{ inset: `${b - 1.4}%`, border: `1px solid ${dark}` }} />
            {['left-[1%] top-[1%]', 'right-[1%] top-[1%]', 'left-[1%] bottom-[1%]', 'right-[1%] bottom-[1%]'].map((pos) => (
              <span key={pos} className={`pointer-events-none absolute h-[3.2%] w-[3.2%] min-h-[6px] min-w-[6px] rounded-full ${pos}`} style={{ background: light, boxShadow: `0 0 0 1px ${dark}` }} />
            ))}
          </>
        )}
        <div className="relative h-full w-full" style={{ background: matHex, padding: `${m}%`, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12), inset 0 2px 6px rgba(0,0,0,.12)' }}>
          <div className="relative h-full w-full overflow-hidden bg-cream-200" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.2)' }}>
            {src ? (
              <img src={src} alt={alt} className="h-full w-full object-cover" draggable="false" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-charcoal-400">Your photo here</div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
