import reqwest from 'reqwest'
import template from './templates/details.html!text'
import swig from 'swig'
import { relativeDates } from '../lib/relativedate'
import declarationTimes from '../data/declaration-times.json!json';
import electorateData from '../data/results.json!json'

swig.setFilter('commas', function(input) {
    input = typeof input === 'string' ? input : input.toString();
    var parts = [];
    for (var i = input.length - 3; i >= 0; i-=3) parts.unshift(input.substr(i, 3));
    var firstPos = input.length % 3;
    if (firstPos) parts.unshift(input.substr(0, input.length % 3));
    return parts.join(',');
});

const templateFn = swig.compile(template)

export class Details {
    constructor(el, options) {
        this.el = el;
        this.options = options;
    }
    render(data) {
        this.results = d3.map(data.sheets.electorates, (d) => d.electorate)
        this.parties = data.parties
        this.getRecent()
    }

    renderComplete(electorates) {
        this.electorates = d3.map(electorates.divisions, (d) => d.name)
        this.handleHashLink()
        if (this.selectedElectorate) this.selectElectorate(this.selectedElectorate);
        else this.el.className = 'veri__details';

    }

    getRecent(){
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


    handleHashLink() {
        if (window.location.hash) {
            var match = /^#e=(.*)$/.exec(window.location.hash);
            var electorate = match.length === 2 && match[1];
            if (electorate) {
                this.selectElectorate(electorate)
            }
        }
    }

    selectElectorate(electorate) {
        this.selectedElectorate = electorate;
        var result = this.results.get(electorate)
        var aecResult = this.electorates.get(electorate)
        var candidates = aecResult.candidates.sort((a,b) => d3.descending(a.votesTotal,b.votesTotal))
        var hideTwoParty = false
        if (Array.isArray(aecResult.twoCandidatePreferred)) {
            var twoParty = aecResult.twoCandidatePreferred.sort((a,b) => d3.descending(a.votesTotal,b.votesTotal))
            var nameField = 'party_long'
        } else {
            var hideTwoParty = true
        }
        if (result.prediction === '') {
            var predictionName = ''
            var prediction = ''
        } else {
            var prediction = result.prediction.toLowerCase()
            var predictionName = this.parties.get([result.prediction.toLowerCase()]).partyName
        }
        this.el.parentNode.querySelector('.select-msg').style.display = 'none'
        if (electorate) {
            this.el.innerHTML = templateFn({
                electorate: electorate,
                candidates: candidates,
                hideTwoParty: hideTwoParty,
                twoParty: twoParty,
                nameField: nameField,
                prediction: prediction,
                predictionName: predictionName,
                heldBy: result.incumbent.toLowerCase(),
                heldByName: this.parties.get([result.incumbent.toLowerCase()]).partyName,
                percentageCounted: aecResult.votesCounted/aecResult.enrollment * 100
            });
            relativeDates(this.el);
        }
        this.el.className = 'veri__details' + (electorate? ' veri__details--show' : '');
    }


    hide() {
        this.selectedElectorate = null;
        this.el.className = 'veri__details';
    }
}