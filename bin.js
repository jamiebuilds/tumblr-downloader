#!/usr/bin/env node
'use strict'

let meow = require('meow')
let puppeteer = require('puppeteer-core')
let chromePaths = require('chrome-paths')
let got = require('got')
let path = require('path')
let fs = require('fs')
let { promisify } = require('util')
let querystring = require('querystring')
let pLimit = require('p-limit')
let pRetry = require('p-retry')
let downloadsFolder = require('downloads-folder')
let chalk = require('chalk')

let readFile = promisify(fs.readFile)
let writeFile = promisify(fs.writeFile)
let mkdir = promisify(fs.mkdir)
let stat = promisify(fs.stat)
let readdir = promisify(fs.readdir)
let unlink = promisify(fs.unlink)

let cli = meow({
  help: `
    Usage
      $ tumblr-downloader "<email>" "<password>"

    Options
      --page, -p <number>    Starting ?page=<number> (useful when restarting script)
      --dest, -d <filepath>  Folder to download into
      --url <url>            Paginated Tumblr URL to download from
      --concurrency          Number of Chromium tabs to run at the same time

    Examples

      Download all liked posts:
      $ tumblr-downloader "you@example.com" "hunter42"

      Download all blogged posts:
      $ tumblr-downloader "you@example.com" "hunter42" --url "https://tumblr.com/blog/<your-blog-name>"

      Download into specific folder:
      $ tumblr-downloader "you@example.com" "hunter42" --dest ~/path/to/folder

      Limit concurrency: (useful on low-powered machines)
      $ tumblr-downloader "you@example.com" "hunter42" --concurrency 4
  `,
	flags: {
		page: {
			type: 'number',
      alias: 'p',
      default: 0,
    },
    dest: {
      type: 'string',
      alias: 'd',
    },
    url: {
      type: 'string',
      default: 'https://tumblr.com/likes',
    },
    concurrency: {
      type: 'number',
      default: 10,
    },
	},
});

let email = cli.input[0]
let password = cli.input[1]
let startPage = cli.flags.page
let downloadsConfig = cli.flags.dest
let concurrency = cli.flags.concurrency
let basePath = cli.flags.url

if (!email || !password) {
  cli.showHelp()
  process.exit(1)
}

async function safeMkdir(dir) {
  try {
    await mkdir(dir)
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}

async function exists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch (err) {
    return false
  }
}

async function download(dir, url) {
  let name = querystring.escape(url)
  let filePath = path.join(dir, name)

  if (await exists(filePath)) {
    return
  }

  console.log(chalk.dim(`     downloading: ${chalk.italic(url)}`))

  await pRetry(() => {
    new Promise((resolve, reject) => {
      got.stream(url, { retry: 4, throwHttpErrors: false })
        .on('error', err => {
          console.error(err)
          resolve()
        })
        .pipe(fs.createWriteStream(filePath))
        .on('finish', resolve)
        .on('error', err => {
          console.error(err)
          fs.unlink(filePath, () => resolve)
        })
    })
  }, { retries: 3 })
}

async function makePageFaster(page) {
  await page.setRequestInterception(true)

  page.on('request', req => {
    if (
      req.resourceType() === 'image' ||
      req.resourceType() === 'video' ||
      req.resourceType() === 'font' ||
      !req.url().includes('tumblr.com') ||
      req.url().includes('yahoo.com') ||
      req.url() === 'https://www.tumblr.com/services/cslog'
    ) {
      req.abort()
    } else {
      req.continue()
    }
  })
}

