// Author: Dan Ferguson (2024)

import axios from 'axios'

import { z } from 'zod'

const ACTIONS = [
  'get_live_categories',
  'get_live_streams',
  'get_vod_categories',
  'get_vod_streams',
  'get_series_categories',
  'get_series',
  'get_series_info',
  'get_vod_info',
  'get_short_epg',
  'get_simple_data_table'
] as const
const ENDPOINTS = [
  'player_api.php',
  'xmltv.php'
] as const

type Action = typeof ACTIONS[number]
type Endpoint = typeof ENDPOINTS[number]

interface XtreamQuery {
  endpoint: Endpoint
  action?: Action
  category_id?: number
  series_id?: number
  vod_id?: number
  stream_id?: number
  limit?: number
  offset?: number
  perPage?: number
}

const AuthResult = z.object({
  user_info: z.object({
    username: z.string(),
    password: z.string(),
    message: z.string(),
    auth: z.coerce.number().transform((v) => v > 0),
    status: z.string(),
    exp_date: z.coerce.number(),
    is_trial: z.coerce.number().transform((v) => v > 0),
    active_cons: z.coerce.number(),
    created_at: z.coerce.number(),
    max_connections: z.coerce.number(),
    allowed_output_formats: z.array(z.string())
  }),
  server_info: z.object({
    xui: z.coerce.boolean(),
    version: z.string(),
    revision: z.coerce.number(),
    url: z.string(),
    port: z.coerce.number(),
    https_port: z.coerce.number(),
    server_protocol: z.string(),
    rtmp_port: z.coerce.number(),
    timestamp_now: z.coerce.number(),
    time_now: z.coerce.date(),
    timezone: z.string()
  })
})

const CategoriesResult = z.array(z.object({
  category_id: z.coerce.number(),
  category_name: z.string(),
  parent_id: z.coerce.number()
}))

const LiveStreamsResult = z.array(z.object({
  num: z.coerce.number(),
  name: z.string(),
  stream_type: z.literal('live'),
  stream_id: z.coerce.number(),
  stream_icon: z.string(),
  epg_channel_id: z.string().nullable(),
  added: z.coerce.number(),
  custom_sid: z.string(),
  tv_archive: z.coerce.number(),
  direct_source: z.string(),
  tv_archive_duration: z.coerce.number(),
  category_id: z.coerce.number(),
  category_ids: z.array(z.coerce.number()),
  thumbnail: z.string()
}))

const VodStreamsResult = z.array(z.object({
  num: z.coerce.number(),
  name: z.string(),
  title: z.string(),
  year: z.coerce.number(),
  stream_type: z.literal('movie'),
  stream_id: z.coerce.number(),
  stream_icon: z.string(),
  rating: z.coerce.number(),
  rating_5based: z.coerce.number(),
  added: z.coerce.number(),
  category_id: z.coerce.number(),
  category_ids: z.array(z.coerce.number()),
  container_extension: z.string().nullable(),
  custom_sid: z.string(),
  direct_source: z.string()
}))

const SeriesResult = z.array(z.object({
  num: z.coerce.number(),
  name: z.string(),
  title: z.string(),
  year: z.coerce.number(),
  stream_type: z.literal('series'),
  series_id: z.coerce.number(),
  cover: z.string().nullable(),
  plot: z.string().nullable(),
  cast: z.string().nullable(),
  director: z.string().nullable(),
  genre: z.string().nullable(),
  release_date: z.string().nullable(),
  releaseDate: z.string().nullable(),
  last_modified: z.coerce.number(),
  rating: z.coerce.number(),
  rating_5based: z.coerce.number(),
  backdrop_path: z.array(z.string()),
  youtube_trailer: z.string().nullable(),
  episode_run_time: z.coerce.number(),
  category_id: z.coerce.number(),
  category_ids: z.array(z.coerce.number())
}))

const VodInfoResult = z.object({
  info: z.object({
    kinopoisk_url: z.string(),
    tmdb_id: z.coerce.number(),
    name: z.string(),
    o_name: z.string(),
    cover_big: z.string(),
    movie_image: z.string(),
    release_date: z.string().optional(),
    episode_run_time: z.coerce.number(),
    youtube_trailer: z.string(),
    director: z.string(),
    actors: z.string(),
    cast: z.string(),
    description: z.string(),
    plot: z.string(),
    age: z.string(),
    mpaa_rating: z.string(),
    rating_count_kinopoisk: z.coerce.number(),
    country: z.string(),
    genre: z.string(),
    backdrop_path: z.array(z.string()).optional(),
    duration_secs: z.coerce.number(),
    duration: z.string(),
    bitrate: z.coerce.number(),
    rating: z.coerce.number(),
    releasedate: z.string().nullable(),
    subtitles: z.array(z.any()).optional()
  }),
  movie_data: z.object({
    stream_id: z.coerce.number(),
    name: z.string(),
    title: z.string(),
    year: z.coerce.number(),
    added: z.coerce.number(),
    category_id: z.coerce.number(),
    category_ids: z.array(z.coerce.number()),
    container_extension: z.string(),
    custom_sid: z.string(),
    direct_source: z.string()
  }).optional()
})

