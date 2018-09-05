export function render_tsp(points, name, width, height) {
return `
NAME : ${name}
COMMENT : { "width": ${width}, "height": ${height} }
TYPE : TSP
EDGE_WEIGHT_TYPE: EUC_2D
DIMENSION : ${points.length}
NODE_COORD_SECTION
${points.map( (p, i) => `${i+1} ${p[0]} ${p[1]}`).join("\n")}
EOF
`.trim()
}
