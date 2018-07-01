export function rgba(image_data, x, y) {
  let idxs = indeces(image_data, x, y)
  return idxs.map(i => image_data.data[i])
}

export function luma(image_data, x, y) {
  let [r, g, b, a] = rgba(image_data, x, y)
  let luminance = (r+r+b+g+g+g) / (6*255)
  return luminance
}

export function gray(image_data, x, y) {
  let [r, g, b, a] = rgba(image_data, x, y)
  return (r + g + b) / (3*255)
}

export function indeces(image_data, x, y) {
  const red = y * (image_data.width * 4) + x * 4
  return [red, red+1, red+2, red+3]
}
