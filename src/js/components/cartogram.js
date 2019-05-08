import hexagonsTopo from '../data/hexmerged.json!json'
import regionsTopo from '../data/regions-topo.json!json'
import topojson from 'mbostock/topojson'
import d3 from 'd3'
import textures from 'riccardoscalco/textures'
import dropdownHTML from './templates/cartogramDropdown.html!text'
import swig from 'swig'
import { Legend } from './legend'
import { b64gradient } from '../lib/svg-gradient'

d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

var getDist = (x1,y1,x2,y2) => Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));

export class AUSCartogram {
    constructor(el, opts) {

        this.initOptions(opts);
        this.el = el;
        this.svg = d3.select(el).append("svg")
        this.map = this.svg.append('g');
        this.selectElectorateCallback = this.opts.selectCallback;
        this.metric = 'Winning Party';

        this.resetZoom();
        this.renderHex();
        this.renderRegions();
        this.focusHexGroup = this.map.append('g');
        this.arrowGroup = this.map.append('g').attr('class', 'cartogram__arrowgroup');
        this.project();
        this.initEventHandling();
        this.initDefs();

        var self = this;
        window.foo = (t,s) => self.setTransform(t,s)
        window.bar = () => self.initProjection()
    }

    initOptions(opts) {
        var defaultOpts = {
            mouseBindings: true,
            selectCallback: () => false, // no-op
            tooltipCallback: () => false, // no-op
            partyColors: {
                Con: '#005789',
                Green: '#33A22B',
                Lab: '#E31F26',
                SNP: '#FCDD03',
                LD: '#FFB900',
                UKIP: '#7D0069',
                PC: '#868686'
            }
        }

        this.opts = {}
        Object.keys(defaultOpts).forEach(k => this.opts[k] = opts[k] !== undefined ? opts[k] : defaultOpts[k])
    }

    initDefs() {
        this.defs = this.svg.append("defs");

        var marker = this.defs.append("marker")
          .attr("class","marker")
          .attr("id", "arrowhead")
          .attr("refY", 3)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          // .attr("fill","#a60000")
          .attr("stroke","none")
          .append("path")
          .attr("d", "M 0,0 V 6 L6,3 Z");
    }

    project() { // do projections separately so we can rerender
        var self = this;
        this.svg.attr("width", "100%")
            .attr("height", this.elDimensions.height)
        this.initProjection();
        this.map.selectAll("path").attr("d", this.path)
        this.regionGroup.selectAll("circle")
            .attr("cx", d => self.projection(d.geometry.coordinates)[0] )
            .attr("cy", d => self.projection(d.geometry.coordinates)[1] )
        this.regionGroup.selectAll('text')
            .attr("x", d => self.projection(d.geometry.coordinates)[0] )
            .attr("y", d => self.projection(d.geometry.coordinates)[1] )
        this.hexCentroids = {}
        this.hexPaths.each(d => this.hexCentroids[d.properties.electorate] = this.path.centroid(d));
    }