async function main() {
  let started = Date.now()

  console.log(chalk.magenta.bold(
    '\n' +
    ' ------------------------------------------\n' +
    '|                                          |\n' +
    '|     WELCOME TO THE TUMBLR DOWNLOADER     |\n' +
    '|                                          |\n' +
    '|  (This is going to take a long time...)  |\n' +
    '|                                          |\n' +
    ' ------------------------------------------\n' +
    '\n'
  ))

  let downloadsPath;

  if (downloadsConfig) {
    downloadsPath = path.resolve(process.cwd(), downloadsConfig)
  } else {
    downloadsPath = path.join(downloadsFolder(), 'tumblr-downloads')
  }

  console.log(chalk.magenta('init:'), chalk.dim(`Ensuring folder exists: ${chalk.italic(downloadsPath)}`))
  await safeMkdir(downloadsPath)

  console.log(chalk.magenta('init:'), chalk.dim(`Launching browser`))
  let browser = await puppeteer.launch({
    userDataDir: path.resolve(__dirname, '.user-data'),
    executablePath: chromePaths.chrome
  })
  let page = await browser.newPage()
  let client = await page.target().createCDPSession();

  await makePageFaster(page)

  console.log(chalk.magenta('init:'), chalk.dim('Checking if logged in...'))
  await page.goto('https://tumblr.com/login', { waitUntil: 'networkidle2' })

  if (page.url() !== 'https://www.tumblr.com/dashboard') {
    console.log(chalk.magenta('init:'), chalk.dim('Not logged in. Logging in using credentials...'))
    await page.type('#signup_determine_email', email)
    await page.click('#signup_forms_submit')

    await page.waitFor(500)
    await page.waitFor('#signup_magiclink .magiclink_password_container .forgot_password_link');
    await page.click('#signup_magiclink .magiclink_password_container .forgot_password_link');
    await page.waitFor(500)

    await page.type('#signup_password', password)
    await page.click('#signup_forms_submit');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' })
  }

  console.log(chalk.magenta('init:'), chalk.dim('Logged in.'))

  await page.close()

  let currentIndex = startPage
  let emptyPages = 0
  let downloadLimit = pLimit(500)
  let promises = []

  async function next(page, poolIndex) {
    let prefix = chalk.cyan(`[${poolIndex}]`.padEnd(4));
    let url = `${basePath}?page=${currentIndex}`;
    currentIndex++
    console.log(prefix, chalk.dim(`Opening: ${chalk.italic(url)}`))

    await pRetry(async () => {
      await page.goto(url)
    }, { retries: 3 })

    if (await page.$('.no_posts_found')) {
      console.log(prefix, chalk.dim(`No posts found on: ${chalk.italic(url)}`))
      emptyPages++
    } else {
      emptyPages = 0
    }

    let sources = await page.$$eval('.post_media img, .post_media video > source', elements => {
      return elements.map(el => {
        let tagName = el.tagName.toLowerCase()
        if (tagName === 'source') {
          let type = el.type.replace('video/', '')
          if (type) {
            return `${el.src}.${type}`
          } else {
            return el.src
          }
        } else {
          return el.src
        }
      })
    })

    for (let source of sources) {
      promises.push(downloadLimit(() => {
        return download(downloadsPath, source)
      }))
    }

    if (emptyPages < 10) {
      return next(page, poolIndex)
    } else {
      console.log(prefix, chalk.green(`Closing page...`))
      page.close()
    }
  }

  console.log(chalk.magenta('init:'), chalk.dim('Creating resource pool...'))
  let pool = []
  for (let i = 0; i < concurrency; i++) {
    let page = await browser.newPage()
    await makePageFaster(page)
    pool.push(page)
  }

  console.log(chalk.magenta('init:'), chalk.dim('Ready.'))

  await Promise.all(pool.map(async (page, poolIndex) => {
    try {
      await next(page, poolIndex)
    } catch (err) {
      await page.screenshot({ path: path.join(downloadsPath, '__ERROR__.png') })
      throw err
    }
  }))

  console.log(chalk.magenta('teardown:'), chalk.dim('Shutting down browser...'))
  await browser.close()
  console.log(chalk.magenta('teardown:'), chalk.dim('Waiting for remaining downloads to complete...'))
  await Promise.all(promises)

  let completed = Date.now()
  let seconds = (completed - started) / 1000
  let rounded = Math.round(seconds * 100) / 100

  console.log(chalk.magenta('teardown:'), chalk.dim(`Completed in ${rounded}s.`))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
