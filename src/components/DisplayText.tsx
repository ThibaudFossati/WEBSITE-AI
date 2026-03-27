import { Fragment } from 'react'
import type { DisplayCaseMode, DisplayEmphasisMode } from '../lib/typography'

const STOP_WORDS = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'et', 'ou', 'au', 'aux', 'en',
  'the', 'and', 'of', 'for', 'to', 'a', 'an',
])

function applyCase(input: string, mode: DisplayCaseMode): string {
  if (mode === 'uppercase') return input.toLocaleUpperCase('fr-FR')
  if (mode === 'lowercase') return input.toLocaleLowerCase('fr-FR')
  return input
}

function pickImportantIndex(words: string[]): number {
  const scores = words.map((word, index) => {
    const clean = word.toLocaleLowerCase('fr-FR').replace(/[^a-zA-ZÀ-ÿ]/g, '')
    if (!clean) return { index, score: -1 }
    if (STOP_WORDS.has(clean)) return { index, score: 0 }
    return { index, score: clean.length }
  })

  const best = scores.reduce((top, item) => (item.score > top.score ? item : top), { index: 0, score: -1 })
  return best.index
}

function renderLine(line: string, caseMode: DisplayCaseMode, emphasisMode: DisplayEmphasisMode, lineKey: number) {
  const tokens = line.split(/(\s+)/)
  const wordIndexes = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.trim().length > 0)
    .map(({ index }) => index)

  const wordTokens = wordIndexes.map(index => tokens[index])
  const importantWord = emphasisMode === 'important-italic' ? pickImportantIndex(wordTokens) : -1

  return tokens.map((token, tokenIndex) => {
    const mappedWordIndex = wordIndexes.indexOf(tokenIndex)
    const text = applyCase(token, caseMode)

    if (mappedWordIndex === importantWord) {
      return (
        <em key={`${lineKey}-${tokenIndex}`} style={{ fontStyle: 'italic' }}>
          {text}
        </em>
      )
    }

    return <Fragment key={`${lineKey}-${tokenIndex}`}>{text}</Fragment>
  })
}

export default function DisplayText({
  text,
  caseMode,
  emphasisMode,
}: {
  text: string
  caseMode: DisplayCaseMode
  emphasisMode: DisplayEmphasisMode
}) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {renderLine(line, caseMode, emphasisMode, lineIndex)}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </Fragment>
      ))}
    </>
  )
}
