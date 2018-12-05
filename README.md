# stipulator
Implementation of weighted voronoi stippling algorithm in Javascript. This algorithm was published by Adrian Secord as part of his masters thesis, a copy of which is in this repo.

## Installation
This thing is served by webpack. You'll need a node/npm setup. From there...

```
npm install
npm start
```

## Usage

Fire up your browser. On the right hand side is a simple little GUI. The button at the top loads files (check out the ones in `example_images`), the subsequent sliders increase the number of dots and their size. The final button will download the coordinates of the points in a .TSP file to feed into a Traveling Salesman solver. I use the `linkern` binary from [Concorde](http://www.math.uwaterloo.ca/tsp/concorde/downloads/downloads.htm) and it works well. 
