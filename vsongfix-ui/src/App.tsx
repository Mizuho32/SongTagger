import { useEffect, useState, useRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import SongList from './SongList'
import {Song, AppState} from './interfaces'
import {Tab, TabItem} from './Tab'


import ReactAudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

import axios from "axios"

function App() {
  const ident = location.search
  const [songList, setSongList] = useState<Song[]>([]);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement>()
  const appState: AppState = {songList: songList, setSongList: setSongList, audioEl: audioEl}
  const player = useRef<ReactAudioPlayer>(null)

  useEffect(() => {
    const tmp = player.current?.audio.current
    if (tmp) {
      setAudioEl(tmp)
    }
    const fetchData = async () => {
      try {
        const results = await axios.get<Song[]>(`/api/detections${ident}`);
        if (results.status === 200) {

          console.log(results.data)
          setSongList(results.data);
        }
      } catch (error) {
        console.error("Error fetching data", error);
      }
    };

    fetchData();
  }, []);

  const clickState = {count: 0}
  const [count, setCount] = useState(clickState)

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
            <h1>Hello</h1>
          </TabItem>
          <TabItem tabKey="mainTab" label="タグ付け">
              <div id="songListContainer">
                <SongList appState={appState} isMobile={false} />
              </div>

          </TabItem>

          <TabItem tabKey="outputTab" label="データ出力">
            <h1>Output</h1>
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