import template from '../../templates/template.html'
import * as d3 from 'd3'
//import { Toolbelt } from '../modules/toolbelt'
import { $, $$, round, numberWithCommas, wait, getDimensions } from '../modules/util'
import Ractive from 'ractive'
import ractiveFade from 'ractive-transitions-fade'
import ractiveTap from 'ractive-events-tap'
import ractiveEventsHover from 'ractive-events-hover'
import moment from 'moment'
import share from '../modules/share'
import { Seatstack } from '../modules/seatstack'
import { Details } from '../modules/details'
import { Cartogram } from '../modules/cartogram'

export class Election {

	constructor(results, url, social) {

        var self = this

        this.database = results

        this.database.commas = (num) => {
            var result = parseFloat(num).toFixed();
            result = result.replace(/(\d)(?=(\d{3})+$)/g, '$1,');
            return result
        }

        this.url = url

        this.social = social

        this.sorter = "2PPmargin"

        this.assemble().then( (data) => {

            self.createComponents()

        })

    }

    assemble() {

        var self = this

        return new Promise((resolve, reject) => {

            this.database.parties = new Map( this.database['partyNames'].map( (item) => [item.partyCode.toLowerCase(), item]) )

            this.database.electorates = this.database.electorates.sort((a,b) => d3.ascending(+a[self.sorter], +b[self.sorter]))

            this.database.places = this.database.electorates.map( (item) => item.electorate)

            this.database.header = this.database.text[0]

            this.database.header.updated = this.updated()

            this.database.info = []

            this.database.autocomplete = []

            this.database.searchBlock = ""

            resolve({status:"success"});  

        })

    }

    createComponents() {

        var self = this

        var seatstackOpts = {
            totalSeats: 150,
            key: 'electorates',
            partyField: 'prediction'
        }

        var senatestackOpts = {
            totalSeats: 76,
            key: "senatefull",
            partyField: 'party'
        }

        var detailsOpts = {
            updateCallback: this.updateElectorateData.bind(this)
        }

        var cartogramOpts = {
            selectCallback: this.selectElectorate.bind(this),
            tooltipCallback: this.cartogramTooltipClick.bind(this),
            mouseBindings: true //!(isMobile() || isTablet())
        }

        this.components = {
            seatstack: new Seatstack(seatstackOpts),
            senatestack: new Seatstack(senatestackOpts),
            details: new Details(detailsOpts)
        };

        this.renderDataComponents().then( (data) => {

            self.ractivate()

            self.components.cartogram = new Cartogram(cartogramOpts)

            this.components.cartogram.render(this.database)

        })

    }

    async renderDataComponents() {

        await Object.keys(this.components).forEach(key => this.renderComponent(key, this.database))

    }

    renderComponent(componentName, data) {

        var self = this

        this.components[componentName].render(data).then( (results) => {

            self.database[componentName] = results

        })

    }

    ractivate() {

        var self = this

        Ractive.DEBUG = true;
        this.ractive = new Ractive({
            events: { 
                tap: ractiveTap,
                hover: ractiveEventsHover
            },
            el: '#electra',
            data: self.database,
            template: template
        })

        this.ractive.on( 'social', ( context, channel ) => {

            let shared = share(self.social.title, self.social.url, self.social.fbImg, self.social.twImg, self.social.twHash, self.social.message);
        
            shared(channel);

        });

        this.ractive.on( 'electorate', ( context, electorate ) => {

            self.database.autocomplete = []

            self.ractive.set("autocomplete", self.database.autocomplete)

            self.selectElectorate(electorate)

        });

        this.ractive.on('keydown', function(event) {

            if (event.original.keyCode === 13) {

                event.original.preventDefault()

                if (self.autocomplete.length > 0) {

                    self.selectElectorate(self.database.autocomplete[0])

                    self.database.autocomplete = []

                    self.ractive.set("autocomplete", self.database.autocomplete)

                }

            }

        })

        this.ractive.observe( 'searchBlock', function ( query ) {

            self.autocomplete(query.trim())
            
        });

    }

    autocomplete(query) {

        var self = this

        if (query.length > 2) { 

            var autocomplete = []

            var reg = new RegExp(query.toLowerCase(),'gi');

                autocomplete = self.database.places.filter( (item) => { 

                if (reg.test(item.toLowerCase())) { 

                    return item

                } 

            })

            autocomplete = autocomplete.sort(function(a, b) {

              return a.length - b.length;

            });

            if (autocomplete.length > 5) {

                autocomplete = autocomplete.slice(0, 5);

            }

            self.database.autocomplete = autocomplete


        } else {

            self.database.autocomplete = []
        }

        self.ractive.set("autocomplete", self.database.autocomplete)

    }

    updateElectorateData(data) {

        var self = this

        this.database.divisions = data

        this.database.results = new Map( self.database.electorates.map( (item) => [item.electorate, item]) )

    }

    selectElectorate(electorate) {

        var self = this

        this.selectedElectorate = electorate;
        var result = this.database.results.get(electorate)
        var aecResult = this.database.divisions.get(electorate)
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
            var predictionName = self.database.parties.get(result.prediction.toLowerCase()).partyName
        }

        if (electorate) {
            
            var info = {
                electorate: electorate,
                candidates: candidates,
                hideTwoParty: hideTwoParty,
                twoParty: twoParty,
                nameField: nameField,
                prediction: prediction,
                status: (prediction==="") ? false : true,
                predictionName: predictionName,
                heldBy: result.incumbent.toLowerCase(),
                heldByName: self.database.parties.get(result.incumbent.toLowerCase()).partyName,
                percentageCounted: (aecResult.votesCounted/aecResult.enrollment * 100).toFixed(1)
            };

            self.database.info = info
            self.database.searchBlock = ""

            self.ractive.set("info", self.database.info)    
            self.ractive.set("searchBlock", self.database.searchBlock)      

        }

    }

    cartogramTooltipClick(electorate) {
        //console.log(electorate)
        //this.components.details.selectElectorate(electorate);
        //this.freezeScrolling();
    }

    updated() {

        return moment().format("hh:mm A")

    }

}