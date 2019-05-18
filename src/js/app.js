import { Election } from './modules/election'
import loadJson from '../components/load-json/'

const key = "https://interactive.guim.co.uk/docsdata/1d3PX0uc-5KW9sOCaAwuLh2EX4ofLZjokLk1pmA2sRCE.json"; // 2019

let social = {

    title : "Live results for the 2019 Australian election: track the votes",

    url : "https://www.theguardian.com/australia-news/ng-interactive/2019/may/18/live-results-for-the-2019-australian-election-track-the-votes",

    fbImg : "",

    twImg : "",

    twHash : "#auvotes19 #ausvotes",

    message : "Live results for the 2019 Australian election: track the votes"

};

loadJson(`${key}?t=${new Date().getTime()}`)
  .then((json) => {
    new Election(json.sheets, key, social)
  })