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

    predictions.sort((a,b) => b.timestamp - a.timestamp)

    console.log(predictions)

    for (var i = 0; i < predictions.length; i++) {

      //console.log(moment.utc(moment().diff(moment(predictions[i].timestamp,"DD/MM/YYYY HH:mm:ss"))).format("m"))

      predictions[i].announced = "Predicted" //(predictions[i].timestamp!="") ? moment.duration(moment.utc(moment().diff(moment(predictions[i].timestamp,"DD/MM/YYYY HH:mm:ss"))).format("m"), "minutes").humanize() : "Predicted" ;

      predictions[i].status = (predictions[i].prediction===predictions[i].incumbent) ? 'hold' : 'wins' ;

      predictions[i].label = (predictions[i].prediction!="IND") ? partyNames.get(predictions[i].prediction).partyName : predictions[i]["prediction-name"] ;

    }

    return predictions

  }

}
