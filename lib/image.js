// Resize to max 1024px JPEG (fixes EXIF rotation, keeps uploads small and fast).
export async function prepareImage(file, max = 1024) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  return { blob, url: URL.createObjectURL(blob), width: w, height: h }
}

// Crop the photo just below the chin so the color band can sit directly under the face.
// box is Gemini's face box, normalized 0-1000 (ymin, xmin, ymax, xmax).
export function cropToChin(url, box) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const W = img.naturalWidth
      const H = img.naturalHeight
      let bottom = H * 0.85
      if (box && box.ymax > box.ymin) {
        const faceH = ((box.ymax - box.ymin) / 1000) * H
        bottom = (box.ymax / 1000) * H + faceH * 0.1
      }
      bottom = Math.round(Math.min(H, Math.max(bottom, H * 0.5)))
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = bottom
      canvas.getContext('2d').drawImage(img, 0, 0, W, bottom, 0, 0, W, bottom)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = () => resolve(url)
    img.src = url
  })
}

// Readable text color on top of any swatch.
export function textOn(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#17171B' : '#FFFFFF'
}
