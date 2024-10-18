// Author: Dan Ferguson (2024)

import { EventEmitter } from 'events'

import LineParser from './LineParser'

const ATTRIBS = [ // iptv related attributes
  'tvg-id',
  'tvg-name',
  'tvg-logo',
  'group-title'
]

export interface M3uItem {
  url: string
  title: string
  groupTitle: string
  tvgId: string
  tvgName: string
  tvgLogo: string
}

interface Progress {
  bytesRead: number
  parsed: number
  percent: number
  fileSize: number
}

type CallbackFunction<T> = (value: T) => void
type AsyncCallbackFunction<T> = (value: T) => Promise<void>

interface M3uParserEvents {
  'progress': CallbackFunction<Progress> | AsyncCallbackFunction<Progress>
  'error': CallbackFunction<Error> | AsyncCallbackFunction<Error>
  'done': CallbackFunction<void> | AsyncCallbackFunction<void>
  'item': CallbackFunction<M3uItem> | AsyncCallbackFunction<M3uItem>
  'items': CallbackFunction<M3uItem[]> | AsyncCallbackFunction<M3uItem[]>
}

export declare interface M3uParser {
  on: <U extends keyof M3uParserEvents>(
    event: U, listener: M3uParserEvents[U]
  ) => this

  emit: <U extends keyof M3uParserEvents>(
    event: U, ...args: Parameters<M3uParserEvents[U]>
  ) => boolean
}

export class M3uParser extends EventEmitter {
  constructor (input: ReadableStream, size: number = 0) {
    super()
    let bytesRead = 0
    let lastProgress = 0
    let parsed = 0

    let isOnFirstLine = true
    let abort = false
    let item: any = null

    const lineParser = new LineParser(input)

    lineParser.on('lines', (lines) => {
      let items: M3uItem[] = []
      
      lines.forEach((line) => {
        if (abort) return;
        bytesRead += line.length
        if (isOnFirstLine) {
          if (!line.includes('#EXTM3U')) {
            this.emit('error', new Error("Not a valid M3U file."))
            lineParser.cancel()
            abort = true
            return
          }
          isOnFirstLine = false
        }
        if (line[0] !== '#' && item !== null) {
          const newItem = {
            url: line,
            title: item.title || '',
            groupTitle: item['group-title'] || '',
            tvgId: item['tvg-id'] || '',
            tvgName: item['tvg-name'] || '',
            tvgLogo: item['tvg-logo'] || ''
          }
          this.emit('item', newItem)
          items.push(newItem)
          parsed++
          item = null
          return
        }
        if (line.includes('#EXTINF')) {
          const arr = line.split(',')
          item = { title: arr[arr.length - 1] }
          const arr2 = arr[0].split('"')
          for (let i = 0; i < arr2.length; i++) {
            for (const a of ATTRIBS) {
              if (arr2[i].toLowerCase().includes(a)) { item[a] = arr2[i + 1] }
            }
          }
        }
      })
      if (items.length > 0)
        this.emit('items', items)
      if (lastProgress + 100 <= Date.now()) {
        this.emit('progress', { bytesRead, parsed, percent: (bytesRead / size) * 100, fileSize: size })
        lastProgress = Date.now()
      }
    })

    lineParser.on('done', () => {
      if (isOnFirstLine && !abort) {
        this.emit('error', new Error('No M3U data to parse.'))
      } else {
        this.emit('progress', { bytesRead, parsed, percent: 100, fileSize: size })
        this.emit('done')
      }
    })

    lineParser.on('error', (error) => this.emit('error', error))

    lineParser.parse()
  }
}


export default M3uParser