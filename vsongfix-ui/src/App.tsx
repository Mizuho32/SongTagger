import React, { useEffect, useState, useRef } from 'react'
import { FaDownload, FaEdit, FaPollH, FaList, FaAngleDoubleLeft, FaAngleDoubleRight, FaAngleRight } from 'react-icons/fa';

import './App.css'
import SongList from './SongList'
import StreamList from './StreamList'
import {Song, Stream, AppState} from './interfaces'
import {Tab, TabItem} from './Tab'
import * as songUtils from './songUtils'
import { initSession, lock, unlockWhenClose } from './utils'

import ReactAudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import Spinner from 'react-spinner-material';
import { useCookies } from "react-cookie";
import { isIOS, isMobile, isMobileSafari } from "react-device-detect";
import { PiDropSimple } from 'react-icons/pi';

const uiLabels = {
  "load": isMobile ? (<FaDownload />) : "データ読み込み",
  "main": isMobile ? (<FaEdit />) : "タグ付け",
  "output": isMobile ? (<FaPollH />) : "出力",
  "streams": isMobile ? (<FaList />) : "歌枠リスト",
}

function App() {
  //const ident = location.search
  const urlParams = new URLSearchParams(location.search)
  const artistParam = urlParams.get("artist")
  if (!artistParam) return

  const [songList, setSongList] = useState<Song[]>([])
  const [streamList, setStreamList] = useState<Stream[]>([])
  const [audioEl, setAudioEl] = useState<HTMLAudioElement>()
  let isBuffering2 = false
  const [isBuffering, setBuffering] = useState(isBuffering2)
  const [cookies, setCookie, removeCookie] = useCookies();
  const [artist, setArtist] = useState("")
  const [filename, setFilename] = useState("")
  const [showSearchResult, setShowSearchResult] = useState(false)

  const appState: AppState = {songList: songList, setSongList: setSongList, audioEl: audioEl, artist: artist, setArtist: setArtist, filename: filename, setFilename: setFilename, streamList: streamList, setStreamList: setStreamList, cookies: cookies, setCookie: setCookie, removeCookie: removeCookie, showSearchResult: showSearchResult, setShowSearchResult: setShowSearchResult}

  const player = useRef<ReactAudioPlayer>(null)


  useEffect(() => {

    // Get audio
    const tmp = player.current?.audio.current
    if (tmp) {

      const ident = initSession(appState, artistParam, urlParams.get("filename"), tmp)
      //alert(appState.cookies.sessionID)
      ident.then(_ => {
        setAudioEl(tmp)

        tmp.onwaiting = _ => {
          setBuffering(true)
          isBuffering2 = true
        }

        tmp.onplaying = _ => {
          setBuffering(false)
          isBuffering2 = false
        }
      })

    } else {
      alert("Failed to init audio")
    }
      /*tmp.onprogress = (e: ProgressEvent) => {
        if (isBuffering2) {
          const buffered = tmp.buffered;
          console.log("Progreess")
          for (let i = 0; i < buffered.length; i++) {
            console.log(`Buffered range ${i}: ${buffered.start(i)} to ${buffered.end(i)}`);
          }
        }
      }*/

  }, [player]);

  // When appState updated
  useEffect(() => {
    if (isMobile) {
      window.onpagehide = () => {
        unlockWhenClose(appState)
      }
    } else {
      window.onbeforeunload = async (event) => {
        console.log("onbeforeunload", appState)
        await lock(appState.artist, appState.filename, appState.cookies.sessionID, false)
        //unlockWhenClose(appState)
        event.preventDefault()
      }

    }
  }, [appState])

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

  /*
  if (isMobile) {
    return (<></>)
  } else {
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
          {isBuffering && (
            <div className="spinnerContainer">
              <Spinner color="#AAAAAA" stroke={10} radius={140} visible={true} />
            </div>)}
          <div id="tabs" className={isMobile ? "mobile" : "desktop"}>

            <Tab defaultKey="mainTab">

              <TabItem tabKey="loadTab" label={uiLabels.load}>
                <div className='load controls' >
                  <button type="button" className="load control" onMouseUp={_ => loadButtonHandler(false)}>
                    Load Detections
                  </button>
                  <button type="button" className="load control" onMouseUp={_ => loadButtonHandler(true)}>
                    Load Tagged
                  </button>
                </div>
              </TabItem>

              <TabItem tabKey="outputTab" label={uiLabels.output}>
                <textarea value={toText()} readOnly={true}></textarea>
              </TabItem>

              <TabItem tabKey="mainTab" label={uiLabels.main}>
                <SongList appState={appState} isMobile={false} />
              </TabItem>

              <TabItem tabKey="streamsTab" label={uiLabels.streams}>
                <StreamList appState={appState} isMobile={false} />
              </TabItem>

            </Tab>
          </div>
          <div id="search" className={isMobile ? "mobile" : "desktop"} style={appState.showSearchResult ? searchMobileCss.show : searchMobileCss.hide}>
            <button type="button" onClick={_=>appState.setShowSearchResult(true)} className='search show'><FaAngleDoubleLeft /></button>
            <div id="searchContent">
            </div>
            <button type="button" onClick={_=>appState.setShowSearchResult(false)} className='search hide'>
              <FaAngleDoubleRight /><FaAngleDoubleRight />
              <FaAngleDoubleRight /><FaAngleDoubleRight />
            </button>
          </div>
        </div>
        <footer>
          <div id="playerContainer">
            <ReactAudioPlayer ref={player} />
          </div>
        </footer>
      </>
    )
  //}
}

const commonCSS: React.CSSProperties = {
  "width": "100%",
  "height": "100%",
  /*"overflowY": "auto",
  "overflowX": "visible",*/
  "position": "fixed",
  "backgroundColor": "white",
  "zIndex": 4,
  "display": "flex",
  "flexDirection": "column",
  "justifyContent": "space-between"
}

const searchMobileCss = {
  "hide": ({
    ...commonCSS,
    "left": "100%",
  } as React.CSSProperties),
  "show": ({
    ...commonCSS,
    "left": "0%",
  } as React.CSSProperties),
}

export default App