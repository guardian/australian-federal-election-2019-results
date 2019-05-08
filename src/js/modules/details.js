import reqwest from 'reqwest'
import * as d3 from "d3"

export class Details {

    constructor(opts) {

        this.initOptions(opts);

        this.manageUpdateCallback = this.opts.updateCallback;

    }

    initOptions(opts) {

        var defaultOpts = {

            updateCallback: () => false

        } 

        this.opts = {}

        Object.keys(defaultOpts).forEach(k => this.opts[k] = opts[k] !== undefined ? opts[k] : defaultOpts[k])
    
    }

    async render(data) {

        this.getRecent()

        return { updated: "now" }

    }

    renderComplete(electorates) {

        var divisions = d3.map(electorates.divisions, (d) => d.name)

        this.manageUpdateCallback(divisions);

    }

    getRecent() {

        var req;

        var recent = 'https://interactive.guim.co.uk/2016/aus-election/results-data/recentResults.json'

        var opts = {
            url: recent,
            type: 'json',
            crossOrigin: true,
            // use response's date header to use for relative dates (we trust CDN date more than local)
            success: resp => this.getDetailData(resp)
        };

        if (this.lastDataResponseDate) {

            opts.headers = {

                'If-Modified-Since': this.lastDataResponseDate

            };

        }

        req = reqwest(opts);

        return req;

    }

    getDetailData(resp, detailIndex=0) {

        var dataUrl = 'https://interactive.guim.co.uk/2016/aus-election/results-data/'
        var req;
        var numResults = resp.length
        this.detailIndex = detailIndex

        var opts = {
            url: `${dataUrl}${resp[detailIndex]}.json`,
            type: 'json',
            crossOrigin: true,
            // use response's date header to use for relative dates (we trust CDN date more than local)
            success: resp => this.renderComplete(resp),
            error: err => { if(detailIndex < (numResults - 1)) { this.getDetailData(resp, detailIndex++) }}
        };
        req = reqwest(opts);
        return req;

    }

}