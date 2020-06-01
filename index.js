require('dotenv').config()
const { Octokit } = require('@octokit/rest')
const axios = require('axios')

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  TR_USERNAME: username
} = process.env

const octokit = new Octokit({
  auth: `token ${githubToken}`
})

async function main () {
  if (!gistId || !githubToken || !username) {
    throw new Error('Please check your environment settings.')
  }

  const typeracerRequest = await axios({
    method: 'get',
    url: `https://data.typeracer.com/users?id=tr:${username}`
  }).catch((error) => {
    console.error(`typeracer-box ran into an issue getting your TypeRacer statistics: \n${error}`)
  })

  const { data } = typeracerRequest

  let gist
  try {
    gist = await octokit.gists.get({
      gist_id: gistId
    })
  } catch (error) {
    console.error(`typeracer-box ran into an issue getting your Gist:\n${error}`)
  }

  const lines = [
    `⌨️ ${data.name} | Best Race: ${Math.round(data.tstats.bestGameWpm)} WPM | Recent Average Ø ${Math.round(data.tstats.recentAvgWpm)} WPM`,
    'Recent races'
  ]

  for (let i = 0; i < data.tstats.recentScores.length; i++) {
    const wpm = Math.round(data.tstats.recentScores[i])
    const chart = generateBarChart(data.tstats.recentScores[i] * 100 / data.tstats.bestGameWpm, 40)

    lines.push([
      chart,
      `${wpm} WPM`.padStart(lines[0].length - chart.length)
    ].join(''))
  }

  try {
    const filename = Object.keys(gist.data.files)[0]
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: '⌨️ TypeRacer statistics',
          content: lines.join('\n')
        }
      }
    })
  } catch (error) {
    console.error(`Unable to update gist\n${error}`)
  }
}

function generateBarChart (percent, size) {
  const syms = '░▏▎▍▌▋▊▉█'

  const frac = Math.floor((size * 8 * percent) / 100)
  const barsFull = Math.floor(frac / 8)
  if (barsFull >= size) {
    return syms.substring(8, 9).repeat(size)
  }
  const semi = frac % 8

  return [
    syms.substring(8, 9).repeat(barsFull),
    syms.substring(semi, semi + 1)
  ].join('').padEnd(size, syms.substring(0, 1))
}

(async () => {
  await main()
})()
