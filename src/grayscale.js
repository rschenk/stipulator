import { luma } from './image_data.js'

export default function(image_data) {
  let w = image_data.width,
      h = image_data.height

  let g_image = new Uint8ClampedArray(w*h)

  for(let x=0; x < w; x++) {
    for(let y=0; y < h; y++) {
      let i = y * w + x
      g_image[i] = luma(image_data, x, y)
    }
  }

  return g_image
}
