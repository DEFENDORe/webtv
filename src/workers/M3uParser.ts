// Worker

// Author: Dan Ferguson (2024)

import M3uParser from "../lib/M3uParser"

onmessage = async function (event) {

  console.log('WORKER: Started parsing M3U file')

  let size = event.data instanceof File ? event.data.size : 0

  const readableStream = event.data instanceof File ? event.data.stream() : await fetch(event.data).then((res) => { 
    size = Number(res.headers.get('content-length')) || 0
    return res.body
  }).catch(() => null)

  if (readableStream === null) {
    postMessage({ event: 'error', error: new Error("Failed to open ReadableStream") })
    return
  }

  const m3uParser = new M3uParser(readableStream, size)
  m3uParser.on('items', (items) => {
    postMessage({ event: 'items', items })
  })
  m3uParser.on('done', () => {
    postMessage({ event: 'done' })
    console.log('WORKER: Finished parsing M3U file')
  })
  m3uParser.on('progress', (progress) => {
    postMessage({ event: 'progress', progress })
  })
  m3uParser.on('error', (error) => {
    postMessage({ event: 'error', error })
  })

}