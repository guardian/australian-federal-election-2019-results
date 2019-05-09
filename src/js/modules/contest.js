export class Contests {

	constructor(opts) {

		this.categories = opts.categories

	}

  async render(data) {

    var results = await this.ideas(data)

    return results;
    
  }

  ideas(data) {

    var self = this

    var blocks = this.categories.map( (item) => item.key)

    var posMap = new Map( data.positions.map( (item) => [item.party_or_candidate.toLowerCase(), item]) )

    var block

    var polarity = ["ALP","LIB"]

    var contests = []

    for (block in blocks) {

      var obj = {}
      obj.headline = self.categories[block].value
      obj.key = self.categories[block].key
      obj.bars = [{
        "aligned" : polarity[0],
        "text" : posMap.get(polarity[0].toLowerCase())[blocks[block]],
        "bar" : []
      },{
        "aligned" : polarity[1],
        "text" : posMap.get(polarity[1].toLowerCase())[blocks[block]],
        "bar" : []
      }]

      contests.push(obj)

    }

    return contests

  }

}
