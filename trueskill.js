require('dotenv').config()

const trueSkill = require('com.izaakschroeder.trueskill').create()
const _ = require('lodash')
const mongo = require('./mongo')

const getScore = (scores, player) => {
  const total = scores[0].p1 + scores[0].p2
  let wins

  wins = scores[0].p1
  if (total === 0) {
    return 0.5
  }
  return wins / total
}

const doTrueSkill = async () => {
  let { matches, players } = await mongo()

  players = _(players).map(player => _.merge({}, player, { rating: trueSkill.createRating() })).value()

  matches.forEach(match => {
    const player1Id = match._player1Id.toString()
    const player2Id = match._player2Id.toString()
    const player1 = _.find(players, player => player._id.toString() === player1Id)
    const player2 = _.find(players, player => player._id.toString() === player2Id)

    const player1Rating = player1.rating
    const player2Rating = player2.rating
    const score = getScore(match.score)

    const newRatings = trueSkill.update([[player1Rating], [player2Rating]], [score, 1 - score])

    const player1Index = _.findIndex(players, player => player._id.toString() === player1Id)
    const player2Index = _.findIndex(players, player => player._id.toString() === player2Id)

    players[player1Index].rating = newRatings[0][0]
    players[player2Index].rating = newRatings[1][0]
  })

  players = _(players).orderBy(['rating.mu'], ['desc']).value()
  // console.log(JSON.stringify(players))

  // kubisa vs dillips
  console.log(trueSkill.winChances([[_.find(players, player => player.handle === 'Daniel_Dillips').rating], [_.find(players, player => player.handle === 'Kubisa').rating]]))

  return process.exit(0)
}

doTrueSkill()
