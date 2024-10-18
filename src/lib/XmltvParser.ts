// Author: Dan Ferguson (2024)

import { EventEmitter } from 'events'
import { SaxesParser, SaxesTagPlain } from 'saxes'
import moment from 'moment'

interface TV {
  date?: string
  'source-info-url'?: string
  'source-info-name'?: string
  'source-data-url'?: string
  'generator-info-name'?: string
  'generator-info-url'?: string
}

export interface Channel {
  id: string
  'display-name': TextValue[]
  icon?: Icon[]
  url?: Url[]
}

export interface Programme {
  start: string
  stop?: string
  channel: string
  title: TextValue[]
  'sub-title'?: TextValue[]
  desc?: TextValue[]
  credits?: Credits
  date?: string
  category?: TextValue[]
  keyword?: TextValue[]
  language?: TextValue
  'orig-language'?: TextValue
  length?: Length
  icon?: Icon[]
  url?: Url[]
  country?: TextValue[]
  'episode-num'?: EpisodeNum[]
  video?: Video
  audio?: Audio
  'previously-shown'?: PreviouslyShown
  premiere?: TextValue
  'last-chance'?: TextValue
  new?: boolean
  subtitles?: Subtitles[]
  rating?: Rating[]
  'star-rating'?: StarRating[]
  review?: Review[]
  image?: Image[]
  'pdc-start'?: string
  'vps-start'?: string
  showview?: string
  videoplus?: string
  clumpidx?: string
}

interface TextValue {
  value: string
  lang?: string
}

interface Icon {
  src: string
  width?: string
  height?: string
}

interface Url {
  value: string
  system?: string
}

interface Credits {
  director?: Person[]
  actor?: Actor[]
  writer?: Person[]
  adapter?: Person[]
  producer?: Person[]
  composer?: Person[]
  editor?: Person[]
  presenter?: Person[]
  commentator?: Person[]
  guest?: Person[]
}

interface Person extends WithUrl, WithImage {
  value: string
}

interface Actor extends Person {
  role?: string
  guest?: 'yes' | 'no'
}

interface Length {
  value: string
  units: 'seconds' | 'minutes' | 'hours'
}

interface EpisodeNum {
  value: string
  system?: string
}

interface Video {
  present?: string
  colour?: string
  aspect?: string
  quality?: string
}

interface Audio {
  present?: string
  stereo?: string
}

interface PreviouslyShown {
  start?: string
  channel?: string
}

interface Subtitles {
  language?: TextValue
  type?: 'teletext' | 'onscreen' | 'deaf-signed'
}

interface Rating {
  value: string
  system?: string
  icon?: Icon[]
}

interface StarRating extends Rating { }

interface Review {
  value: string
  type: 'text' | 'url'
  lang?: string
  source?: string
  reviewer?: string
}

interface WithUrl {
  url?: Url[]
}

interface WithImage {
  image?: Image[]
}

interface Image {
  value: string
  type?: 'poster' | 'backdrop' | 'still' | 'person' | 'character'
  size?: '1' | '2' | '3'
  orient?: 'P' | 'L'
  system?: string
}

interface Progress {
  bytesRead: number
  programmesParsed: number
  channelsParsed: number
  percent: number
  fileSize: number
}

export interface SimpleProgramme {
  channel: string
  start: number
  stop?: number
  date?: string,
  title: string,
  secondaryTitle?: string,
  description?: string,
  isNew?: boolean
}

type CallbackFunction<T> = (value: T) => void
type AsyncCallbackFunction<T> = (value: T) => Promise<void>

interface XmltvParserEvents {
  'error': CallbackFunction<Error> | AsyncCallbackFunction<Error>
  'done': CallbackFunction<void> | AsyncCallbackFunction<void>
  'progress': CallbackFunction<Progress> | AsyncCallbackFunction<Progress>
  'tv': CallbackFunction<TV> | AsyncCallbackFunction<TV>
  'channel': CallbackFunction<Channel> | AsyncCallbackFunction<Channel>
  'programme': CallbackFunction<Programme | SimpleProgramme> | AsyncCallbackFunction<Programme | SimpleProgramme>
}

export declare interface XmltvParser {
  on: <U extends keyof XmltvParserEvents>(
    event: U, listener: XmltvParserEvents[U]
  ) => this

  emit: <U extends keyof XmltvParserEvents>(
    event: U, ...args: Parameters<XmltvParserEvents[U]>
  ) => boolean
}

