const strftime = require('strftime')
import * as dat from 'dat.gui'
import  { render_tsp } from './tsp.js'

import ImageProcessor from './image_processor.worker.js'

console.log(process.env.NODE_ENV)
if (process.env.NODE_ENV !== 'production') {
  console.log('Looks like we are in development mode!');
}

const gui = new dat.GUI()
let StipulatorParams = function() {
  this.num_points = 1450
  this.point_radius = 1
  this.open_file = function() {
    document.getElementById('file').click()
  }
  this.save_tsp = save_as_tsp
}
let params = new StipulatorParams()

let render_times = []

let url = "/dolphin.png",
    dpr = window.devicePixelRatio || 1,
    canvas,
    context,
    point_group,
    points

setup_canvas()

let image_processor = new ImageProcessor()
image_processor.onmessage = handle_image_processor_message

let image = new Image();
image.onload = raster_loaded
image.src = url
image.title = url

function raster_loaded() {
  console.log("[main] raster loaded, sending to processor")

  canvas.width = image.width
  canvas.height = image.height

  context.fillStyle = "#FFFFFF"
  context.rect(0, 0, canvas.width, canvas.height)
  context.fill()

  context.drawImage(image, 0, 0);
  let image_data = context.getImageData(0, 0, image.width, image.height)
  image_processor.postMessage({
    cmd: 'process',
    image_data: image_data,
    num_points: params.num_points
  })

  // Set up retina
  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";
  canvas.width = canvas.width * dpr;
  canvas.height = canvas.height * dpr;
  context.scale(dpr, dpr);
}

function reprocess() {
  image_processor.postMessage({
    cmd: 'reprocess',
    num_points: params.num_points
  })
}

function handle_image_processor_message(e) {
  if (e.data.cmd == "points") {
    let tstart = new Date(), tend
    console.log("[main] Received points from processor")

    points = e.data.points
    draw_points()

    tend = new Date()

    render_times.push( tend - tstart )
  } else if (e.data.cmd == "done") {
    console.log("[main] Done")
    let sum = render_times.reduce(function(a, b) { return a + b; });
    let avg = sum / render_times.length;
    console.log(`[main] Average render time: ${avg}`)
  } else {
    console.log("[main] received unknown message from processor")
    console.log(e)
  }
}

function draw_points() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = "#000000"
    points.map(draw_point)
}

function draw_point(point) {
  let radius = params.point_radius
  let [x, y] = point
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2, true)
  context.closePath()
  context.fill()
}

function setup_canvas() {
  let canvas_id = 'stipulator-canvas'

  canvas = canvas_element(canvas_id)
  context = canvas.getContext("2d")
  document.body.appendChild(canvas)

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
  let w = image.width,
      h = image.height,
      time = strftime('%F-%H-%M'),
      image_basename = image.title.split(/[\\/]/).pop().split(".").shift(),
      name = `${image_basename}_stpl_${time}`,
      filename = `${name}.tsp`,
      body = render_tsp(points, name, w, h)


  save_file(filename, body)
}

function save_file(filename, data) {
  let url = "data:text/plain;utf8," + encodeURIComponent(data)
  let link = document.createElement("a")
  link.download = filename
  link.href = url
  link.click()
}





function handleFileSelect(evt) {
  var files = evt.target.files; // FileList object
  console.log(files)
  if (files) {
    read_image(files[0])
  }
}

function read_image(file) {
  // Make sure `file.name` matches our extensions criteria
  if ( /\.(jpe?g|png|gif)$/i.test(file.name) ) {
    var reader = new FileReader();

    reader.addEventListener("load", function () {

      image_processor.terminate()
      image_processor = new ImageProcessor()
      image_processor.onmessage = handle_image_processor_message

      image = new Image();
      image.onload = raster_loaded
      image.src = this.result
      image.title = file.name

    }, false);

    reader.readAsDataURL(file);
  }

}
document.getElementById('file').addEventListener('change', handleFileSelect, false);

gui.add(params, "open_file")
gui.add(params, "num_points", 100, 10000).onChange(reprocess)
gui.add(params, "point_radius", 0.5, 5).onChange(draw_points)
gui.add(params, "save_tsp")
