import reqwest from 'reqwest'
import initEdd from '../lib/edd'
import d3 from 'd3'
import electorateData from '../data/results.json!json'

var constituencies, renderDropdown;
var s3prefix = 'http://interactive.guim.co.uk/2015/general-election/postcodes/';

// function isPostcode(val) { return /[0-9]/.test(val); }

export class Dropdown {
    constructor(el, opts) {
        this.el = el;
        this.electoratesById = {};
        initEdd({
            el: el,
            onChange: this.onChange.bind(this),
            onSelect: opts.onSelect,
            onFocus: opts.onFocus,
            onKeyDown: opts.onKeyDown,
            hoverEvents: opts.hoverEvents,
            disableBlur: opts.disableBlur,
            placeholder: "Enter electorate"
        })
    }

    onChange(newVal, renderCallback) {
        window.clearTimeout(this.fetchTimeout);

        // EMPTY
        if (newVal.length < 3) {
            renderCallback([]);
        }
        else if (newVal === '') {
            renderCallback([]);
        }
        // // POSTCODE
        // else if (isPostcode(newVal)) {

        //     if(newVal.length < 5) {
        //         renderCallback([[null, 'It looks like a postcode, go on...']]);
        //         return;
        //     }

        //     renderCallback([[null, 'Searching for postcode...']]);
        //     this.fetchTimeout = window.setTimeout(function() {
        //         reqwest({url: s3prefix + newVal.replace(/\s+/, '').toUpperCase(), crossOrigin: true})
        //             .then(function(resp) {
        //                 var c = this.electoratesById[resp];
        //                 renderCallback([[c.ons_id, c.name]])
        //             }.bind(this))
        //             .fail(function(resp) {
        //                 if (resp.status === 404) { renderCallback([[null, 'Postcode not found']]); }
        //             })
        //     }.bind(this), 500);
        // }
        // CONSTITUENCY NAME
        else {
            var matches = this.findElectoratesByName(newVal);
            var ret = matches.map(function(c) {
                var boldedName = c.name.replace(new RegExp('('+newVal+')', 'i'), '<strong>$1</strong>');
                return [c.name, boldedName];
            })
            renderCallback(ret.slice(0,10));
        }
    }

    findElectoratesByName(partialName) {
        var re = new RegExp(partialName, 'i');
        return this.electorates
            .filter(function(e) {
                return re.test(e.name);
            })
    }

    render(data) {
        this.data = electorateData;
        this.electorates = this.data.divisions;
        this.electoratesById = d3.map(this.electorates, (d) => d.name)
    }
}
