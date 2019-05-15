//import * as d3 from 'd3'
import d3 from './d3Importer';
const COALITION = ['lib', 'lnp', 'nat', 'clp']
const SENATE = ['lib', 'nat', 'pending', 'other', 'alp', 'grn', 'nxt']

export class Seatstack {

	constructor(opts) {

		this.totalSeats = opts.totalSeats

		this.key = opts.key

		this.partyField = opts.partyField

    this.embed = opts.embed

	}

  async render(data) {

    var results = await (this.key === 'electorates') ? this.repsRender(data) : this.senateRender(data) ;

    return results;
    
  }

  repsRender(data) {

    var hasData = data[this.key].filter((d) => !(d[this.partyField] === ""))

    var partyData = d3.nest()
      .key((d) => d[this.partyField].toLowerCase())
      .rollup((leaves) => leaves.length)
      .entries(hasData)

    partyData.forEach((d) => {

      	d.name = data.parties.get(d.key).partyName

      	d.shortName = data.parties.get(d.key).shortName

    })

    var partyMap = new Map( partyData.map( (item) => [item.key, item]) )

    partyData.sort((a,b) => b.value - a.value)

    var listSize = Math.ceil( partyMap.size / 2 )

    var labSeats = (partyMap.get('alp')) ? partyMap.get('alp').value : 0 ;

    var labPercentage = ( labSeats / this.totalSeats ) * 100

    var coalitionSeats = Array.from(partyMap.values()).reduce((total, d) => {

      return (COALITION.indexOf(d.key) > -1) ? total + d.value : total

    }, 0);

    var coalitionPercentage = ( coalitionSeats / this.totalSeats ) * 100

    this.partyData2PP = [

      { name: 'Coalition', seats: coalitionSeats, percentage: coalitionPercentage, party: 'coal', sprite: "turnbull" },

      { name: 'Labor', seats: labSeats, percentage: labPercentage, party: 'alp', sprite: "shorten" }

    ]

    this.renderData = {

      TOTAL_SEATS: this.totalSeats,

      MAJORITY_SEATS: Math.ceil( this.totalSeats / 2 ) + 1,

      partyData: partyData,

      resultCount: hasData.length,

      partyListLeft: partyData.slice(0,listSize),

      partyListRight: partyData.slice(listSize)

    };

    this.renderData.twoParty = this.partyData2PP

    return this.renderData

  }

  senateRender(data) {

    var hasData = data[this.key].filter((d) => !(d[this.partyField] === ""))

    var partyData = d3.nest()
      .key((d) => d[this.partyField].toLowerCase())
      .rollup((leaves) => leaves.length)
      .entries(hasData)

    partyData.forEach((d) => {

    	let current = hasData.filter( (item) => item.party.toLowerCase() === d.key && item.current === 'yes')

      	d.name = data.parties.get(d.key).partyName

      	d.shortName = data.parties.get(d.key).shortName

      	d.current = current.length

      	d.elected = d.value - current.length

    })

    var partyMap = new Map( partyData.map( (item) => [item.key, item]) )

    var senateData = []

    SENATE.forEach((d) => {

      var obj = {}

      obj.key = d

      var party = partyMap.get(d)

      var seats = party ? party.value : 0 ;

      var current = party ? party.current : 0 ;

      var elected = party ? party.elected : 0 ;

      if (party) {

        obj.name = party.name

        obj.shortName = party.shortName

      } else {

        obj.name = d

        obj.shortName = d

      }

      obj.value = seats

      obj.current = current

      obj.elected = elected

      obj.seats = ( seats > 0 ) ? true : false ;

      obj.currentSeats = ( current > 0 ) ? true : false ;

      obj.electedSeats = ( elected > 0 ) ? true : false ;

      obj.percentage = ( seats / this.totalSeats ) * 100 ;

      obj.currentPercentage = ( current / seats ) * 100 ;

      obj.electedPercentage = ( elected / seats ) * 100 ;

      obj.notpending = (d === 'pending') ? false : true ;

      senateData.push(obj)
      
    })

    var senateMap = new Map( senateData.map( (item) => [item.key, item]) )

    var breakdown = [{
    	value : "value",
    	seats : "seats",
    	percentage : "percentage",
    },{
    	value : "current",
    	seats : "currentSeats",
    	percentage : "currentPercentage",
    },{
    	value : "elected",
    	seats : "electedSeats",
    	percentage : "electedPercentage",
    }]

    for (var i = 0; i < breakdown.length; i++) {

    	senateMap.get('other')[breakdown[i].value] = d3.sum(partyData.filter((d) => !senateMap.has(d.key) && d.key !== 'lnp' && d.key !== 'clp'), (d) => d[breakdown[i].value])
    
    	senateMap.get('other')[breakdown[i].seats] = ( senateMap.get('other')[breakdown[i].value] > 0 ) ? true : false ;

    	senateMap.get('other')[breakdown[i].percentage] = (breakdown[i].value==="value") ? ( senateMap.get('other')[breakdown[i].value] / this.totalSeats ) * 100 : ( senateMap.get('other')[breakdown[i].value] / senateMap.get('other').value ) * 100 ;

		var lnpValue = partyMap.get('lnp') ? partyMap.get('lnp')[breakdown[i].value] : 0

		var clpValue = partyMap.get('clp') ? partyMap.get('clp')[breakdown[i].value] : 0

		senateMap.get('lib')[breakdown[i].value] += lnpValue + clpValue

		senateMap.get('lib')[breakdown[i].seats] = ( senateMap.get('lib')[breakdown[i].value] > 0 ) ? true : false ;

		senateMap.get('lib')[breakdown[i].percentage] = (breakdown[i].value==="value") ? ( senateMap.get('lib')[breakdown[i].value] / this.totalSeats ) * 100 : ( senateMap.get('lib')[breakdown[i].value] / senateMap.get('lib').value ) * 100 ;

    }

    //senateMap.get('other').values = d3.sum(partyData.filter((d) => !senateMap.has(d.key) && d.key !== 'lnp' && d.key !== 'clp'), (d) => d.value)
    
    //senateMap.get('other').seats = ( senateMap.get('other').values > 0 ) ? true : false ;

    //senateMap.get('other').percentage = ( senateMap.get('other').values / this.totalSeats ) * 100 ;

    senateMap.get('pending').value = this.totalSeats - hasData.length

    //var lnpValue = partyMap.get('lnp') ? partyMap.get('lnp').value : 0
    
    //var clpValue = partyMap.get('clp') ? partyMap.get('clp').value : 0
    
    //senateMap.get('lib').values += lnpValue + clpValue

    //senateMap.get('lib').seats = ( senateMap.get('lib').values > 0 ) ? true : false ;

    //senateMap.get('lib').percentage = ( senateMap.get('lib').values / this.totalSeats ) * 100 ;
    
    partyData.sort((a,b) => b.value - a.value)

    var listSize = Math.ceil( partyMap.size / 2 )

    var renderData = {

      TOTAL_SEATS: this.totalSeats,

      MAJORITY_SEATS: Math.ceil( this.totalSeats / 2 ),

      partyData: Array.from(senateMap.values()), 

      resultCount: hasData.length,

      partyListLeft: partyData.slice(0,listSize),

      partyListRight: partyData.slice(listSize)

    };

    console.log(renderData)

    return renderData

  }

}
