import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync } from 'node:fs'
import nodemailer from 'nodemailer'

const execAsync = promisify(exec)
const config = JSON.parse(readFileSync('./config.json', 'utf-8'))

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

async function run() {
  const isDebug = process.env.DEBUG === 'true'
  const date = new Date()
  date.setDate(date.getDate() - 3)
  const dateLimit = date.toISOString().split('T')[0]

  for (const repo of config.repos) {
    try {
      const issues = await getIssues(repo, isDebug, dateLimit)

      if (issues.length > 0) {
        await sendNotification(repo, issues)
        log('info', 'Notification email sent', { repo, count: issues.length })
      } else {
        log('info', 'No issues to notify', { repo })
      }
    } catch (err: any) {
      log('error', 'Script failed for repo', { repo, error: err.message })
    }
  }
}

function log(level: 'info' | 'error', message: string, data?: object) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...data }))
}

async function getIssues(repo: string, isDebug: boolean, dateLimit: string) {
  const repoFlag = `--repo ${repo}`
  const command = `gh issue list ${repoFlag} -s ${isDebug ? 'all --limit 50' : 'open'} --json number,title,url,createdAt`
  const { stdout } = await execAsync(command)
  const issues: { number: number; title: string; url: string; createdAt: string }[] =
    JSON.parse(stdout)

  const filteredIssues = isDebug
    ? issues
    : issues.filter((i) => new Date(i.createdAt) < new Date(dateLimit))
  return filteredIssues.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

async function sendNotification(repo: string, issues: any[]) {
  const formattedIssues = issues
    .map((i) => {
      const createdDate = new Date(i.createdAt)
      const ageDays = Math.floor(
        (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
      )
      return `<li>#${i.number} | ${createdDate.toISOString().split('T')[0]} | ${ageDays} days old | <a href="${i.url}">${i.title.trim().replace(/\s+/g, ' ')}</a></li>`
    })
    .join('')

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.EMAIL_TO,
    subject: `gh-issue-notifier: ${repo}`,
    html: `<ul>${formattedIssues}</ul>`,
  })
}

run()
