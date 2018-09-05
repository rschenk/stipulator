import Voronoi from 'voronoi'
const getBounds = require('getboundingbox')
const line_intersection = require('segseg')
const array_bounds = require('array-bounds')

let debug = true

class WeightedVoronoi {
  constructor(grayscale_image, dimensions){
    this.grayscale_image = grayscale_image
    this.dimensions = dimensions
    this.voronoi = new Voronoi()
    this.bbox = {
      xl: 0,
      xr: this.dimensions.w,
      yt: 0,
      yb: this.dimensions.h
    }

    let density_lookups = this._precompute_density_lookups(grayscale_image, this.dimensions.w, this.dimensions.h)
    this.density_lookup_d = density_lookups.d
    this.density_lookup_x = density_lookups.x
    this.density_lookup_y = density_lookups.y
  }

  relax(points) {
    let sites = points.map(p => ( {x: p[0], y: p[1]} )),
        diagram = this.voronoi.compute(sites, this.bbox),
        { new_sites, average_distance } = this._relax(diagram)

    let new_points = new_sites.map(s => [s.x, s.y])
    this.voronoi.recycle(diagram)

    return { new_points, average_distance }
  }

  _precompute_density_lookups(grayscale_image, w, h) {
    let density_d = new Array(h),
        density_x = new Array(h),
        density_y = new Array(h)

    for(let y=0; y<h; y++) {
      let row_d = new Uint32Array(w+1),
          row_x = new Uint32Array(w+1),
          row_y = new Uint32Array(w+1),
          sum_d = 0,
          sum_x = 0,
          sum_y = 0

      row_d[0] = 0
      row_x[0] = 0
      row_y[0] = 0

      for(let x=0; x<w; x++) {
        let i = y * w + x,
            density = 255 - grayscale_image[i]

        sum_d += density
        sum_x += x * density
        sum_y += y * density

        row_d[x+1] = sum_d
        row_x[x+1] = sum_x
        row_y[x+1] = sum_y
      }
      density_d[y] = row_d
      density_x[y] = row_x
      density_y[y] = row_y
    }

    return { d: density_d, x: density_x, y: density_y }
  }

  _relax(diagram) {
    if (!diagram) { return }
    if (!diagram.cells) { return }

    let new_sites = [],
        distance_sum = 0

    diagram.cells.forEach(cell => {
      let centroid = this._cell_centroid_brightness(cell),
          distance = this._distance(centroid, cell.site)

      distance_sum += distance

      // Don't relax too fast
      if (distance > 2) {
        centroid.x = (centroid.x + cell.site.x)/2
        centroid.y = (centroid.y + cell.site.y)/2
      }

      new_sites.push(centroid)
    })

    return {
      new_sites: new_sites,
      average_distance: (distance_sum / new_sites.length)
    }
  }