export class XmltvParser extends EventEmitter {

  
  static SimplifyProgramme(programme: Programme): SimpleProgramme {
    return {
      channel: programme.channel,
      start: moment(programme.start, 'YYYYMMDDHHmmss Z', false).valueOf(),
      stop: programme.stop ? moment(programme.stop, 'YYYYMMDDHHmmss Z', false).valueOf() : undefined,
      date: programme.date,
      title: programme.title[0].value,
      secondaryTitle: programme['sub-title'] === undefined || programme['sub-title'].length < 1 ? undefined : programme['sub-title'][0].value,
      description: programme.desc === undefined || programme.desc.length < 1 ? undefined : programme.desc[0].value,
      isNew: programme.new
    }
  }
  

  private readonly stack: Array<SaxesTagPlain>
  private currentChannel: Channel | null = null
  private currentProgramme: Programme | null = null
  private channelsParsed: number = 0
  private programmesParsed: number = 0
  private reader: ReadableStreamDefaultReader<string>
  private parser: SaxesParser
  private bytesRead = 0
  private size = 0
  private lastProgress = 0
  private simplify: boolean
  private abort: boolean = false

  constructor (input: ReadableStream<Uint8Array>, size: number = 0, simplify: boolean = false) {
    super()
    this.stack = []
    this.reader = input.pipeThrough(new TextDecoderStream()).getReader()
    this.size = size
    this.simplify = simplify
    this.parser = new SaxesParser()
    this.parser.on('opentag', (tag: SaxesTagPlain) => this.onTagOpen(tag))
    this.parser.on('text', (text) => this.onTagText(text))
    this.parser.on('closetag', (tag: SaxesTagPlain) => this.onTagClose(tag))
    this.parser.on('error', (err) => this.onError(err))
    this.parser.on('end', () => this.onEnd())
  }

  async Parse() {
    while(true) {
      if (this.abort) {
        this.parser.close()
        this.reader.cancel()
        return
      }
      const chunk = await this.reader.read()
      this.bytesRead += chunk.value?.length || 0
      if (Date.now() > this.lastProgress + 100) {
        this.lastProgress = Date.now()
        this.emit('progress', { bytesRead: this.bytesRead, percent: this.bytesRead / this.size * 100, channelsParsed: this.channelsParsed, programmesParsed: this.programmesParsed, fileSize: this.size })
      }
      if (chunk.done) {
        return this.parser.close()
      }
      this.parser.write(chunk.value)
    }
  }

  private onError (err: any): void {
    if (this.abort) 
      return
    this.abort = true
    //console.error(err)
    this.emit('error', err)
  }

  private onEnd (): void {
    this.emit('progress', { bytesRead: this.bytesRead, percent: 100, channelsParsed: this.channelsParsed, programmesParsed: this.programmesParsed, fileSize: this.size })
    this.emit('done')
  }

