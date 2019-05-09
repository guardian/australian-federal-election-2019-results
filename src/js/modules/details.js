import loadJson from '../../components/load-json/'

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

        var self = this

        var dataUrl = 'https://interactive.guim.co.uk/2016/aus-election/results-data/'

        var allFeeds = await loadJson(`${dataUrl}recentResults.json`).then((feeds) => feeds)

        var latestFeed = allFeeds[0]

        loadJson(`${dataUrl}${latestFeed}.json`).then((electorates) => self.renderComplete(electorates))

        return +latestFeed

    }

    renderComplete(electorates) {

        var divisions = new Map( electorates.divisions.map( (item) => [item.name, item]) )

        this.manageUpdateCallback(divisions);

    }

}