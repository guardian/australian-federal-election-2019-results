import template from './templates/resultsTable.html!text'
import swig from 'swig'
import d3 from 'd3'

swig.setFilter('cssify', (input) => input.replace(' ', '').toLowerCase());

swig.setFilter('commas', function(input) {
    input = typeof input === 'string' ? input : input.toString();
    var parts = [];
    for (var i = input.length - 3; i >= 0; i-=3) parts.unshift(input.substr(i, 3));
    var firstPos = input.length % 3;
    if (firstPos) parts.unshift(input.substr(0, input.length % 3));
    return parts.join(',');
});

const templateFn = swig.compile(template)

export class ResultsTable {
    constructor(el, options) {
        this.el = el;
        this.options = options;
        // this.el.getElementsByTagName("th").addEventListener('click', function(evt) {
        //     console.log(evt.target)
        // });
    }
    render(data) {
        var electorates = data.sheets.electorates.sort((a,b) => d3.ascending(+a['2PPmargin'], +b['2PPmargin']))
        // this.el.innerHTML = templateFn({electorates: electorates})
        var that = this

        var headerData = [
            {name: "Electorate", sort: "electorate", direction: "ascending"},
            {name: "Margin (2013)", sort: "2PPmargin", direction: "ascending"},
            {name: "Party (held)", sort: "incumbent", direction: "ascending"},
            {name: "Party (against)", sort: "2PPagainst", direction: "ascending"},
            {name: "Prediction", sort: "prediction", direction: "ascending"}

        ]
        this.table = d3.select(this.el).select("table")

        var headerRow = this.table.append("thead").append("tr")

        var header = headerRow.selectAll("th").data(headerData)
            .enter()
            .append("th")
            .text((d) => d.name)
            .attr("data-sortField", (d) => d.sort)
            .attr("data-sortDirection", (d) => d.direction)
            .classed("selected", (d) => (d.sort === "2PPmargin") ? true : false)
            .on("click", function(d) {
                // var electorates = data.sheets.electorates.sort((a,b) => d3.ascending(a[sort], b[sort]))
                // console.log(electorates)
                if (d.sort) { 
                    if (d3.select(this).classed("selected")) {
                        if (d.direction == "ascending") { 
                            d.direction = "descending"
                        } else if (d.direction == "descending") {
                            d.direction = "ascending"
                        }                       
                        d3.select(this).attr("data-sortDirection", (d) => d.direction)
                    } else {
                        header.classed("selected", false)
                        d3.select(this).classed("selected", true)
                    }
                    that.updateSort(d.sort, d.direction) 
                }
                // that.el.innerHTML = templateFn({electorates: electorates})
            })

        this.tbody = this.table.append("tbody")
        this.drawTable(electorates)
        // tbody.d3.select(this.el).selectAll("th")

    }

    drawTable(tableData) {
        this.tbody.selectAll("tr").remove()
        
        this.row = this.tbody.selectAll("tr").data(tableData)
            .enter()
            .append("tr")

        this.row.append("td")
            .text((d) => d.electorate)
        this.row.append("td")
            .text((d) => d['2PPmargin'])
        this.row.append("td")
            .text((d) => d.incumbent)
            .attr("class", "party-name")
            .attr("data-partyname", (d) => d.incumbent.toLowerCase())

        this.row.append("td")
            .text((d) => d['2PPagainst'])
            .attr("class", "party-name")            
            .attr("data-partyname", (d) => d['2PPagainst'].toLowerCase())

        this.row.append("td")
            .text((d) => (d.prediction === "") ? "Unknown" : d.prediction)
            .attr("class", "party-name")            
            .attr("data-partyname", (d) => (d.prediction === "") ? "unknown" : d.prediction.toLowerCase())

    }

    updateSort(sort, direction) {
        this.row.sort((a,b) => d3[direction](a[sort], b[sort]))
    } 
}
