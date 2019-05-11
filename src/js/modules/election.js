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
import { Contests } from '../modules/contest'
import { Cartogram } from '../modules/cartogram'
import loadJson from '../../components/load-json/'

export class Election {

	constructor(googledata, url, social) {

        var self = this

        this.database = googledata

        this.database.info = []

        this.database.autocomplete = []

        this.database.searchBlock = ""

        this.database.feed = null

        this.database.commas = (num) => {
            var result = parseFloat(num).toFixed();
            result = result.replace(/(\d)(?=(\d{3})+$)/g, '$1,');
            return result
        }

        this.url = url

        this.social = social

        this.sorter = "2PPmargin"

        this.assemble(googledata).then( (data) => {

            self.createComponents()

        })

    }

    assemble(googledata) {

        var self = this

        return new Promise((resolve, reject) => {

            this.database.senatefull = googledata.senatefull

            this.database.partyNames = googledata.partyNames

            this.database.parties = new Map( googledata['partyNames'].map( (item) => [item.partyCode.toLowerCase(), item]) )

            this.database.electorates = googledata.electorates.sort((a,b) => d3.ascending(+a[self.sorter], +b[self.sorter]))

            this.database.places = this.database.electorates.map( (item) => item.electorate)

            this.database.header = googledata.text[0]

            this.database.outcome = googledata.text[0].outcome

            this.database.updated = this.updated()

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

        var contests = [{
            "key": "climate_change",
            "value": "Climate change"
        },{
            "key": "healthcare",
            "value": "Healthcare"
        },{
            "key": "tax",
            "value": "Tax"
        },{
            "key": "immigration",
            "value": "Immigration"
        },{
            "key": "education",
            "value": "Education"
        },{
            "key": "industrial_relations",
            "value": "Industrial relations"
        }];

        var contestOpts = {
            categories: contests
        }

        this.components = {
            seatstack: new Seatstack(seatstackOpts),
            senatestack: new Seatstack(senatestackOpts),
            feed: new Details(detailsOpts),
            contests: new Contests(contestOpts)
        };

        this.renderDataComponents().then( (data) => {

            self.ractivate()

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
            template: template,
            oncomplete: function () {

                console.log( 'Initiate map' );

                self.initMap()

            }
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

        this.initFeed()


    }

    initMap() {

        var self = this

        var cartogramOpts = {
            selectCallback: this.selectElectorate.bind(this),
            tooltipCallback: this.cartogramTooltipClick.bind(this),
            mouseBindings: self.isMobile() ? false : true
        }

        self.components.cartogram = new Cartogram(cartogramOpts)

        self.components.cartogram.render(self.database)

    }

    initFeed() {

        // this.dataInterval = window.setInterval(this.Googledoc.bind(this), 20000);

    }

    Googledoc() {

        var self = this

        loadJson(`${self.url}?t=${new Date().getTime()}`).then((data) => {

            self.assemble(data.sheets).then( (data) => {

                self.renderDataComponents().then( (data) => {

                    self.ractive.set(self.database)

                })

            })


        })

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

    resize() {

        var self = this

        window.addEventListener("resize", function() {

            clearTimeout(document.body.data)

            document.body.data = setTimeout( function() { 

                // Do what you need to do

            }, 200);

        });

    }

    isMobile() {
        
        var check = false;
        (function(a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true
        })(navigator.userAgent || navigator.vendor || window.opera);
        var isiPad = navigator.userAgent.match(/iPad/i) != null;
        return (check || isiPad ? true : false);

    }

}