  _cell_centroid_brightness(cell) {
    let cell_nodes = cell.halfedges.map(e => e.getStartpoint()).map(p => [p.x, p.y])
    let { minX, maxX, minY, maxY } = getBounds(cell_nodes)

    let x_sum = 0,
        y_sum = 0,
        d_sum = 0,
        centroid_x,
        centroid_y

    // Close cell_nodes path
    cell_nodes.push(cell_nodes[0])

    // Round our bounds to make pixel-life easier
    minX = Math.max(0, Math.floor(minX))
    maxX = Math.min(this.dimensions.w-1, Math.ceil(maxX))
    minY = Math.max(0, Math.ceil(minY))
    maxY = Math.min(this.dimensions.h-1, Math.floor(maxY))

    for(let y = minY; y <= maxY; y++) {
      let intersections = this._cell_horizontal_intersections(y, minX, maxX, cell_nodes)
      if (intersections.length > 0) {
        let bounds = array_bounds(intersections),
            x1 = Math.max(0, Math.floor(bounds[0])),
            x2 = Math.min(this.dimensions.w-1, Math.ceil(bounds[1]))

        d_sum += this._density_d(y, x1, x2)
        x_sum += this._density_x(y, x1, x2)
        y_sum += this._density_y(y, x1, x2)
      }
    }

    if (d_sum <= 0) {
      if (debug) {
        console.log("======= d_sum 0 ========")
        console.log("Bounds:")
        console.log({minX, maxX, minY, maxY})
        console.log(`x_sum: ${x_sum}`)
        console.log(`y_sum: ${y_sum}`)
        console.log(`d_sum: ${d_sum}`)
        console.log(`density_lookup_d[${minY}]`)
        console.log(this.density_lookup_d[minY])
        console.log(`density_lookup_d[${minY}][${maxX + 1}] = ${this.density_lookup_d[minY][maxX + 1]}`)
        console.log(`density_lookup_d[${minY}][${minX}] = ${this.density_lookup_d[minY][minX]}`)
        console.log("============================")
      }
      return cell.site
    }

    centroid_x = x_sum / d_sum
    centroid_y = y_sum / d_sum

    if (isNaN(centroid_y) || isNaN(centroid_y)) {
      console.log("======= Cell is NaN ========")
      console.log("Bounds:")
      console.log({minX, maxX, minY, maxY})
      console.log(`x_sum: ${x_sum}`)
      console.log(`y_sum: ${y_sum}`)
      console.log(`d_sum: ${d_sum}`)
      console.log(`density_lookup_d[${minY}]`)
      console.log(density_lookup_d[minY])
      console.log(`density_lookup_d[${minY}][${maxX + 1}] = ${density_lookup_d[minY][maxX + 1]}`)
      console.log(`density_lookup_d[${minY}][${minX}] = ${density_lookup_d[minY][minX]}`)
      console.log("============================")


      return this._cell_centroid_geometric(cell)
    }

    // If for some reason new cetroid it outside the bounds, revert to geometric
    if ( (centroid_x < 0) || (centroid_x > this.dimensions.w) || (centroid_y < 0) || (centroid_y > this.dimensions.h) ) {
      console.log("centroid out of bounds, falling back on geometric")
      return this._cell_centroid_geometric(cell)
    }

    return {x: centroid_x, y: centroid_y}
  }

  _distance(site_1, site_2) {
    let dx = site_1.x - site_2.x,
        dy = site_1.y - site_2.y
    return Math.sqrt(dx*dx + dy*dy)
  }

  _cell_horizontal_intersections(y, x1, x2, closed_nodes) {
    let x_intersections = [],
        len = closed_nodes.length

    for(let i=0; i < len-1; i++) {
      let p1 = closed_nodes[i]
      let p2 = closed_nodes[i+1]

      let intersection = line_intersection(
        x1, y,            x2, y,
        p1[0], p1[1],     p2[0], p2[1]
      )

      if (intersection && intersection[0]) {
        x_intersections.push( intersection[0] )
      }
    }

    return x_intersections
  }

  _cell_centroid_geometric(cell) {
    let x = 0,
        y = 0

    cell.halfedges.forEach(halfedge => {
      let p1 = halfedge.getStartpoint(),
        p2 = halfedge.getEndpoint(),
        v = p1.x*p2.y - p2.x*p1.y

      x += (p1.x + p2.x) * v
      y += (p1.y + p2.y) * v
    })

    let v = this._cell_area(cell) * 6;
    return {x:x/v,y:y/v};
  }

  _cell_area(cell) {
    let area = 0

    cell.halfedges.forEach(halfedge =>{
      let p1 = halfedge.getStartpoint(),
          p2 = halfedge.getEndpoint()

      area += p1.x * p2.y
      area -= p1.y * p2.x
    })
    area /= 2
    return area
  }

  _density_d(y, x1, x2) {
     return this.density_lookup_d[y][x2 + 1] - this.density_lookup_d[y][x1]
  }

  _density_x(y, x1, x2) {
    return this.density_lookup_x[y][x2 + 1] - this.density_lookup_x[y][x1]
  }

  _density_y(y, x1, x2) {
    return this.density_lookup_y[y][x2 + 1] - this.density_lookup_y[y][x1]
  }

}

export default WeightedVoronoi
