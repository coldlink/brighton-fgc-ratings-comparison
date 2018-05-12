require('dotenv').config()

const Elo = require('arpad')
const _ = require('lodash')
const mongo = require('./mongo')

const range = {
  default: 24
}

const elo = new Elo(range)

const getScore = (scores, player) => {
  const total = scores[0].p1 + scores[0].p2
  let wins
  if (player === 'p1') {
    wins = scores[0].p1
  } else {
    wins = scores[0].p2
  }

  if (total === 0) {
    return 0.5
  }
  return wins / total
}

const doElo = async () => {
  let { matches, players } = await mongo()

  players = _(players).map(player => _.merge({}, player, { elo: 1000 })).value()

  matches.forEach(match => {
    const winnerId = match._winnerId.toString()
    const loserId = match._loserId.toString()
    const winner = _.find(players, player => player._id.toString() === winnerId)
    const loser = _.find(players, player => player._id.toString() === loserId)

    let winnerPlayer
    let loserPlayer
    if (winnerId === match._player1Id.toString()) {
      winnerPlayer = 'p1'
      loserPlayer = 'p2'
    } else {
      winnerPlayer = 'p2'
      loserPlayer = 'p1'
    }

    const winnerElo = winner.elo
    const loserElo = loser.elo

    const oddsWinner = elo.expectedScore(winnerElo, loserElo)
    const oddsLoser = elo.expectedScore(loserElo, winnerElo)

    const newWinnerElo = elo.newRating(oddsWinner, getScore(match.score, winnerPlayer), winnerElo)
    const newloserElo = elo.newRating(oddsLoser, getScore(match.score, loserPlayer), loserElo)

    const winnerIndex = _.findIndex(players, player => player._id.toString() === winnerId)
    const loserIndex = _.findIndex(players, player => player._id.toString() === loserId)
    players[winnerIndex].elo = newWinnerElo
    players[loserIndex].elo = newloserElo
  })

  players = _(players).orderBy(['elo'], ['desc']).value()

  console.log(JSON.stringify(players))
  return process.exit(0)
}

doElo()
