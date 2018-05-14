require('dotenv').config()

const trueskill = require('trueskill')

const _ = require('lodash')
const mongo = require('./mongo')

const defaultSkill = [25, 25 / 3]

const getScore = scores => scores[0].p1 > scores[0].p2 ? [1, 2] : [2, 1]

const doTrueSkill = async () => {
  let { matches, players } = await mongo()

  players = _(players).map(player => _.merge({}, player, { skill: defaultSkill })).value()

  matches.forEach(match => {
    const player1Id = match._player1Id.toString()
    const player2Id = match._player2Id.toString()
    const player1 = _.find(players, player => player._id.toString() === player1Id)
    const player2 = _.find(players, player => player._id.toString() === player2Id)

    const score = getScore(match.score)

    const player1Skill = {
      skill: player1.skill,
      rank: score[0]
    }
    const player2Skill = {
      skill: player2.skill,
      rank: score[1]
    }

    trueskill.AdjustPlayers([player1Skill, player2Skill])

    const player1Index = _.findIndex(players, player => player._id.toString() === player1Id)
    const player2Index = _.findIndex(players, player => player._id.toString() === player2Id)

    players[player1Index].skill = player1Skill.skill
    players[player2Index].skill = player2Skill.skill
  })

  players = _(players).orderBy([p => p.skill[0]], ['desc']).value()

  // console.log(JSON.stringify(players))

  console.log(trueskill.ChanceOfWinning(_.find(players, player => player.handle === 'ChemicalX').skill, _.find(players, player => player.handle === 'Woodborg Ninja').skill))

  return process.exit(0)
}

doTrueSkill()
