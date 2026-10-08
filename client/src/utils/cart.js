import { round2 } from './format';

export function buildCartItem({ frame, size, quantity, photo, orientation }) {
  return {
    frameId: frame.id,
    sizeId: size.id,
    quantity,
    orientation,
    photoPath: photo.path,
    snapshot: {
      code: frame.code,
      name: frame.name,
      image: frame.image,
      colorHex: frame.colorHex,
      matHex: frame.matHex,
      borderStyle: frame.borderStyle,
      color: frame.color,
      material: frame.material,
      sizeLabel: size.label,
      widthIn: size.widthIn,
      heightIn: size.heightIn,
      unitPrice: round2(frame.basePrice + size.extraPrice),
    },
  };
}

/** Detects whether an image is landscape or portrait so the preview starts the right way round. */
export function detectOrientation(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait');
    img.onerror = () => resolve('portrait');
    img.src = url;
  });
}

export const toServerItems = (items) =>
  items.map((i) => ({ frameId: i.frameId, sizeId: i.sizeId, quantity: i.quantity, orientation: i.orientation, photoPath: i.photoPath }));
