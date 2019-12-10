// @ts-check

const r = require("request");
const chalk = require("chalk");
const moment = require("moment");

const authToken = process.env["DT_BOT_AUTH_TOKEN"] || process.env["BOT_AUTH_TOKEN"] || process.env["AUTH_TOKEN"];
if (authToken === undefined) {
  throw new Error("Must set AUTH_TOKEN environment variable");
}

const headers = {
  Authorization: `TOKEN ${authToken}`,
  "user-agent": "@RyanCavanaugh/dt-mergebot Projects Lister",
  accept: "application/vnd.github.inertia-preview+json"
};

const mainQuery = `
query { 
  repository(name:"DefinitelyTyped", owner:"DefinitelyTyped") {
    name
    project(number: 4) {
      name

      columns(first:5) {
        nodes {

          name
          cards(last: 50) {
            nodes {
              id
              content {

                ... on PullRequest {
                  title

                  permalink
                  number

                  comments(last:1) {
                    nodes {
                      updatedAt
                    }
                  }
                  commits(last:1) {
                    nodes {
                      commit {
                        pushedDate
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`

const url = `https://api.github.com/graphql`;
r(url, { headers, method: "POST", body: JSON.stringify({ query: mainQuery }) }, (err, data) => {
  if (err) throw err;
  const result = JSON.parse(data.body).data;
  const project = result.repository.project
  const columns = project.columns.nodes

  columns.forEach(col => {
    const cards = col.cards.nodes
    const sortedByPriority = cards.sort((l, r) => getNewestDate(l) - getNewestDate(r))
    console.log("")
    console.log("## " + chalk.bold.blue(col.name))
    console.log(sortedByPriority.slice(0, 5).map(showCard).join(""))
  });
});

const getNewestDate = (card) => {
  const findHighestFrom = [card.content.comments.nodes[0].updatedAt, card.content.commits.nodes[0].commit.pushedDate]
  return findHighestFrom.map(d=> new Date(d)).sort((l, r) => r - l)[0]
}

const showCard = (card) => {
  return `
${chalk.bold("#" + card.content.number)} ${card.content.title}
${chalk.gray(card.content.permalink)} 
Last comment: ${dayDiff(card.content.comments.nodes[0].updatedAt)}. Last commit: ${dayDiff(card.content.commits.nodes[0].commit.pushedDate)}.
`
}

const dayDiff = (dateString) =>  moment(dateString).fromNow()

