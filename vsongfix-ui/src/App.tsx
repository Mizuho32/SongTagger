import { useEffect, useState, useRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import SongList from './SongList'
import {Song, AppState} from './interfaces'
import {Tab, TabItem} from './Tab'
import * as songUtils from './songUtils'


import ReactAudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';


function App() {
  const ident = location.search
  const urlParams = new URLSearchParams(location.search)
  const [songList, setSongList] = useState<Song[]>([]);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement>()
  const [artist, setArtist] = useState(urlParams.get("artist") || "")
  const [filename, setFilename] = useState(urlParams.get("filename") || "")
  const appState: AppState = {songList: songList, setSongList: setSongList, audioEl: audioEl, artist: artist, setArtist: setArtist, filename: filename, setFilename: setFilename}
  const player = useRef<ReactAudioPlayer>(null)

  useEffect(() => {
    // Get audio
    const tmp = player.current?.audio.current
    if (tmp) {
      setAudioEl(tmp)
    }

    songUtils.fetchDetections(appState)
  }, []);

  function toText() {
    return appState.songList.map(song => {
      return [song.start, song.end, song.title, song.artist].map(songUtils.escapeCSVValue).join(",")
    }).join("\n")
  }

  function loadButtonHandler(tagged: boolean) {
    const ret = confirm("現在のデータは破棄されます")
    if (ret) {
      songUtils.fetchDetections(appState, tagged)
    }
  }
  /*
  const clickState = {count: 0}
  const [count, setCount] = useState(clickState)
  */

  return (
    <>
      {/*
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((state) => ({count: state.count + 1}))}>
          count is {count.count} or {clickState.count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <button type="button" className="primary" onClick={()=>console.log(appState.songList)}>
        Click me!
      </button>
      */}
      
      <div id="main">
        <div id="tabs">
          <Tab defaultKey="mainTab">

            <TabItem tabKey="loadTab" label="データ読み込み">
              <div className='load controls' >
                <button type="button" className="load control" onMouseUp={_ => loadButtonHandler(false)}>
                  Load Detections
                </button>
                <button type="button" className="load control" onMouseUp={_ => loadButtonHandler(true)}>
                  Load Tagged
                </button>
              </div>
            </TabItem>

            <TabItem tabKey="mainTab" label="タグ付け">
              <SongList appState={appState} isMobile={false} />
            </TabItem>

            <TabItem tabKey="outputTab" label="データ出力">
              <textarea value={toText()} readOnly={true}></textarea>
            </TabItem>

          </Tab>
        </div>
        <div id="search"></div>
      </div>
      <footer>
        <div id="playerContainer">
          <ReactAudioPlayer ref={player} src={`/api/audio${ident}`} />
        </div>
      </footer>
    </>
  )
}



export default App