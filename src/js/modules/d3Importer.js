import { nest, entries } from "d3-collection";
import { scaleLinear } from "d3-scale";
import { axisBottom, axisLeft } from 'd3-axis';
import { geoMercator, geoPath } from "d3-geo";
import { select, selectAll } from "d3-selection";
import { sum } from "d3-array";

export default {
    entries: entries,
    nest: nest,
    scaleLinear: scaleLinear,
    geoPath: geoPath,
    geoMercator: geoMercator,
    select: select,
    selectAll: selectAll,
    sum: sum,
};