import { Election } from './modules/election'

const key = "https://interactive.guim.co.uk/docsdata/1v_Ks8ZQxJv2vHt2DjYYf5UL9qAHgtuPlSrl2sOgVoz4.json";

let social = {

    title : "Live Australian election results",

    url : "https://www.theguardian.com/australia-news/ng-interactive/2019/apr/02/the-complete-2019-australian-federal-budget-choose-what-matters-to-you",

    fbImg : null,

    twImg : null,

    twHash : "#Election #auspol",

    message : "Track the latest federal election updates"

};

(async(url) => {
    try {
        let response = await fetch(url)
        let json = await response.json()
        let results = await json.sheets
        new Election(results, key, social)

    } catch(e) {
        console.log("Testing one, two, three", e)
    }

})(key)