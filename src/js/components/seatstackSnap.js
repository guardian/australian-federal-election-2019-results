import template2PP from './templates/seatstack2PP.html!text'
import swig from 'swig'
import d3 from 'd3'

const templateFn2PP = swig.compile(template2PP)
const COALITION = ['lib', 'lnp', 'nat', 'clp']

export class Seatstack {
  constructor(el, opts) {
    this.el = el;
    this.totalSeats = opts.totalSeats
    this.key = opts.key
    this.partyField = opts.partyField
    this.twoParty  = opts.twoParty
  }
  render(data) {
    data.parties = d3.map(data.sheets['partyNames'], (d) => d.partyCode.toLowerCase())
    var hasData = data.sheets[this.key].filter((d) => !(d[this.partyField] === ""))

    var partyData = d3.nest()
      .key((d) => d[this.partyField].toLowerCase())
      .rollup((leaves) => leaves.length)
      .entries(hasData)

    var count = hasData.length

    var partyMap = d3.map(partyData, (d) => d.key)

    if (!partyMap.has('lib')) { partyMap.set('lib', {}) }
    
    partyData.forEach((d) => {
      d.name = data.parties.get(d.key).partyName
      d.shortName = data.parties.get(d.key).shortName
    })

    var labSeats = partyMap.get('alp') ? partyMap.get('alp').values : 0
    var libValue = partyMap.get('lib') ? partyMap.get('lib').values : 0
    var lnpValue = partyMap.get('lnp') ? partyMap.get('lnp').values : 0
    var clpValue = partyMap.get('clp') ? partyMap.get('clp').values : 0
    partyMap.get('lib').values = libValue + lnpValue + clpValue

    partyMap.remove('lnp')
    partyMap.remove('clp')
    var listSize = Math.ceil(partyMap.size()/2)
    var pending = 0

    var partyData2PP = [
      { name: 'Coalition', seats: this.combineTotal(partyMap.entries(), COALITION), party: 'coal', sprite: "turnbull"},
      { name: 'Labor', seats: labSeats, party: 'alp', sprite: "shorten"}
    ]

    var renderData = {
      TOTAL_SEATS: this.totalSeats,
      MAJORITY_SEATS: Math.ceil(this.totalSeats/2) + 1,
      // partyData: partyMap.values(),
      resultCount: count,
      partyListLeft: partyMap.values().slice(0,listSize),
      partyListRight: partyMap.values().slice(listSize)
    };

    renderData.twoParty = partyData2PP
    this.el.innerHTML = templateFn2PP(renderData);


    this.sprites = {
        turnbull: this.el.querySelector(".seatstack__bar li #turnbull"),
        shorten: this.el.querySelector(".seatstack__bar li #shorten")
    }

    if (partyData2PP[0].seats > partyData2PP[1].seats) {
      var winningCandidate = partyData2PP[0]
      var losingCandidate = partyData2PP[1]
    } else {
       var losingCandidate = partyData2PP[0]
      var winningCandidate = partyData2PP[1]
    }

    var winningSprite = winningCandidate.sprite
    var losingSprite = losingCandidate.sprite

    if ((winningCandidate.seats - losingCandidate.seats) > 5) {
      this.sprites[winningSprite].className = "sprite happy"
      if (winningCandidate.seats >= renderData.MAJORITY_SEATS) {
        this.sprites[losingSprite].className = "sprite sad"
      } else {
        this.sprites[losingSprite].className = "sprite"
      }
    } else {
      this.sprites[winningSprite].className = "sprite"
      this.sprites[losingSprite].className = "sprite"
    }
   }

  combineTotal(data, partyList) {
    var total = data.reduce((total, d) => (partyList.indexOf(d.key) > -1) ? d.value.values + total : total, 0)
    return isNaN(total) ? 0 : total
  }
}
