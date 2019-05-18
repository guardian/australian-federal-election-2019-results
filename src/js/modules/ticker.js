import moment from 'moment'

export class Ticker {

	constructor() {


	}

  async render(data) {

    var results = await this.feed(data)

    return results;
    
  }

  feed(data) {

    var self = this

    var predictions = data.electorates.filter((d) => !(d.prediction === ""))

    var partyNames = new Map( data.partyNames.map( (item) => [item.partyCode, item]) )

    for (var i = 0; i < predictions.length; i++) {

      //console.log(moment.utc(moment().diff(moment(predictions[i].timestamp,"DD/MM/YYYY HH:mm:ss"))).format("m"))

      predictions[i].announced = "Predicted" //(predictions[i].timestamp!="") ? moment.duration(moment.utc(moment().diff(moment(predictions[i].timestamp,"DD/MM/YYYY HH:mm:ss"))).format("m"), "minutes").humanize() : "Predicted" ;

      predictions[i].status = (predictions[i].prediction===predictions[i].incumbent) ? 'hold' : 'wins' ;

      predictions[i].label = (predictions[i].prediction!="IND") ? partyNames.get(predictions[i].prediction).partyName : predictions[i]["prediction-name"] ;

    }

    var hastimestamp = predictions.filter( (item) => {

      if (item.timestamp!="") {

        item.unix = moment(item.timestamp, "MM-DD-YYYY HH:mm:ss").unix()

        return item

      }
      
    })

    hastimestamp.sort((a,b) => b.unix - a.unix)

    var others = predictions.filter( (item) => item.timestamp==="")

    var combined = [ ...hastimestamp, ...others ]

    return combined

  }

}
