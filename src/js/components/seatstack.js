import template from './templates/seatstack.html!text'
import template2PP from './templates/seatstack2PP.html!text'
import { Sprite } from './sprites'
import swig from 'swig'

const templateFn = swig.compile(template)
const templateFn2PP = swig.compile(template2PP)
const COALITION = ['lib', 'lnp', 'nat', 'clp']
const SENATE = ['lib', 'nat', 'pending', 'other', 'nxt', 'grn', 'alp']

export class Seatstack {
	constructor(el, opts) {
		this.el = el;
		this.totalSeats = opts.totalSeats
		this.key = opts.key
		this.partyField = opts.partyField
    this.embed = opts.embed
		if (opts.hoverFn) {			
			this.el.addEventListener('mouseover', function(evt) {
				var partyName = evt.target.getAttribute('data-partyhover') || evt.target.parentElement.getAttribute('data-partyhover')
				if (partyName) opts.hoverFn(partyName.toLowerCase());
			});

			this.el.addEventListener('mouseout', function(evt) {
				var partyName = evt.target.getAttribute('data-partyhover') || evt.target.parentElement.getAttribute('data-partyhover')
				if (partyName) opts.hoverFn(null);
			});
		}

	}
	render(data) {
    if (this.key === 'electorates') {
      this.repsRender(data)
      if (!this.embed) { this.renderSprites()}
    } else if (this.key === 'senatefull') {
      this.senateRender(data)
    }
	}

  repsRender(data) {
    var hasData = data.sheets[this.key].filter((d) => !(d[this.partyField] === ""))
    var partyData = d3.nest()
      .key((d) => d[this.partyField].toLowerCase())
      .rollup((leaves) => leaves.length)
      .entries(hasData)

    partyData.forEach((d) => {
      d.name = data.parties.get(d.key).partyName
      d.shortName = data.parties.get(d.key).shortName
    })

    var partyMap = d3.map(partyData, (d) => d.key)
    partyData.sort((a,b) => d3.descending(a.values, b.values))
    var listSize = Math.ceil(partyMap.size()/2)
    var count = hasData.length
    var labSeats = partyMap.get('alp') ? partyMap.get('alp').values : 0
    var coalitionSeats = this.coalitionTotal(partyMap.entries())

    this.partyData2PP = [
      { name: 'Coalition', seats: coalitionSeats, party: 'coal', sprite: "turnbull"},
      { name: 'Labor', seats: labSeats, party: 'alp', sprite: "shorten"}
    ]

    this.renderData = {
      TOTAL_SEATS: this.totalSeats,
      MAJORITY_SEATS: Math.ceil(this.totalSeats/2) + 1,
      partyData: partyData,
      resultCount: count,
      partyListLeft: partyData.slice(0,listSize),
      partyListRight: partyData.slice(listSize)
    };

    this.renderData.twoParty = this.partyData2PP
    this.el.innerHTML = templateFn2PP(this.renderData);
  }

  senateRender(data) {
    var hasData = data.sheets[this.key].filter((d) => !(d[this.partyField] === ""))
    var count = hasData.length

    var partyData = d3.nest()
      .key((d) => d[this.partyField].toLowerCase())
      .rollup((leaves) => leaves.length)
      .entries(hasData)
   
    partyData.forEach((d) => {
      d.name = data.parties.get(d.key).partyName
      d.shortName = data.parties.get(d.key).shortName
    })

    var partyMap = d3.map(partyData, (d) => d.key)

    var senateData = []

    SENATE.forEach((d) => {
      var p = {}
      if (d === 'pending') {
        p.key = 'pending'
      }
      else if (d === 'other') {
        p.key = 'other'
        p.name = 'Others'
        p.shortName = 'Others'
      }
      else {
        var party = partyMap.get(d)
        p.key = d
        p.name = data.parties.get(d).partyName
        p.shortName = data.parties.get(d).shortName
        p.values = party ? party.values : 0
      }
      senateData.push(p)
    })

    var senateMap = d3.map(senateData, (d) => d.key)
    senateMap.get('other').values = d3.sum(partyData.filter((d) => !senateMap.has(d.key) && d.key !== 'lnp' && d.key !== 'clp'), (d) => d.values)
    senateMap.get('pending').values = this.totalSeats - count
    var lnpValue = partyMap.get('lnp') ? partyMap.get('lnp').values : 0
    var clpValue = partyMap.get('clp') ? partyMap.get('clp').values : 0
    senateMap.get('lib').values += lnpValue + clpValue
    partyData.sort((a,b) => d3.descending(a.values, b.values))
    var listSize = Math.ceil(partyMap.size()/2)

    var renderData = {
      TOTAL_SEATS: this.totalSeats,
      MAJORITY_SEATS: Math.ceil(this.totalSeats/2),
      partyData: senateMap.values(),
      resultCount: count,
      partyListLeft: partyData.slice(0,listSize),
      partyListRight: partyData.slice(listSize)
    };

    this.el.innerHTML = templateFn(renderData);
  }

  renderSprites() {
    this.sprites = {
        turnbull: new Sprite(this.el.querySelector(".seatstack__bar li #turnbull"), "turnbull"),
        shorten: new Sprite(this.el.querySelector(".seatstack__bar li #shorten"), "shorten")
    }

    if (this.partyData2PP[0].seats > this.partyData2PP[1].seats) {
      var winningCandidate = this.partyData2PP[0]
      var losingCandidate = this.partyData2PP[1]
    } else {
       var losingCandidate = this.partyData2PP[0]
      var winningCandidate = this.partyData2PP[1]
    }

    var winningSprite = winningCandidate.sprite
    var losingSprite = losingCandidate.sprite

    if ((winningCandidate.seats - losingCandidate.seats) > 5) {
      this.sprites[winningSprite].cheer()
      if (winningCandidate.seats >= this.renderData.MAJORITY_SEATS) {
        this.sprites[losingSprite].sadBlink()
      } else {
        this.sprites[losingSprite].neutralBlink()
      }
    } else {
      if (winningCandidate.seats >= this.renderData.MAJORITY_SEATS) {
        this.sprites[winningSprite].cheer()
        this.sprites[losingSprite].sadBlink()
      } else {
        this.sprites[winningSprite].neutralBlink()
        this.sprites[losingSprite].neutralBlink()
      }
    }
  }

  coalitionTotal(data) {
    return data.reduce((total, d) => (COALITION.indexOf(d.key) > -1) ? d.value.values + total : total, 0)
  }
}
