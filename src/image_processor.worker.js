import dither from './random_sample_dither.js'
import convert_to_grayscale from './grayscale.js'
import WeightedVoronoi from './weighted_voronoi.js'

let w,
    h,
    grayscale_image,
    points,
    weighted_voronoi,
    timeout,
    fps = 60,
    avg_dist_cutoff = 0.01,
    max_iterations = 40,
    iteration_count,
    debug = false

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
  points = dither(grayscale_image, num_points, w, h)
  weighted_voronoi = new WeightedVoronoi(grayscale_image, {w, h})
  iteration_count = 0

  postMessage({
    cmd: 'points',
    points: points
  })

  timeout = setTimeout(relax_points_and_send, 1000 / fps)
}

function relax_points_and_send() {
  let time_start = Date.now()
  let { new_points, average_distance } = weighted_voronoi.relax(points)
  points = new_points
  iteration_count++

  postMessage({
    cmd: 'points',
    points: points
  })

  let fully_relaxed = iteration_count >= max_iterations || average_distance < avg_dist_cutoff
  if(!fully_relaxed) {
    let time_end = Date.now()
    let elapsed_time = time_end - time_start
    let interval = Math.max(1, 1000/fps - elapsed_time)
    timeout = setTimeout(relax_points_and_send, interval)
  }
}
