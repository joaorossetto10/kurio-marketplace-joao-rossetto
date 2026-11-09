import { readFileSync, writeFileSync } from 'node:fs'

const directory = new URL('../docs/evidence/lighthouse/', import.meta.url)
const categories = ['performance', 'accessibility', 'best-practices', 'seo']
const metrics = {
  lcpMs: 'largest-contentful-paint',
  cls: 'cumulative-layout-shift',
  tbtMs: 'total-blocking-time',
}
const median = (values) => [...values].sort((a, b) => a - b)[1]
const summary = {
  tool: 'Lighthouse 13.6.0',
  environment:
    'Windows, Node 24.20.0, npm 11.16.0, Playwright Chromium 158, local Vite preview on 127.0.0.1:4173',
  conditions:
    'Demo build, MSW enabled, default scenario; mobile CLI defaults and --preset=desktop; headless Playwright Chromium',
  results: {},
}

for (const route of ['home', 'detail']) {
  for (const profile of ['mobile', 'desktop']) {
    const reports = [1, 2, 3].map((run) => {
      const file = `${route}-${profile}-${run}.report.json`
      const report = JSON.parse(readFileSync(new URL(file, directory), 'utf8'))
      if (report.runtimeError)
        throw new Error(`${file}: ${report.runtimeError.message}`)
      return { file, report }
    })
    const scores = Object.fromEntries(
      categories.map((category) => [
        category,
        median(
          reports.map(({ report }) =>
            Math.round(report.categories[category].score * 100),
          ),
        ),
      ]),
    )
    const medians = Object.fromEntries(
      Object.entries(metrics).map(([label, audit]) => [
        label,
        median(reports.map(({ report }) => report.audits[audit].numericValue)),
      ]),
    )
    summary.results[`${route}-${profile}`] = {
      scores,
      medians,
      reports: reports.map(({ file }) => file),
      meetsTargets:
        scores.performance >= 90 &&
        scores.accessibility >= 95 &&
        scores['best-practices'] >= 95 &&
        scores.seo >= 90,
    }
  }
}

writeFileSync(
  new URL('summary.json', directory),
  `${JSON.stringify(summary, null, 2)}\n`,
)
for (const [name, result] of Object.entries(summary.results)) {
  console.log(name, result.scores, result.medians, result.meetsTargets)
}
