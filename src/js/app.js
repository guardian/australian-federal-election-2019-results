import { Election } from './modules/election'
import loadJson from '../components/load-json/'

//const key = "https://interactive.guim.co.uk/docsdata/1v_Ks8ZQxJv2vHt2DjYYf5UL9qAHgtuPlSrl2sOgVoz4.json"; // 2016

const key = "https://interactive.guim.co.uk/docsdata/1d3PX0uc-5KW9sOCaAwuLh2EX4ofLZjokLk1pmA2sRCE.json"; // 2019

let social = {

    title : "Live Australian election results",

    url : "https://www.theguardian.com/australia-news/ng-interactive/2019/apr/02/the-complete-2019-australian-federal-budget-choose-what-matters-to-you",

    fbImg : null,

    twImg : null,

    twHash : "#Election #auspol",

    message : "Track the latest federal election updates"

};

loadJson(`${key}?t=${new Date().getTime()}`)
  .then((json) => {
    new Election(json.sheets, key, social)
  })