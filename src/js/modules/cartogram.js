import hexagonsTopo from './../data/hexmerged.json'
import * as d3 from "d3"
import * as topojson from "topojson"

d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

export class Cartogram {

    constructor(opts) {

        this.initOptions(opts);

        this.el = document.querySelector("#auscartogram")

        this.selectElectorateCallback = this.opts.selectCallback;

        this.width = this.el.getBoundingClientRect().width

        this.height = this.width * 0.85

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

        this.hexFeatures = topojson.feature(hexagonsTopo, hexagonsTopo.objects.hexagons).features
        
        this.hexGroup = this.svg.append("g").attr('class', 'cartogram__hexgroup')

        this.hexPaths = this.hexGroup.selectAll("path").data(this.hexFeatures)        

        this.hexPaths
            .enter().append("path")
            .attr("fill", function(d) {
                return 'lightgrey' ;
            })
            .classed('cartogram__hex', true)
            .style("stroke","#fff")
            .attr("d", self.path)
            .on("mouseover", tooltipIn)
            .on("mouseout", tooltipOut)
            .on("click", hexclick)
            .on("mousemove", mousemove)

        this.hexCentroids = {}

        this.hexes = d3.selectAll(".cartogram__hex")

        this.hexes.each(d => {

            self.hexCentroids[d.properties.electorate] = self.path.centroid(d)

        });

        function mousemove(d) {

            if (self.opts.mouseBindings) {


            }

        }

        function hexclick(d) {

            self.selectElectorateCallback(d.properties.electorate);

        }

        function tooltipIn(d) {

            self.renderTooltip(d.properties.ELECT_DIV)

        }

        function tooltipOut() {

            if (self.tooltip) self.tooltip.style.visibility = 'hidden';

        }

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

        d3.selectAll(`.cartogram__hex`)
            .attr('party', function(d) {
                var electorate = electorateMap.get(d.properties.electorate)
                return (electorate.prediction || 'pending').toLowerCase();
            })

        return {status: "updated election map"}

    }
}
