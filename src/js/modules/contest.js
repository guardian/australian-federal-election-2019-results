export class Contests {

	constructor(opts) {

		this.categories = opts.categories

    this.parties = ["ALP","LIB","LNP","NAT","CLP","GRN","SFF","ON","KAP","UAP","CA"]

	}

  async render(data) {

    var results = await this.ideas(data)

    return results;
    
  }

  contains(a, b) {

      if (Array.isArray(b)) {
          return b.some(x => a.indexOf(x) > -1);
      }
      
      return a.indexOf(b) > -1;
  }

  ideas(data) {

    var self = this

    // Map of positions from the Googledoc positions sheet

    var posMap = new Map( data.positions.map( (item) => [item.party_or_candidate.toLowerCase(), item]) )

    // Predicted candidates from the Googledoc electorates sheet

    var predictions = data.electorates.filter((d) => !(d.prediction === ""))

    var predicted = []

    for (var i = 0; i < predictions.length; i++) {

        let candidte = (predictions[i].prediction==="IND") ? predictions[i]["prediction-name"] : predictions[i].prediction

        predicted.push(candidte)

    }

    // Count of predicted candidates by party.

    var count = predicted.reduce( (acc, political) => {

        let tally = acc[political] ? acc[political] + 1 : 1 ;

        return {
            ...acc,
            [ political ] : tally,
        };

    }, {})

    var countMap = new Map(Object.entries(count))

    //console.log(countMap)

    // Create the JSON object

    var polarity = ["ALP","LIB"]

    var contests = []

    var block

    var blocks = this.categories.map( (item) => item.key)

    /*
    Climate change
    Healthcare
    Tax
    Immigration
    Education
    Industrial relations
    */

    var winners = Array.from(countMap.keys())

    // Loop through each category and assign parties to the appropriate group

    for (block in blocks) {

     //console.log(self.categories[block].value)

      var ALP = []
      var LIB = []
      var t1 = 0
      var t2 = 0
      var unknown = 0

      // Loop throgh the list of candidates and assign them to thier political grouping

      let alpPOS = posMap.get('alp')[self.categories[block].key]

      let libPOS = posMap.get('lib')[self.categories[block].key]

      for (var i = 0; i < winners.length; i++) {

        let count = countMap.get( winners[i])

        let percentage = ( count / 84 ) * 100

        let position = posMap.get( winners[i].toLowerCase() )[self.categories[block].key]

        let party = winners[i].toLowerCase()

        if (!self.contains(self.parties, party.toUpperCase())) {

          party = 'ind'

        }

        let obj = { party: party, count: count, percentage: percentage }

        if (position === alpPOS) {

          ALP.push(obj)

        } else if (position === libPOS) {

          LIB.push(obj)

        } else {

          unknown = unknown + count

        }

      }

      ALP.sort((a,b) => a.count - b.count)

      LIB.sort((a,b) => a.count - b.count)

      t1 = ALP.reduce(function (accumulator, party) {
        return accumulator + party.count;
      }, 0);

      t2 = LIB.reduce(function (accumulator, party) {
        return accumulator + party.count;
      }, 0);

      var obj = {}
      obj.headline = self.categories[block].value
      obj.key = self.categories[block].key
      obj.bars = [{
        "aligned" : polarity[0],
        "text" : posMap.get(polarity[0].toLowerCase())[blocks[block]],
        "bar" : ALP,
        "total" : t1
      },{
        "aligned" : polarity[1],
        "text" : posMap.get(polarity[1].toLowerCase())[blocks[block]],
        "bar" : LIB,
        "total" : t2
      }]
      obj.unknown = unknown

      contests.push(obj)

    }

    return contests

  }

}