    initProjection() {
        var elDimensions = this.elDimensions;
        var scale = 1.2 * elDimensions.width
        this.projection = d3.geo.mercator()
            .scale(scale)
            .translate([elDimensions.width / 2, elDimensions.height / 2])
            .center([133, -28])
            // .rotate([2,0])
            .precision(10.0);
        if (!this.path) this.path = d3.geo.path();
        this.path.projection(this.projection)
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
            var msg = electorate

            this.tooltip.innerHTML =
                '<span class="cartogram__tooltip__spout"></span>' +
                `<h4>${msg}</h4>` +
                '<span class="cartogram__tooltip__tap2expand"></span>';

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

    hideTooltip() {
        if (this.tooltip) this.tooltip.style.visibility = '';
    }

    renderHex() {
        this.hexFeatures = topojson.feature(hexagonsTopo, hexagonsTopo.objects.hexagons).features
        this.hexGroup = this.map.append('g').attr('class', 'cartogram__hexgroup')
        this.hexPaths = this.hexGroup.selectAll("path")
                                .data(this.hexFeatures)
        this.hexPaths
            .enter().append("path")
            .attr("d", this.path)
            .classed('cartogram__hex', true)
        if (this.lastRenderedData) this.render(this.lastRenderedData);
    }

    renderRegions() {
        var self = this;
        this.regionFeatures = topojson.feature(regionsTopo, regionsTopo.objects.regions).features
        this.regionFeaturesCities = this.regionFeatures.filter(d => d.geometry.type === "Point" && !d.properties.abbr);
        this.regionFeaturesRegions = this.regionFeatures.filter(d => d.geometry.type === "Point" && d.properties.abbr);
        this.regionGroup = this.map.append('g').attr('class', 'cartogram__regiongroup')
    }

    renderRegionLabels(type, className, data) {
        this.regionGroup.selectAll(type)
            .data(data).enter()
            .append("text")
                .attr("class",className)
                // .attr("x", d => this.projection(d.geometry.coordinates)[0] )
                // .attr("y", d => this.projection(d.geometry.coordinates)[1] )
                .attr("dy", "-.35em")
                .text(d => d.properties['abbr'] || d.properties.name)
    }

    screenCoordsToMapCoords(coords) {
        return [0,1].map(i => (coords[i]- this.translate[i]) / this.scale[i])
    }

    mapCoordsToScreenCoords(coords) {
        return [0,1].map(i => (coords[i] * this.scale[i]) + this.translate[i]);
    }

    setDropdown(i) {
        this.metricDropdown.selectedIndex = i;
        this.setMetric(this.metricDropdown.options[i].value);
    }

    initEventHandling() {
        var self = this;

        if (this.opts.mouseBindings) {
            this.hexPaths.on('mousemove',function(d){
                    var mouseElectorate = d.properties.electorate;
                    self.focusElectorate(mouseElectorate);
            })

            this.svg.on('mouseleave', function() { this.blurConstituency(); this.hideTooltip(); }.bind(this))
        }

        this.hexPaths.on("click",function(d){
            var mouseElectorate = d.properties.electorate;
            self.selectElectorate(mouseElectorate);
        })

        var lastWidth = this.elDimensions.width;
        var rerenderTimeout;
        window.addEventListener('resize', function(evt) {
            var thisWidth = this.elDimensions.width;
            if (lastWidth != thisWidth) {
                window.clearTimeout(rerenderTimeout);
                rerenderTimeout = window.setTimeout(this.project.bind(this), 500);
            }
        }.bind(this))
    }

    get elDimensions() { 
        var width = this.el.getBoundingClientRect().width
        return {width: width, height: width * 0.9}
    }
    get elCenter() {
        var rect = this.el.getBoundingClientRect();
        return [rect.width/2, rect.height/2];
    }

    focusElectorate(electorate) {
        if (this.focusedElectorate === electorate) return;

        this.blurConstituency();

        if (!electorate) return;

        var focusHexGroupEl = this.focusHexGroup[0][0];
        this.hexPaths
            .filter(d => d.properties.electorate === electorate)
            .each(function() {
                var clone = this.cloneNode();
                clone.setAttribute('class', clone.getAttribute('class') + ' cartogram__hex--focus');
                focusHexGroupEl.appendChild(clone);
            })

        this.renderTooltip(electorate);
    }

    blurConstituency() {
        this.focusHexGroup.selectAll('*').remove();
        this.focusedElectorate = null;
        // this.hideTooltip();
    }

    setLatest(constituencyIds) {
        this.selectedLatestIds = constituencyIds;
        this.hexPaths
            .classed('cartogram__hex--latest', false)
            .filter(d => constituencyIds.indexOf(d.properties.electorates) !== -1)
            .classed('cartogram__hex--latest', true);

    }

    selectElectorate(electorate) {
        this.selectElectorateCallback(electorate);

        if (this.focusedElectorate) {
            var focused = this.focusedElectorate;
            this.focusedElectorate = null;
            this.hideTooltip();
            window.setTimeout(() => this.focusElectorate(focused), 500);
        }

        this.hexPaths
            .classed('cartogram__hex--selected', false )
            .filter(d => d.properties.electorate === electorate)
            .classed('cartogram__hex--selected', true)
            .moveToFront()
    }

    resetZoom() {
        this.el.removeAttribute('zoomed');
        this.setTransform([0,0], [1,1])
        this.hexPaths && this.hexPaths.classed('cartogram__hex--selected', false)
    }

    setTransform(translate, scale) {

        if (this.translate && this.scale &&
            this.translate[0] === translate[0] && this.translate[1] === translate[1] &&
            this.scale[0] === scale[0] && this.scale[1] === scale[1]) return;

        this.translate = translate;
        this.scale = scale;

        this.map.transition()
            .ease(d3.ease('out'))
            .duration(200)
            .attr('transform', `translate(${translate}) scale(${scale})`);
    }

    setMetric(metric) {
        if (metric !== this.metric) {
            this.metric = metric;
            if (this.lastRenderedData) this.render(this.lastRenderedData);
        }
    }

    initTextures() {
        if (!this.texture) {
            this.texture = textures.lines()
                .size(4)
                .strokeWidth(1)
                .stroke("#aaa")
                .orientation("6/8")
                .background("#e1e1e1")
            this.texture2 = textures.lines()
                .size(4)
                .strokeWidth(1) 
                .stroke("#aaa")
                .background("#e1e1e1");
            this.svg.call(this.texture);
            this.svg.call(this.texture2);
        }
    }

    getConstituencyOffset(electorate) {
        var path = this.hexPaths[0].find(p => p.__data__.properties.electorates === electorate);
        return path && path.getBoundingClientRect().top;
    }

    highlightParty(party) {
        if (party) this.el.setAttribute('party-highlight', party.toLowerCase());
        else this.el.removeAttribute('party-highlight');
    }

    get metricMeta() {
        var meta = {headline: '', description: ''};
        var wasis = this.lastRenderedData.PASOP.numberOfResults === 650 ? 'was' : 'is';
        if (this.metric.startsWith('voteshare')) {
            var partyName = this.metric.substr('voteshare '.length);
            var party = this.lastRenderedData.PASOP.parties.find(p => p.abbreviation === partyName);
            if (party) {
                var perc = party.percentageShare;
                var percChange = party.percentageChange;
                var increasedecrease = percChange < 0 ? 'decrease' : 'increase';
                meta.header = `${party.name} vote share`;
                meta.description = `National vote share ${wasis} ${perc.toFixed(0)}%, a ${Math.abs(percChange.toFixed(1))} percentage point ${increasedecrease}`
            } else {
                meta.header = `${partyName} vote share`;
                meta.description = 'Awaiting first result'
            }
        } else if (this.metric === 'Majority %') {
            meta.header = 'Margin of victory';
            meta.description = 'Percentage points';
        } else if (this.metric === 'Turnout %') {
            var turnout = this.lastRenderedData.overview.turnoutPerc;
            meta.header = "Turnout";
            if (this.lastRenderedData.PASOP.numberOfResults === 0) {
                meta.description = 'Awaiting first result';
            } else if (this.lastRenderedData.PASOP.numberOfResults === 650) {
                meta.description = `National turnout ${wasis} ${turnout.toFixed(0)}%`;
            } else {
                meta.description = '';
            }
        } else if (this.metric.startsWith('arrow-gain')) {
            var partyName = this.metric.substr('arrow-gain '.length);
            meta.header = `Where ${partyName} has gained support`;
            meta.description = 'Length of the arrow indicates the percentage point change from 2010';
        } else if (this.metric.startsWith('arrow-loss')) {
            var partyName = this.metric.substr('arrow-loss '.length);
            meta.header = `Where ${partyName} has lost support`;
            meta.description = 'Length of the arrow indicates the percentage point change from 2010';
        }
        return `<h4>${meta.header}</h4><p>${meta.description}</p>`;
    }

    renderChoropleth(idToValMap, colorRange, defaultFill=null) {
        var roundTo = 5;
        var minValRounded, maxValRounded;
        var values = Object.keys(idToValMap).map(k => idToValMap[k]).filter(k => k !== undefined)
        if (values.length) {
            var minVal = Math.round(Math.min.apply(null, values));
            var maxVal = Math.round(Math.max.apply(null, values));
            minValRounded = minVal - (minVal % roundTo);
            maxValRounded = maxVal + 5 - (maxVal % roundTo);
            var color = d3.scale.linear()
                .domain([minValRounded, maxValRounded])
                .range(colorRange);
            this.hexPaths
                .each(function(d) {
                    var value = idToValMap[d.properties.electorates];
                    d3.select(this)
                        .attr('fill', value ? color(value) : '')
                        .classed('cartogram__hex--empty', !value);
                });
        }
        var gradient = b64gradient(colorRange[0], colorRange[colorRange.length-1]);
        var keyMin = minValRounded === undefined ? '—' : minValRounded + '%';
        var keyMax = maxValRounded === undefined ? '—' : maxValRounded + '%';
        var keyHTML =
            `<div class="cartogram__gradient-key" style="background: url(data:image/svg+xml;base64,${gradient})">
                <span>${keyMin}</span><span>${keyMax}</span>
            </div>`;
        // this.renderLegend(keyHTML);
    }

    renderArrows(data) {
        var values = data.map(d => d[1])
        var idToValMap = new Map();
        data.forEach(d => idToValMap.set(d[0], d[1]))
        var maxArrowSize = 100;
        var minArrowSize = 5;
        var arrowSizeRange = maxArrowSize - minArrowSize;

        function generatePath(val, center) {
            var negative = val < 0;
            var arrowMag = minArrowSize + (Math.abs(val / 100) * arrowSizeRange);
            var arrowLength = arrowMag * (negative ? -1 : 1);
            var y = parseInt(center[1]) + 0.5;
            var startx = center[0] - (arrowLength/1.5);
            var endx = center[0] + (arrowLength/1.5);
            return `M${startx},${y}L${endx},${y}`;
        }

        this.hexPaths
            .classed('cartogram__hex--has-arrow', d => idToValMap.get(d.properties.electorates) !== undefined)

        this.arrowGroup
            .selectAll('path')
            .data(data).enter()
            .append('path')
            .classed('cartogram__arrow', true)
            .attr('d', d => generatePath(d[1], this.hexCentroids[d[0]]))
            .attr('marker-end', 'url(#arrowhead)')

        var gainloss = this.metric.startsWith('arrow-loss') ? 'loss' : 'gain';
        this.renderLegend(`<div class="cartogram__legend-arrow cartogram__legend-arrow--${gainloss}"></div>`);
    }

    gradientSvg(colorFrom, colorTo) {
        return btoa();
    }

    render(data) {
        var self = this;
        this.initTextures();

        // DATA
        // this.lastRenderedData = data;
        // var constituenciesById = this.constituenciesById = {};
        // data.constituencies.forEach(c => constituenciesById[c.ons_id] = c)
        var electorateMap = d3.map(data.sheets.electorates, (d) => d.electorate);
        // shared rendering
        var alternate = 0;
        this.hexPaths
            .attr('party', function(d) {
                var electorate = electorateMap.get(d.properties.electorate)
                return (electorate.prediction || 'pending').toLowerCase();
            })
            .each(function(d) {
                var hasResult = electorateMap.get(d.properties.electorate).prediction;
                // var hasResult = true
                if (hasResult) d3.select(this).attr('fill', '');
                else d3.select(this).attr('fill', () => (alternate++ % 2) ? self.texture.url() : self.texture2.url());
            })
            .classed('cartogram__hex--empty', false);

        this.arrowGroup.selectAll('*').remove();

        var choro = ['Turnout %', 'Majority %']
        var isChoro = (metric) => metric.startsWith('voteshare ') || choro.indexOf(metric) !== -1
        var isArrow = (metric) => metric.startsWith('arrow-');

        this.hexPaths.attr('opacity', 1);

        if (this.metric === 'Winning Party') {
            this.el.setAttribute('map-mode', 'party');
         } else if (this.metric === 'Majority %') {
            this.el.setAttribute('map-mode', 'majority');
            var parties = ['Lab', 'Con', 'LD', 'SNP', 'Green', 'Ukip', 'DUP', 'SF', 'SDLP', 'Others'];
            var keyHTML = parties.map(p => `<div class="cartogram__majority-key cartogram__majority-key--${p.toLowerCase()}"><span></span><span></span><span></span>${p}</div>`).join('')
            // this.legendEl.innerHTML = this.metricMeta + keyHTML;
            var majorityById = {};
            data.constituencies.forEach(c => majorityById[c.ons_id] = c['2015'].percentageMajority);

            this.hexPaths
                .each(function(d) {
                    var value = majorityById[d.properties.electorates];
                    var opacity;
                    if (value === undefined) opacity = 1.0;
                    else if (value < 15) opacity = 0.33;
                    else if (value < 30) opacity = 0.66;
                    else opacity = 1.0;
                    d3.select(this)
                        .attr('opacity', opacity)
                });
        } else if (isChoro(this.metric)) {

            this.el.setAttribute('map-mode', 'choropleth');

            if(this.metric === 'Turnout %') {
                var mapData = {};
                data.constituencies.forEach(c => mapData[c.ons_id] = c['2015'].percentageTurnout)
                this.renderChoropleth(mapData, ["white", "black"]);

            } else if (this.metric.startsWith('voteshare')) {
                var partyName = this.metric.slice(10);
                var mapData = {};
                var pairs = data.constituencies
                    .map(c => [c.ons_id, c['2015'].candidates.find(cand => cand.party === partyName)])
                    .filter(v => v[1] !== undefined)
                    .map(v => [v[0], v[1].percentage])
                    .forEach(v => mapData[v[0]] = v[1])
                this.renderChoropleth(mapData, ["white", this.opts.partyColors[partyName]]);

            }
        }
    }
}
