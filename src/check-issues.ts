import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync, writeFileSync } from 'node:fs'
import nodemailer from 'nodemailer'

const execAsync = promisify(exec)
const config = JSON.parse(readFileSync('./config.json', 'utf-8'))
const state = JSON.parse(readFileSync('./state.json', 'utf-8'))

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

type Issue = {
  number: number
  title: string
  url: string
  createdAt: string
}

async function run() {
  const isDebug = process.env.DEBUG === 'true'
  const date = new Date()
  date.setDate(date.getDate() - 3)
  const dateLimit = date.toISOString().split('T')[0]

  for (const repo of config.repos) {
    await processRepo(repo, isDebug, dateLimit)
  }
}

async function processRepo(repo: string, isDebug: boolean, dateLimit: string) {
  try {
    const issues = await fetchIssues(repo, isDebug, dateLimit)
    const lastNotifiedId = state.lastNotifiedIds?.[repo] || 0
    const newIssues = issues.filter((i) => i.number > lastNotifiedId)

    if (newIssues.length > 0) {
      await notifyIssues(repo, newIssues)
      log('info', 'Notification email sent', { repo, count: newIssues.length })

      state.lastNotifiedIds = {
        ...state.lastNotifiedIds,
        [repo]: Math.max(...newIssues.map((i) => i.number)),
      }
      writeFileSync('./state.json', JSON.stringify(state, null, 2))
    } else {
      log('info', 'No issues to notify', { repo })
    }
  } catch (err: any) {
    log('error', 'Script failed for repo', { repo, error: err.message })
  }
}

async function notifyIssues(repo: string, issues: Issue[]) {
  const html = formatIssueListHtml(issues)
  await sendEmail(repo, html)
}

function formatIssueListHtml(issues: Issue[]): string {
  const formattedIssues = issues
    .map((i) => {
      const createdDate = new Date(i.createdAt)
      const ageDays = Math.floor(
        (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
      )
      return `<li>#${i.number} | ${createdDate.toISOString().split('T')[0]} | ${ageDays} days old | <a href="${i.url}">${escapeHtml(i.title.trim().replace(/\s+/g, ' '))}</a></li>`
    })
    .join('')

  return `<ul>${formattedIssues}</ul>`
}

async function sendEmail(repo: string, html: string) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.EMAIL_TO,
    subject: `gh-issue-notifier: ${repo}`,
    html: html,
  })
}

async function fetchIssues(repo: string, isDebug: boolean, dateLimit: string): Promise<Issue[]> {
  const repoFlag = `--repo ${repo}`
  const command = `gh issue list ${repoFlag} -s ${isDebug ? 'all --limit 50' : 'open'} --json number,title,url,createdAt`
  const { stdout } = await execAsync(command)
  const issues: Issue[] = JSON.parse(stdout)

  const filteredIssues = isDebug
    ? issues
    : issues.filter((i) => new Date(i.createdAt) < new Date(dateLimit))
  return filteredIssues.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

function log(level: 'info' | 'error', message: string, data?: object) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...data }))
}

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

run()
