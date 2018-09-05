const paper = require('paper/dist/paper-core')
const strftime = require('strftime')
import  { render_tsp } from './tsp.js'

import ImageProcessor from './image_processor.worker.js'

let w = 800,
    h = 800,
    url = "/donut.png",
    num_points = 2000,
    point_group,
    points

setup_paper()

let image_processor = new ImageProcessor()
image_processor.onmessage = handle_image_processor_message

let raster = new paper.Raster({source: url, position: paper.view.center})
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

    points = e.data.points
    raster.visible = false
    if (point_group) {
      point_group.remove()
    }
    point_group = new paper.Group(points.map(draw_point))
  } else {
    console.log("[main] received unknown message from processor")
    console.log(e)
  }
}

function draw_point(point) {
  return new paper.Path.Circle({
    center: point,
    radius: 2,
    fillColor: "black"
  })
}

function setup_paper() {
  let canvas_id = 'stipulator-canvas'
  document.body.appendChild(canvas_element(canvas_id))
  paper.install(window)
  paper.setup(canvas_id)
  paper.view.viewSize.width = w;
  paper.view.viewSize.height = h;

  document.addEventListener("keypress", (e)=>{ cmd_s(e, save_as_tsp) });
}

function canvas_element(id) {
  let element = document.createElement('canvas')
  element.id = id
  return element
}

function cmd_s(event, command) {
    if (event.which == 115 && (event.ctrlKey||event.metaKey) || (event.which == 19)) {
        event.preventDefault();
        command()
        return false;
    }
    return true;
}

function save_as_tsp() {
  let time = strftime('%F-%H-%M')
  let name = `stipulator_${time}`
  let filename = `${name}.tsp`
  let body = render_tsp(points, name, w, h)


  save_file(filename, body)
}

function save_file(filename, data) {
  let url = "data:text/plain;utf8," + encodeURIComponent(data)
  let link = document.createElement("a")
  link.download = filename
  link.href = url
  link.click()
}