  private onTagOpen (node: SaxesTagPlain): void {
    if (this.abort) 
      return
    this.stack.push(node)
    switch (node.name) {
      case 'tv': {
        const tv: TV = {
          date: typeof node.attributes.date === 'string' ? node.attributes.date : undefined,
          'source-info-url': typeof node.attributes['source-info-url'] === 'string' ? node.attributes['source-info-url'] : undefined,
          'source-info-name': typeof node.attributes['source-info-name'] === 'string' ? node.attributes['source-info-name'] : undefined,
          'source-data-url': typeof node.attributes['source-data-url'] === 'string' ? node.attributes['source-data-url'] : undefined,
          'generator-info-name': typeof node.attributes['generator-info-name'] === 'string' ? node.attributes['generator-info-name'] : undefined,
          'generator-info-url': typeof node.attributes['generator-info-url'] === 'string' ? node.attributes['generator-info-url'] : undefined
        }
        this.emit('tv', tv)
        break
      }
      case 'channel':
        if (typeof node.attributes.id !== 'string') {
          this.currentChannel = null
          return
        }
        this.currentChannel = { id: node.attributes.id, 'display-name': [] }
        break
      case 'programme':
        if (typeof node.attributes.channel !== 'string' || typeof node.attributes.start !== 'string') {
          this.currentProgramme = null
          break
        }
        this.currentProgramme = {
          channel: node.attributes.channel,
          start: node.attributes.start,
          title: [],
          stop: typeof node.attributes.stop === 'string' ? node.attributes.stop : undefined,
          'pdc-start': typeof node.attributes['pdc-start'] === 'string' ? node.attributes['pdc-start'] : undefined,
          'vps-start': typeof node.attributes['vps-start'] === 'string' ? node.attributes['vps-start'] : undefined,
          showview: typeof node.attributes.showview === 'string' ? node.attributes.showview : undefined,
          videoplus: typeof node.attributes.videoplus === 'string' ? node.attributes.videoplus : undefined,
          clumpidx: typeof node.attributes.clumpidx === 'string' ? node.attributes.clumpidx : undefined
        }
        break
      case 'icon': {
        if (typeof node.attributes.src !== 'string') return
        if (this.stack.length - 2 < 0) return
        const parentNode = this.stack[this.stack.length - 2]
        if (this.currentChannel !== null && parentNode.name === 'channel') {
          if (this.currentChannel.icon === undefined) this.currentChannel.icon = []
          this.currentChannel.icon.push({
            src: node.attributes.src,
            height: typeof node.attributes.height === 'string' ? node.attributes.height : undefined,
            width: typeof node.attributes.width === 'string' ? node.attributes.width : undefined
          })
        } else if (this.currentProgramme !== null && parentNode.name === 'programme') {
          if (this.currentProgramme.icon === undefined) this.currentProgramme.icon = []
          this.currentProgramme.icon.push({
            src: node.attributes.src,
            height: typeof node.attributes.height === 'string' ? node.attributes.height : undefined,
            width: typeof node.attributes.width === 'string' ? node.attributes.width : undefined
          })
        } else if (this.currentProgramme !== null && parentNode.name === 'rating' && this.currentProgramme.rating !== undefined) {
          const rating = this.currentProgramme.rating[this.currentProgramme.rating.length - 1]
          if (rating.icon === undefined) rating.icon = []
          rating.icon.push({
            src: node.attributes.src,
            height: typeof node.attributes.height === 'string' ? node.attributes.height : undefined,
            width: typeof node.attributes.width === 'string' ? node.attributes.width : undefined
          })
        } else if (this.currentProgramme !== null && parentNode.name === 'star-rating' && this.currentProgramme['star-rating'] !== undefined) {
          const rating = this.currentProgramme['star-rating'][this.currentProgramme['star-rating'].length - 1]
          if (rating.icon === undefined) rating.icon = []
          rating.icon.push({
            src: node.attributes.src,
            height: typeof node.attributes.height === 'string' ? node.attributes.height : undefined,
            width: typeof node.attributes.width === 'string' ? node.attributes.width : undefined
          })
        }
        break
      }
      case 'star-rating':
      case 'rating': {
        if (this.currentProgramme === null) return
        if (this.currentProgramme[node.name] === undefined) this.currentProgramme[node.name] = []
        this.currentProgramme[node.name]?.push({
          system: typeof node.attributes.system === 'string' ? node.attributes.system : undefined,
          value: ''
        })
        break
      }
      case 'new':
        if (this.currentProgramme === null) return
        this.currentProgramme.new = true
        break
      case 'previously-shown':
        if (this.currentProgramme === null) return
        this.currentProgramme['previously-shown'] = {
          start: typeof node.attributes.start === 'string' ? node.attributes.start : undefined,
          channel: typeof node.attributes.channel === 'string' ? node.attributes.channel : undefined
        }
        break
      case 'credits':
        if (this.currentProgramme === null) return
        this.currentProgramme.credits = {}
        break
      case 'actor':
        if (this.currentProgramme === null || this.currentProgramme.credits === undefined) return
        if (this.currentProgramme.credits.actor === undefined) this.currentProgramme.credits.actor = []
        this.currentProgramme.credits.actor.push({
          value: '',
          guest: node.attributes.guest === 'yes' || node.attributes.guest === 'no' ? node.attributes.guest as 'yes' | 'no' : undefined,
          role: typeof node.attributes.role === 'string' ? node.attributes.role : undefined
        })
        break
      case 'director':
      case 'writer':
      case 'adapter':
      case 'producer':
      case 'composer':
      case 'editor':
      case 'presenter':
      case 'commentator':
      case 'guest': {
        if (this.currentProgramme === null || this.currentProgramme.credits === undefined) return
        let items = this.currentProgramme.credits[node.name]
        if (items === undefined) items = []
        items.push({ value: '' })
        this.currentProgramme.credits[node.name] = items
        break
      }
      case 'video':
        if (this.currentProgramme === null) return
        this.currentProgramme.video = {}
        break
      case 'audio':
        if (this.currentProgramme === null) return
        this.currentProgramme.audio = {}
        break
      case 'subtitles':
        if (this.currentProgramme === null) return
        if (this.currentProgramme.subtitles === undefined) this.currentProgramme.subtitles = []
        this.currentProgramme.subtitles.push({
          type: node.attributes.type === 'teletext' || node.attributes.type === 'onscreen' || node.attributes.type === 'deaf-signed' ? node.attributes.type as 'teletext' | 'onscreen' | 'deaf-signed' : undefined
        })
    }
  }

