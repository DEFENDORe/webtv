// Worker

// Author: Dan Ferguson (2024)

import { XmltvParser, SimpleProgramme } from "../lib/XmltvParser"

onmessage = async function (event) {

  console.log('WORKER: Started parsing XMLTV file')

  let size = event.data instanceof File ? event.data.size : 0

  // unique-number header used to prevent browser cache
  const readableStream = event.data instanceof File ? event.data.stream() : await fetch(event.data, { method: 'GET', headers: { 'unique-number': `${ Math.random() }` }}).then((res) => {
    size = Number(res.headers.get('content-length')) || 0
    return res.body
  }).catch(() => null)

  if (readableStream === null) {
    postMessage({ event: 'error', error: new Error("Failed to open ReadableStream") })
    return
  }

  const parser = new XmltvParser(readableStream, size, true)
  const programmeBuf: SimpleProgramme[] = []
  parser.on('programme', (programme) => {
    programmeBuf.push(programme as SimpleProgramme)
    if (programmeBuf.length >= 200) {
      const programmes = programmeBuf.splice(0, programmeBuf.length)
      postMessage({ event: 'programmes', programmes })
    }
    
  })
  parser.on('done', async () => {
    const programmes = programmeBuf.splice(0, programmeBuf.length)
    if (programmes.length > 0)
      postMessage({ event: 'programmes', programmes })
    postMessage({ event: 'done' })
    console.log('WORKER: Finished parsing XMLTV file')
  })
  parser.on('progress', (progress) => {
    postMessage({ event: 'progress', progress })
  })
  parser.on('error', (error) => {
    postMessage({ event: 'error', error })
  })
  await parser.Parse()
}