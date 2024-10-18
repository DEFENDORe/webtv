// Author: Dan Ferguson (2024)

import { EventEmitter } from 'events'

type CallbackFunction<T> = (value: T) => void
type AsyncCallbackFunction<T> = (value: T) => Promise<void>

interface LineParserEvents {
  'error': CallbackFunction<Error> | AsyncCallbackFunction<Error>
  'done': CallbackFunction<void> | AsyncCallbackFunction<void>
  'lines': CallbackFunction<string[]> | AsyncCallbackFunction<string[]>
}

export declare interface LineParser {
  on: <U extends keyof LineParserEvents>(
    event: U, listener: LineParserEvents[U]
  ) => this

  emit: <U extends keyof LineParserEvents>(
    event: U, ...args: Parameters<LineParserEvents[U]>
  ) => boolean
}

export class LineParser extends EventEmitter {
  private reader: ReadableStreamDefaultReader<string>
  public fileSize: number
  private strBuffer = ''
  constructor (input: ReadableStream<Uint8Array>, size: number = 0) {
    super()
    this.reader = input.pipeThrough(new TextDecoderStream()).getReader()
    this.fileSize = size
  }
  private linesFromBuffer() {
    let indexOfFirstNewline = this.strBuffer.indexOf('\n')
    let lines: string[] = []
    while (indexOfFirstNewline !== -1) {
      let returnBeforeBreak = false
      if (indexOfFirstNewline !== 0) {
        returnBeforeBreak = this.strBuffer[indexOfFirstNewline - 1] === '\r'
      }
      const line = this.strBuffer.slice(0, returnBeforeBreak ? indexOfFirstNewline - 1 : indexOfFirstNewline)
      lines.push(line)
      this.strBuffer = this.strBuffer.slice(indexOfFirstNewline + 1)
      indexOfFirstNewline = this.strBuffer.indexOf('\n')
    }
    this.emit('lines', lines)
  }
  async parse() {
    while (true) {
      const { done, value } = await this.reader.read()
      if (done) {
        this.linesFromBuffer()
        this.emit('done')
        break;
      }
      this.strBuffer += value
      this.linesFromBuffer()
    }
  }

  async cancel() {
    return this.reader.cancel()
  }
}

export default LineParser