import { luma } from './image_data.js'
import { random_int, random_float } from './random.js'


let w,
    h,
    grayscale_image,
    density_map


onmessage = (e) => {
  console.log(`[image processor] received message ${e.data.cmd}`)
  switch (e.data.cmd) {
    case 'process':
      process(e.data.image_data, e.data.num_points)
      break
    default:
      console.log(`[image processor] unknown command: ${e.data.cmd}, data: ${e.data}`)
  }
}

function process(image_data, num_points) {
  w = image_data.width
  h = image_data.height,
  grayscale_image = convert_to_grayscale(image_data)
  density_map = build_density_map(grayscale_image, w, h)

  let points = dither(grayscale_image, num_points, w, h)

  console.log("[image processor] done")
  postMessage({
    cmd: 'dither_points',
    points: points
  })
}

function density(y, x1, x2) {
  return density_map[y][x2 + 1] - density_map[y][x1]
}

function convert_to_grayscale(image_data) {
  let w = image_data.width,
      h = image_data.height

  let g_image = new Array(w*h)

  let i = 0
  for(let x=0; x < w; x++) {
    for(let y=0; y < h; y++) {
      g_image[i] = luma(image_data, x, y)
      i++
    }
  }

  return g_image
}

function build_density_map(grayscale_image, w, h) {
  let d_map = new Array(h)

  let i=0;
  for(let y=0; y<h; y++) {
    let row = [0],
        sum = 0

    for(let x=0; x<w; x++) {
      sum += grayscale_image[i]
      row.push(sum)
      i++
    }
    d_map[y] = row
  }

  return d_map;
}

function dither(grayscale_image, num_points, w, h) {
  let points = []

  while (points.length < num_points) {
    let i = random_int(0, grayscale_image.length),
        p = random_float(0, 1),
        val = grayscale_image[i]

    if (p > val) {
      let x = i % w,
          y = Math.floor(i / w)

      points.push([x,y])
    }
  }

  return points
}