const SeriesInfoResult = z.object({
  seasons: z.array(z.object({
    air_date: z.string(),
    episode_count: z.coerce.number(),
    id: z.coerce.number(),
    name: z.string(),
    overview: z.string(),
    season_number: z.coerce.number(),
    vote_average: z.coerce.number(),
    cover: z.string(),
    cover_big: z.string()
  })),
  info: z.object({
    name: z.string(),
    title: z.string(),
    year: z.coerce.number(),
    cover: z.string(),
    plot: z.string(),
    cast: z.string(),
    director: z.string().nullable(),
    genre: z.string(),
    release_date: z.string(),
    releaseDate: z.string(),
    last_modified: z.coerce.number(),
    rating: z.coerce.number(),
    rating_5based: z.coerce.number(),
    backdrop_path: z.array(z.string()),
    youtube_trailer: z.string(),
    episode_run_time: z.coerce.number(),
    category_id: z.coerce.number(),
    category_ids: z.array(z.coerce.number())
  }),
  episodes: z.record(z.coerce.number(), z.array(z.object({
    id: z.coerce.number(),
    episode_num: z.coerce.number(),
    title: z.string(),
    container_extension: z.string(),
    info: z.union([z.object({
      tmdb_id: z.coerce.number(),
      release_date: z.string(),
      plot: z.string(),
      duration_secs: z.coerce.number(),
      duration: z.string(),
      bitrate: z.coerce.number(),
      rating: z.coerce.number(),
      season: z.coerce.number(),
      cover_big: z.string().nullable(),
      movie_image: z.string().nullable()
    }), z.string().transform(() => null) ]),
    subtitles: z.array(z.any()),
    custom_sid: z.string(),
    added: z.coerce.number(),
    season: z.coerce.number(),
    direct_source: z.string()
  })))
})

const ShortEpgResult = z.object({
  epg_listings: z.array(z.object({
    id: z.coerce.number(),
    epg_id: z.coerce.number(),
    channel_id: z.string(),
    title: z.string().transform(decodeBase64),
    description: z.string().transform(decodeBase64),
    start: z.coerce.date(),
    stop: z.coerce.date(),
    end: z.coerce.number(),
    start_timestamp: z.coerce.number(),
    stop_timestamp: z.coerce.number(),
  }))
})

const AllEpgResult = z.object({
  epg_listings: z.array(z.object({
    id: z.coerce.number(),
    epg_id: z.coerce.number(),
    channel_id: z.string(),
    title: z.string().transform(decodeBase64),
    description: z.string().transform(decodeBase64),
    start: z.coerce.date(),
    end: z.coerce.date(),
    start_timestamp: z.coerce.number(),
    stop_timestamp: z.coerce.number(),
    lang: z.string(),
    now_playing: z.coerce.number(),
    has_archive: z.coerce.number()
  }))
})

function decodeBase64(value: string)  {
  if (/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/.test(value)) {
    return atob(value)
  } else return value
}

class XtreamApi {
  private baseURL: string
  private auth: { username: string, password: string }

  private async query({ endpoint, action, category_id, series_id, vod_id, stream_id, limit, offset, perPage }: XtreamQuery) {
    let href = `${this.baseURL}/${endpoint}?username=${this.auth.username}&password=${this.auth.password}`
    if (action !== undefined) href += `&action=${action}`
    if (category_id !== undefined) href += `&category_id=${category_id}`
    if (series_id !== undefined) href += `&series_id=${series_id}`
    if (vod_id !== undefined) href += `&vod_id=${vod_id}`
    if (stream_id !== undefined) href += `&stream_id=${stream_id}`
    if (limit !== undefined) href += `&limit=${limit}`
    if (offset !== undefined) href += `&params[offset]=${offset}`
    if (perPage !== undefined) href += `&params[items_per_page]=${perPage}`
    return axios.get(href).then((res) => res.data).catch(() => null)
  }

  constructor(baseURL: string, auth: { username: string, password: string }) {
    this.baseURL = baseURL
    this.auth = auth
  }
  async Auth() {
    const result = await this.query({ endpoint: 'player_api.php' })
    return AuthResult.parseAsync(result)
  }
  // Categories
  async GetLiveCategories() {
    const results = await this.query({ endpoint: 'player_api.php', action: 'get_live_categories' })
    return CategoriesResult.parseAsync(results)
  }
  async GetVodCategories() {
    const results = await this.query({ endpoint: 'player_api.php', action: 'get_vod_categories' })
    return CategoriesResult.parseAsync(results)
  }
  async GetSeriesCategories() {
    const results = await this.query({ endpoint: 'player_api.php', action: 'get_series_categories' })
    return CategoriesResult.parseAsync(results)
  }


  // Streams and Series
  async GetLiveStreams(category_id?: number){
    const results = await this.query({ endpoint: 'player_api.php', action: 'get_live_streams', category_id })
    return LiveStreamsResult.parseAsync(results)
  }

  async GetVodStreams(category_id?: number){
    const results = await this.query({ endpoint: 'player_api.php', action: 'get_vod_streams', category_id })
    return VodStreamsResult.parseAsync(results)
  }

  async GetSeries(category_id?: number){
    const results = await this.query({ endpoint: 'player_api.php', action: 'get_series', category_id })
    return SeriesResult.parseAsync(results)
  }


  async GetSeriesInfo(series_id: number) {
    const result = await this.query({ endpoint: 'player_api.php', action: 'get_series_info', series_id })
    return SeriesInfoResult.parseAsync(result)
  }
  async GetVodInfo(vod_id: number) {
    const result = await this.query({ endpoint: 'player_api.php', action: 'get_vod_info', vod_id })
    if (result.info !== undefined && Array.isArray(result.info) && result.info.length === 0) {
      return null
    }
    return VodInfoResult.parseAsync(result)
  }

  async GetLiveEpg(stream_id?: number, limit?: number) {
    const result = await this.query({ endpoint: 'player_api.php', action: 'get_short_epg', stream_id, limit })
    return ShortEpgResult.parseAsync(result)
  }

  async GetAllEpg(stream_id?: number) {
    const result = await this.query({ endpoint: 'player_api.php', action: 'get_simple_data_table', stream_id })
    return AllEpgResult.parseAsync(result)
  }

  async GetXmltv() {
    const result = await this.query({ endpoint: 'xmltv.php' })
    return result
  }

}

export default XtreamApi