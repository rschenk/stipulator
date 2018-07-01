const paper = require('paper/dist/paper-core')
import ImageProcessor from './image_processor.worker.js'

let w = 300,
    h = 300,
    num_points = 1000,
    grayscale_image,
    density_map

setup_paper()

let image_processor = new ImageProcessor()
image_processor.onmessage = handle_image_processor_message

let raster = new paper.Raster({source: '/sphere.png', position: paper.view.center})
raster.onLoad = raster_loaded



function raster_loaded() {
  console.log("[main] raster loaded, sending to processor")
  let image_data = raster.getImageData(raster.bounds)
  image_processor.postMessage({
    cmd: 'process',
    image_data: image_data,
    num_points: num_points
  })
}

function handle_image_processor_message(e) {
  if (e.data.cmd = "points") {
    console.log("[main] Received points from processor")
    e.data.points.forEach(draw_point)
  }
}

function draw_point(point) {
  new paper.Path.Circle({
    center: point,
    radius: 2,
    fillColor: "red"
  })
}

function setup_paper() {
  let canvas_id = 'stipulator-canvas'
  document.body.appendChild(canvas_element(canvas_id))
  paper.install(window)
  paper.setup(canvas_id)
  paper.view.viewSize.width = w;
  paper.view.viewSize.height = h;
}

function canvas_element(id) {
  let element = document.createElement('canvas')
  element.id = id
  return element
}