  private onTagText (text: string): void {
    if (this.abort) 
      return
    const node: SaxesTagPlain = this.stack[this.stack.length - 1]

    if (node === undefined)
      return

    switch (node.name) {
      case 'display-name':
        if (this.currentChannel === null) return
        this.currentChannel['display-name'].push({
          value: text,
          lang: typeof node.attributes.lang === 'string' ? node.attributes.lang : undefined
        })
        break
      case 'url':
        if (this.currentChannel !== null) {
          if (this.currentChannel.url === undefined) this.currentChannel.url = []
          this.currentChannel.url.push({
            value: text,
            system: typeof node.attributes.system === 'string' ? node.attributes.system : undefined
          })
        } else if (this.currentProgramme !== null) {
          if (this.stack.length - 2 < 0 || this.currentProgramme === null || this.currentProgramme.credits === undefined) return
          const parentNode = this.stack[this.stack.length - 2]
          switch (parentNode.name) {
            case 'director':
            case 'actor':
            case 'writer':
            case 'adapter':
            case 'producer':
            case 'composer':
            case 'editor':
            case 'presenter':
            case 'commentator':
            case 'guest': {
              const creditItems = this.currentProgramme.credits[parentNode.name]
              if (creditItems === undefined) return
              const item = creditItems[creditItems.length - 1]
              if (item.url === undefined) item.url = []
              item.url.push({
                value: text,
                system: typeof node.attributes.system === 'string' ? node.attributes.system : undefined
              })
              break
            }
          }
        }
        break
      case 'title':
      case 'sub-title':
      case 'desc':
      case 'category':
      case 'keyword':
      case 'country': {
        if (this.currentProgramme === null) return
        if (this.currentProgramme[node.name] === undefined) this.currentProgramme[node.name] = []
        const textItems = this.currentProgramme[node.name]
        if (textItems === undefined) return
        textItems.push({
          value: text,
          lang: typeof node.attributes.lang === 'string' ? node.attributes.lang : undefined
        })
        break
      }
      case 'premiere':
      case 'last-chance':
      case 'orig-language':
        if (this.currentProgramme === null) return
        this.currentProgramme[node.name] = {
          value: text,
          lang: typeof node.attributes.lang === 'string' ? node.attributes.lang : undefined
        }
        break
      case 'language': {
        if (this.stack.length - 2 < 0 || this.currentProgramme === null) return
        const parentNode = this.stack[this.stack.length - 2]
        if (parentNode.name === 'programme') {
          this.currentProgramme.language = {
            value: text,
            lang: typeof node.attributes.lang === 'string' ? node.attributes.lang : undefined
          }
        } else if (parentNode.name === 'subtitles') {
          if (this.currentProgramme.subtitles === undefined) return
          this.currentProgramme.subtitles[this.currentProgramme.subtitles.length - 1].language = {
            value: text,
            lang: typeof node.attributes.lang === 'string' ? node.attributes.lang : undefined
          }
        }
        break
      }
      case 'date':
        if (this.currentProgramme === null) return
        this.currentProgramme.date = text
        break
      case 'episode-num':
        if (this.currentProgramme === null) return
        if (this.currentProgramme['episode-num'] === undefined) this.currentProgramme['episode-num'] = []
        this.currentProgramme['episode-num'].push({
          value: text,
          system: typeof node.attributes.system === 'string' ? node.attributes.system : undefined
        })
        break
      case 'review':
        if (this.currentProgramme === null) return
        if (node.attributes.type !== 'text' && node.attributes.type !== 'url') return
        if (this.currentProgramme.review === undefined) this.currentProgramme.review = []
        this.currentProgramme.review.push({
          value: text,
          type: node.attributes.type as 'text' | 'url',
          source: typeof node.attributes.source === 'string' ? node.attributes.source : undefined,
          reviewer: typeof node.attributes.reviewer === 'string' ? node.attributes.reviewer : undefined,
          lang: typeof node.attributes.lang === 'string' ? node.attributes.lang : undefined
        })
        break
      case 'length':
        if (this.currentProgramme === null) return
        if (node.attributes.units !== 'seconds' && node.attributes.units !== 'minutes' && node.attributes.units !== 'hours') return
        this.currentProgramme.length = {
          value: text,
          units: node.attributes.units as "seconds" | "minutes" | "hours"
        }
        break
      case 'director':
      case 'actor':
      case 'writer':
      case 'adapter':
      case 'producer':
      case 'composer':
      case 'editor':
      case 'presenter':
      case 'commentator':
      case 'guest': {
        if (this.currentProgramme === null || this.currentProgramme.credits === undefined) return
        const items = this.currentProgramme.credits[node.name]
        if (items === undefined) return
        items[items.length - 1].value = text
        break
      }
      case 'image': {
        if (this.stack.length - 2 < 0 || this.currentProgramme === null || this.currentProgramme.credits === undefined) return
        const parentNode = this.stack[this.stack.length - 2]
        switch (parentNode.name) {
          case 'programme': {
            if (this.currentProgramme === null) return
            if (this.currentProgramme.image === undefined) this.currentProgramme.image = []
            this.currentProgramme.image.push({
              value: text,
              type: node.attributes.type === 'poster' || node.attributes.type === 'backdrop' || node.attributes.type === 'still' || node.attributes.type === 'person' || node.attributes.type === 'character' ? node.attributes.type as 'poster' | 'backdrop' | 'still' | 'person' : undefined,
              size: node.attributes.size === '1' || node.attributes.size === '2' || node.attributes.size === '3' ? node.attributes.size as '1' | '2' | '3' : undefined,
              orient: node.attributes.orient === 'P' || node.attributes.orient === 'L' ? node.attributes.orient as 'P' | 'L' : undefined,
              system: typeof node.attributes.system === 'string' ? node.attributes.system : undefined
            })
            break
          }
          case 'director':
          case 'actor':
          case 'writer':
          case 'adapter':
          case 'producer':
          case 'composer':
          case 'editor':
          case 'presenter':
          case 'commentator':
          case 'guest': {
            const items = this.currentProgramme.credits[parentNode.name]
            if (items === undefined) return
            const item = items[items.length - 1]
            if (item.image === undefined) item.image = []
            item.image.push({
              value: text,
              type: node.attributes.type === 'poster' || node.attributes.type === 'backdrop' || node.attributes.type === 'still' || node.attributes.type === 'person' || node.attributes.type === 'character' ? node.attributes.type as "poster" | "backdrop" | "still" | "person" | "character" : undefined,
              size: node.attributes.size === '1' || node.attributes.size === '2' || node.attributes.size === '3' ? node.attributes.size as '1' | '2' | '3' : undefined,
              orient: node.attributes.orient === 'P' || node.attributes.orient === 'L' ? node.attributes.orient as 'P' | 'L' : undefined,
              system: typeof node.attributes.system === 'string' ? node.attributes.system : undefined
            })
            break
          }
        }
        break
      }
      case 'present':
        if (this.currentProgramme === null || this.stack.length - 2 < 0) return
        if (this.stack[this.stack.length - 2].name === 'audio' && this.currentProgramme.audio !== undefined) {
          this.currentProgramme.audio.present = text
        } else if (this.stack[this.stack.length - 2].name === 'video' && this.currentProgramme.video !== undefined) {
          this.currentProgramme.video.present = text
        }
        break
      case 'colour':
      case 'aspect':
      case 'quality':
        if (this.currentProgramme === null || this.currentProgramme.video === undefined) return
        this.currentProgramme.video[node.name] = text
        break
      case 'stereo':
        if (this.currentProgramme === null || this.currentProgramme.audio === undefined) return
        this.currentProgramme.audio[node.name] = text
        break
      case 'value': {
        if (this.currentProgramme === null) return
        if (this.stack.length - 2 < 0) return
        const parentNode = this.stack[this.stack.length - 2]
        if (parentNode.name === 'rating') {
          if (this.currentProgramme.rating === undefined) return
          this.currentProgramme.rating[this.currentProgramme.rating.length - 1].value = text
        } else if (parentNode.name === 'star-rating') {
          if (this.currentProgramme['star-rating'] === undefined) return
          this.currentProgramme['star-rating'][this.currentProgramme['star-rating'].length - 1].value = text
        }
        break
      }
    }
  }

  private onTagClose (tag: SaxesTagPlain): void {
    if (this.abort) 
      return
    this.stack.pop()
    switch (tag.name) {
      case 'channel':
        this.emit('channel', this.currentChannel!)
        this.channelsParsed++
        this.currentChannel = null
        break
      case 'programme':
        this.emit('programme', this.simplify ? XmltvParser.SimplifyProgramme(this.currentProgramme!) : this.currentProgramme!)
        this.programmesParsed++
        this.currentProgramme = null
        break
    }
  }
}

export default XmltvParser
