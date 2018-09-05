import { random_int } from './random.js'

export default function(grayscale_image, num_points, w, h) {
  let points = []

  while (points.length < num_points) {
    let i = random_int(0, grayscale_image.length),
        p = random_int(0, 255),
        val = grayscale_image[i]

    if (p > val) {
      let x = i % w,
          y = Math.floor(i / w)

      points.push([x,y])
    }
  }

  return points
}
