[WebTV](https://defendore.github.io/webtv/dist/)
======
A web app for consuming IPTV via m3u and xmltv files. 

#### [Open App](https://defendore.github.io/webtv/dist/)
#### [Download App](https://github.com/DEFENDORe/webtv/releases)

### [Demo Video](https://youtu.be/Was9Yt03yF4)
[![Demo Video](https://img.youtube.com/vi/Was9Yt03yF4/0.jpg)](https://youtu.be/Was9Yt03yF4)

## Features
- Run locally, without a server. Just open the html file in a browser.
- Full EPG guide with responsive layout
- Apply group-title filters during m3u scan
- Both XML and M3U parsers are run inside Workers, as to not block UI
- Supports large xmltv and m3u files. (Tested with 300MB+ m3u and 20MB+ xml files)
- Add your M3U and/or XMLTV file(s) via File upload or URL
- Save URL's to LocalStorage; automatically scan file(s) on page refresh
- Uses [mpegts.js](https://github.com/xqq/mpegts.js/) and [hls.js](https://github.com/video-dev/hls.js) for playback


## Install
```
npm install
```

## Build
```
npm run build
```
The project is built to the `./dist` directory. Either host this directory or just open the `index.html` file.
## Development
```
npm run dev
```
