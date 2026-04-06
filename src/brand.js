// ── Color conversion helpers ──────────────────────────────────────────────────

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// ── Palette generation ────────────────────────────────────────────────────────

export function generatePalette(primaryHex) {
  const [h, s] = hexToHsl(primaryHex)
  const sat = Math.max(25, Math.min(s, 85))
  return {
    50:  hslToHex(h, Math.max(10, sat - 55), 97),
    100: hslToHex(h, Math.max(15, sat - 45), 93),
    200: hslToHex(h, Math.max(20, sat - 35), 84),
    300: hslToHex(h, Math.max(30, sat - 20), 73),
    400: hslToHex(h, sat, 61),
    500: hslToHex(h, sat, 51),
    600: hslToHex(h, sat, 42),
    700: hslToHex(h, sat, 33),
    800: hslToHex(h, sat, 25),
    900: hslToHex(h, sat, 18),
  }
}

// ── DOM injection ─────────────────────────────────────────────────────────────

export function applyBrandStyles(primaryHex) {
  const p = generatePalette(primaryHex || '#0369a1')

  // CSS variables on :root (used by inline styles and arbitrary Tailwind values)
  // Plus named utility classes for sidebar nav hover states (can't do hover via inline style)
  let el = document.getElementById('qx-brand')
  if (!el) { el = document.createElement('style'); el.id = 'qx-brand'; document.head.appendChild(el) }
  el.textContent = `
    :root {
      --brand-50:  ${p[50]};
      --brand-100: ${p[100]};
      --brand-200: ${p[200]};
      --brand-300: ${p[300]};
      --brand-400: ${p[400]};
      --brand-500: ${p[500]};
      --brand-600: ${p[600]};
      --brand-700: ${p[700]};
      --brand-800: ${p[800]};
      --brand-900: ${p[900]};
    }
    .brand-nav-inactive        { color: ${p[100]}; }
    .brand-nav-inactive:hover  { background-color: ${p[600]}; color: #fff; }
    .brand-nav-active          { background-color: #fff; color: ${p[700]}; }
    .brand-badge               { color: ${p[700]}; }
    .brand-footer              { color: ${p[400]}; }
    .brand-bg-light            { background-color: ${p[50]}; }
  `
}

// ── Extract dominant color from an image (canvas sampling) ────────────────────

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

export function extractDominantColor(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const size = 80
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, size, size)
      const { data } = ctx.getImageData(0, 0, size, size)

      const buckets = {}
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
        if (a < 100) continue
        const [h, s, l] = rgbToHsl(r, g, b)
        if (s < 25 || l < 10 || l > 88) continue  // skip grays, near-black, near-white
        const bucket = Math.round(h / 12) * 12      // 12° buckets
        buckets[bucket] = (buckets[bucket] || 0) + 1
      }

      const entries = Object.entries(buckets)
      if (!entries.length) { resolve(null); return }
      const dominantHue = parseInt(entries.sort((a, b) => b[1] - a[1])[0][0])
      resolve(hslToHex(dominantHue, 65, 33))  // saturated, medium-dark
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

export const DEFAULT_BRAND_COLOR = '#0369a1'  // sky-700 equivalent
