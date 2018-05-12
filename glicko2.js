require('dotenv').config()

const glicko2 = require('glicko2')
const _ = require('lodash')
const mongo = require('./mongo')

const settings = {
  // tau : "Reasonable choices are between 0.3 and 1.2, though the system should
  //      be tested to decide which value results in greatest predictive accuracy."
  tau: 0.5,
  // rating : default rating
  rating: 1000,
  // rd : Default rating deviation
  //     small number = good confidence on the rating accuracy
  rd: 200,
  // vol : Default volatility (expected fluctation on the player rating)
  vol: 0.06
}

const ranking = new glicko2.Glicko2(settings)

const defaultRanking = ranking.makePlayer()

const getScore = (scores) => {
  const total = scores[0].p1 + scores[0].p2
  let wins
  wins = scores[0].p1

  if (total === 0) {
    return 0.5
  }
  return wins / total
}

const doGlicko = async () => {
  let { matches, players } = await mongo()

  players = _(players).map(player => _.merge({}, player, { glickoRating: defaultRanking.getRating(), glickoRd: defaultRanking.getRd(), glickoVol: defaultRanking.getVol() })).value()

  matches.forEach(match => {
    const player1Id = match._player1Id.toString()
    const player2Id = match._player2Id.toString()
    const player1 = _.find(players, player => player._id.toString() === player1Id)
    const player2 = _.find(players, player => player._id.toString() === player2Id)

    const player1Glicko = ranking.makePlayer(player1.glickoRating, player1.glickoRd, player1.glickoVol)
    const player2Glicko = ranking.makePlayer(player2.glickoRating, player2.glickoRd, player2.glickoVol)

    ranking.updateRatings([[player1Glicko, player2Glicko, getScore(match.score)]])

    const player1Index = _.findIndex(players, player => player._id.toString() === player1Id)
    const player2Index = _.findIndex(players, player => player._id.toString() === player2Id)

    players[player1Index].glickoRating = player1Glicko.getRating()
    players[player1Index].glickoRd = player1Glicko.getRd()
    players[player1Index].glickoVol = player1Glicko.getVol()

    players[player2Index].glickoRating = player2Glicko.getRating()
    players[player2Index].glickoRd = player2Glicko.getRd()
    players[player2Index].glickoVol = player2Glicko.getVol()
  })

  players = _(players).orderBy(['glickoRating'], ['desc']).value()
  console.log(JSON.stringify(players))
  return process.exit(0)
}

doGlicko()
