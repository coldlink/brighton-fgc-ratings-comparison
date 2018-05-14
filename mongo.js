const _ = require('lodash')
const mongojs = require('mongojs')
const db = mongojs(process.env.MONGODB_URI, ['matches', 'players', 'tournaments'])

module.exports = async () => {
  let tournaments
  try {
    // 5a42a36344520034dbd111b3 - blazblue
    // 5a42a35a44520034dbd1108f - sfv
    tournaments = await new Promise((resolve, reject) => {
      db.tournaments.find({
        _gameId: mongojs.ObjectId('5a42a35a44520034dbd1108f'),
        dateEnd: { $type: 9 }
      }, { _id: true }, (err, tournaments) => {
        if (err) return reject(err)
        return resolve(tournaments.map(tournament => tournament._id))
      })
    })
  } catch (error) {
    throw error
  }

  let matches
  try {
    matches = await new Promise((resolve, reject) => {
      db.matches.find({
        _tournamentId: {
          $in: tournaments
        }
      }, { challongeMatchObj: false }, (err, matches) => {
        if (err) return reject(err)
        return resolve(matches)
      })
    })
    matches = _(matches).orderBy(['endDate'], ['asc']).value()
  } catch (error) {
    throw error
  }

  let players
  try {
    const playerIds = _([..._(matches).map(match => match._player1Id).value(), ..._(matches).map(match => match._player2Id).value()]).uniqBy(id => id.toString()).value()
    players = await new Promise((resolve, reject) => {
      db.players.find({
        _id: {
          $in: playerIds
        },
        challongeUsername: {
          $exists: true
        }
      }, { _id: true, handle: true }, (err, players) => {
        if (err) return reject(err)
        return resolve(players)
      })
    })
  } catch (error) {
    throw error
  }

  return { tournaments, matches, players }
}
