require('dotenv').config()

const Elo = require('arpad')
const _ = require('lodash')
const mongo = require('./mongo')

const range = {
  default: 15,
  elo2400: 10,
  game30: 25
}

const elo = new Elo()

const getKFactor = (elo, matches) => {
  if (elo >= 2400) return range.elo2400
  if (matches <= 30) return range.game30
  return range.default
}

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
  const playerMatchTracking = {}

  players = _(players).map(player => _.merge({}, player, { elo: 1000 })).value()

  matches.forEach(match => {
    // get winner and loser of match
    const winnerId = match._winnerId.toString()
    const loserId = match._loserId.toString()
    const winner = _.find(players, player => player._id.toString() === winnerId)
    const loser = _.find(players, player => player._id.toString() === loserId)

    // winner or loser not found (no challonge account), so don't update
    if (!winner || !loser) return

    // get number of matches played
    let winnerMatches = _.get(playerMatchTracking, winnerId, 0) + 1
    let loserMatches = _.get(playerMatchTracking, loserId, 0) + 1

    // update number of matches played
    playerMatchTracking[winnerId] = winnerMatches
    playerMatchTracking[loserId] = loserMatches

    // check which player won/lost
    let winnerPlayer
    let loserPlayer
    if (winnerId === match._player1Id.toString()) {
      winnerPlayer = 'p1'
      loserPlayer = 'p2'
    } else {
      winnerPlayer = 'p2'
      loserPlayer = 'p1'
    }

    // get current elo
    const winnerElo = winner.elo
    const loserElo = loser.elo

    // get k factor for winner/loser
    const winnerK = getKFactor(winnerElo, winnerMatches)
    const loserK = getKFactor(loserElo, loserMatches)

    const oddsWinner = elo.expectedScore(winnerElo, loserElo)
    const oddsLoser = elo.expectedScore(loserElo, winnerElo)

    // get new elo
    elo.setKFactor(winnerK)
    const newWinnerElo = elo.newRating(oddsWinner, getScore(match.score, winnerPlayer), winnerElo)

    elo.setKFactor(loserK)
    const newloserElo = elo.newRating(oddsLoser, getScore(match.score, loserPlayer), loserElo)

    const winnerIndex = _.findIndex(players, player => player._id.toString() === winnerId)
    const loserIndex = _.findIndex(players, player => player._id.toString() === loserId)
    players[winnerIndex].elo = newWinnerElo
    players[loserIndex].elo = newloserElo
  })

  players = _(players).orderBy(['elo'], ['desc']).value()

  console.log(JSON.stringify(players, null, 2))

  console.log(JSON.stringify(playerMatchTracking, null, 2))

  console.log(elo.expectedScore(_.find(players, player => player.handle === 'ChemicalX').elo, _.find(players, player => player.handle === 'Kubisa').elo))

  return process.exit(0)
}

doElo()
