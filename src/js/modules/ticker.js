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

    for (var i = 0; i < predictions.length; i++) {

      predictions[i].announced = (predictions[i].timestamp!="") ? moment(predictions[i].timestamp, 'DD-MM-YYYY h:mm:ss').fromNow() : "Predicted" ;

      predictions[i].status = (predictions[i].prediction===predictions[i].incumbent) ? 'hold' : 'wins' ;

      predictions[i].label = (predictions[i].prediction!="IND") ? partyNames.get(predictions[i].prediction).partyName : predictions[i]["prediction-name"] ;

    }

    return predictions

  }

}
