import hexagonsTopo from './../data/hexmap.json'
//import * as d3 from "d3"
import d3 from './d3Importer';
import * as topojson from "topojson"

export class Cartogram {

    constructor(opts) {

        this.initOptions(opts);

        this.el = document.querySelector("#auscartogram")

        this.selectElectorateCallback = this.opts.selectCallback;

        this.currentSelection = null

        this.initiated = false

        this.createMap()

    }

    initOptions(opts) {

        var defaultOpts = {
            mouseBindings: true,
            selectCallback: () => false,
            tooltipCallback: () => false,
        }

        this.opts = {}

        Object.keys(defaultOpts).forEach(k => this.opts[k] = opts[k] !== undefined ? opts[k] : defaultOpts[k])

    }

    createMap() {

        var self = this

        if (this.initiated) {

            d3.select("#auscartogram svg").remove();

            d3.select(".cartogram__tooltip").remove();

            this.tooltip = null

            this.tooltipElectorate = null

        }

        this.initiated = true

        this.width = this.el.getBoundingClientRect().width

        this.height = this.width * 0.85

        self.projection = d3.geoMercator()
            .center([135, -28.0])
            .scale(self.width * 1.2)
            .translate([self.width / 2, self.height / 2])

        this.path = d3.geoPath()

        this.path.projection(self.projection);

        this.svg = d3.select("#auscartogram").append("svg")
            .attr("width", self.width)
            .attr("height", self.height)
            .attr("id", "map")
            .attr("overflow", "hidden")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", `0 0 ${self.width} ${self.height}`)
            .classed("svg-content", true);

        this.hexFeatures = topojson.feature(hexagonsTopo, hexagonsTopo.objects.hexmap).features
        
        this.hexGroup = this.svg.append("g").attr('class', 'cartogram__hexgroup')

        this.hexPaths = this.hexGroup.selectAll("path").data(this.hexFeatures)        

        this.hexPaths
            .enter().append("path")
            .attr("fill", 'lightgrey')
            .classed('cartogram__hex', true)
            .attr("d", self.path)
            .on("click", function(d) { 
                self.selectElectorateCallback(d.properties.electorate)
            })

        this.hexCentroids = {}

        this.hexes = d3.selectAll(".cartogram__hex")

        this.hexes.each(d => {

            self.hexCentroids[d.properties.electorate] = self.path.centroid(d)

        });

        if (self.opts.mouseBindings) {

            this.svg.on('mouseleave', function() { this.hideTooltip(); }.bind(this))

            this.hexes.on('mouseover', function(d) {

                let electorate = d.properties.electorate

                this.tooltiper(electorate);

                /*
                d3.selectAll(".cartogram__hex").classed("cartogram__hex--focus", function(d) {
                    return (d.properties.electorate===electorate) ? true : false
                });
                */

            }.bind(this))

        }

    }

    tooltiper(selected) {

        if (selected && selected!=this.currentSelection) {

            this.currentSelection = selected

            this.renderTooltip(selected)

        }

    }

    highlightParty(party) {
        if (party) this.el.setAttribute('party-highlight', party.toLowerCase());
        else this.el.removeAttribute('party-highlight');
    }

    hideTooltip() {
        if (this.tooltip) this.tooltip.style.visibility = '';
    }

    selectElectorate(electorate) {

        var self = this

        self.hexes
            .classed('cartogram__hex--selected', function(d) {
                return (d.properties.electorate===electorate) ? true : false
            })

    }

    mapCoordsToScreenCoords(coords) {

        return [0,1].map(i => coords[i]);

    }

    renderTooltip(electorate) {

        if (!(this.tooltipElectorate === electorate)) {

            this.tooltipElectorate = electorate;

            if (!this.tooltip) {

                var tooltip = '<div class="cartogram__tooltip"></div>';
                this.el.insertAdjacentHTML('beforeend', tooltip);
                this.tooltip = this.el.querySelector('.cartogram__tooltip');
                this.tooltip.addEventListener('click', (evt) => this.opts.tooltipCallback(this.tooltipElectorate))
            }

            this.tooltip.innerHTML = `<span class="cartogram__tooltip__spout"></span>
                                        <h4>${electorate}</h4>
                                        <span class="cartogram__tooltip__tap2expand"></span>`

            var rect = this.tooltip.getBoundingClientRect();

            var centroid = this.hexCentroids[electorate];

            var coords = this.mapCoordsToScreenCoords(centroid);

            this.tooltip.style.visibility = 'visible';

            var elDimensions = this.elDimensions;
            var topSide = coords[1] > (elDimensions.height / 2);
            this.tooltip.style.top = (topSide ? coords[1]-rect.height : coords[1]) + 'px';
            var desiredLeft = (coords[0] - (rect.width / 2));
            var maxLeft = elDimensions.width - rect.width;
            var minLeft = 0;
            var actualLeft = Math.max(minLeft, Math.min(desiredLeft, maxLeft));
            this.tooltip.style.left = actualLeft + 'px';

            var spoutOffset = Math.min(rect.width - 12, coords[0] - actualLeft);
            this.tooltip.querySelector('.cartogram__tooltip__spout').style.left = spoutOffset + 'px';
            this.tooltip.className = 'cartogram__tooltip' + (topSide ? ' cartogram__tooltip--above' : ' cartogram__tooltip--below');

        }

    }

    get elDimensions() { 
        var width = this.el.getBoundingClientRect().width
        return {width: width, height: width * 0.9} 
    }

    async render(data) {

        var self = this;

        var electorateMap = new Map( data.electorates.map( (item) => [item.electorate, item]) )

        self.hexes
            .attr('party', function(d) {
                var electorate = electorateMap.get(d.properties.electorate)
                if (electorate===undefined) {
                    electorate = 'pending'
                }
                return (electorate.prediction || 'pending').toLowerCase();
            })

        return {status: "updated election map"}

    }
}
