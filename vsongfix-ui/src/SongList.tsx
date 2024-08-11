import React, { useEffect, useRef, useState } from 'react'
import { FaPlus, FaSearch, FaTrashAlt, FaCloudUploadAlt, FaStepBackward, FaStepForward, FaUnlockAlt} from 'react-icons/fa';
import { isMobile } from "react-device-detect";

import {Time, to_time, to_num} from './Time'
import './SongList.css'
import {Song, AppState} from './interfaces'
import * as songUtils from './songUtils'
import * as utils from './utils'

interface SongListProps {
  appState: AppState
  isMobile?: boolean;
}

type SearchState = {
  lastTimeout?: number;
  isComposing?: boolean;
  lastValue: string;
};

const uiLabels = {
  "delete": isMobile ? (<FaTrashAlt />) : "削除",
  "upload": isMobile ? (<FaCloudUploadAlt />) : "Upload",
  "unlock": isMobile ? (<FaUnlockAlt />) : "UnLock",
}

function SongList(props: SongListProps) {
  // songList の変更を監視するために useEffect を使用
  const [uiState, setUIState] = useState(props.appState.songList.map(_ => ({ checked: false })));
  const searchState = useRef<SearchState>({lastTimeout: undefined, isComposing: undefined, lastValue: ""});


  useEffect(() => {
    const tmp = props.appState.songList.map(_ => ({ checked: false }));
    setUIState(tmp);
  }, [props.appState.songList]);


  const handleUIChange = (idx: number)  => {
    setUIState(prevState => {
      console.log(prevState)
      return prevState.map((elm, idx2) => {
        if (idx2 == idx) {
          return {...elm, ["checked"]: !elm.checked}
        }
        return elm
      })

    })
  }

  const onDelete = () => {
    props.appState.setSongList(prevState =>{
      const newState = prevState.filter((_, idx)=>{
        return !uiState[idx]?.checked
      })
      return newState
    })

    setUIState(prevState => {
      const newState = prevState.filter((elm)=>{
        return !elm.checked
      })
      console.log(newState)
      return newState
    })
  }

  function setTitle(idx: number, value: string) {
    props.appState.setSongList(prevState => {
      return prevState.map((elm, idx2) => {
        if (idx2 == idx) {
          return {...elm, ["title"]: value}
        }
        return elm
      })
    })
  }

  // FIXME: idx must be id
  const handleTimeChange = (idx: number, typeKey: string, value: number|string)  => {
    props.appState.setSongList(prevState => {
      return prevState.map((elm, idx2) => {
        if (idx2 == idx) {
          return {...elm, [typeKey]: value}
        }
        return elm
      })

    })
  }

  let [hoveredElement, setHoveredElement] = useState(-1)
  function onHover(_: React.MouseEvent<HTMLTableRowElement, MouseEvent>, idx: number) {
    if (hoveredElement != idx) {
      setHoveredElement(idx)
    }
  }

  async function seekTime(state: Song, ui: string, delta: number = 1) {
    const audioEl = props.appState.audioEl
    if (audioEl) {
        const curTime = ui == "e" ? state.end - delta : state.start // -1 if end time
        audioEl.currentTime = curTime
        if (audioEl.paused) {
          await audioEl.play()
        }
    }
  }

  function updateSongList(updFunc: (songList: Song[]) => Song[]) {
    props.appState.setSongList(prevState => {
        const newState = updFunc(prevState.map(el=> ({...el})))
        console.log("upd SongList", newState)
        return newState
    })
  }

  const [endStopper, setEndStopper] = useState({itvHandle: 0})
  function stopEnd() {
    //console.log("Clear stop", endStopper)
    clearInterval(endStopper.itvHandle)
    endStopper.itvHandle = 0
    setEndStopper({ itvHandle: 0 })
  }
  async function setTime(type: string, state: Song) {
    const audioEl = props.appState.audioEl
    if (!audioEl) return

    let targetTime = state.start

    if (type == "e") { // stop if currentTime > state.end
      targetTime = state.end - 4
      if (endStopper.itvHandle != 0) {
        stopEnd()
      }
      const stopTime = state.end
      const handle = setInterval(function () {
        if (audioEl.currentTime > stopTime) {
          audioEl.pause()
          stopEnd()
        }

      }, 500)
      endStopper.itvHandle = handle
      setEndStopper({ itvHandle: handle })
      console.log(endStopper)
    }

    audioEl.currentTime = targetTime
    if (audioEl.paused) await audioEl.play()
  } 
  async function timeKeyUp(e: React.KeyboardEvent<HTMLElement>, idx: number, state: Song, type: string) {
    const audioEl = props.appState.audioEl
    if (!audioEl) return

    if (e.key == "w") { // apply time
      let newState = undefined
      newState = {...state, [type == "s" ? "start" : "end"]: Math.round(audioEl.currentTime)}
      updateSongList((songList) =>{
        return songList.map((song, index)=>{
          if (index == idx) {
            return newState
          }
          return song
        })
      })
    } else if (e.key == "s")  { // set cur time to state time
      setTime(type, state)
    } else if (e.key == " ") { // pause
      if (audioEl.paused) {
        await audioEl.play()
      } else {
        await audioEl.pause()
      }
    } else if (e.key == "d") {
      audioEl.currentTime += 5
    } else if (e.key == "a") {
      audioEl.currentTime -= 5
    } /*else {
      console.log("other key", e)
    }*/
  }

  async function titleKeyUp(e: React.KeyboardEvent<HTMLInputElement>, state: Song) {
    if (e.ctrlKey && e.key == "Enter") {
      utils.search(props.appState, state.title)
    }
  }

  function onBlur() {
    //console.log("onBlur", endStopper)
    if (endStopper.itvHandle != 0) {
      stopEnd()
    }
  }

  let [focusedElementIndex, setFosucElementIndex] = useState(-1)
  const onFocus = async (e: React.FocusEvent<any, Element>, idx: number, state: Song, ui: string) => {

    if (focusedElementIndex != idx) {
      console.log(`Focus on ${idx}`, e.target, `${state.title} at ${state.start}`)//, !!audioEl)
      await seekTime(state, ui)
      setFosucElementIndex(idx)
    }
  }


  function addSong(idx: number) {
    const audioEl = props.appState.audioEl
    console.log("addSong", idx, audioEl)

    if (audioEl) {
      const currentTime = audioEl.currentTime
      props.appState.setSongList(prevState => {
        const song: Song = { start: currentTime, end: currentTime + 60, title: "タイトルを入力", artist: "" }
        const newState = prevState.map(el=> ({...el}))
        newState.splice(idx+1, 0, song)
        //const newState = [song, ...prevState]
        console.log(newState)
        return newState
      })
    }

    setUIState(prevState => {
        const newState = prevState.map(el=> ({...el}))
        newState.splice(idx+1, 0, {checked: false})
        console.log(newState)
        return newState
    })
  }

  //console.log(songlist)
  const showLength = (song: Song) => {
    const diff = song.end - song.start
    if (diff > 3600) {
      return to_time(diff, 3)
    } else {
      return to_time(diff, 2)
    }
  }

  function extract_word(e: React.FormEvent<HTMLInputElement>, idx: number) {
    const state = searchState
    state.current.isComposing = e.isComposing;

    if (!e.target.value) return;

    if (state.current.lastTimeout) {
      clearTimeout(state.current.lastTimeout);
    }

    //console.log(e.target.value, e.isComposing);

    state.current.lastTimeout = setTimeout(() => {
      if (!state.current.isComposing) { // safe to overwrite value
        const html = document.querySelector('#search > div')?.innerHTML
        if (!html) return

        let ext = utils.extractWord(e.target.value, html);
        console.log("ext", ext, state.current.lastValue)

        // For the case ext is too long (e.g. "坂本真綾の曲")
        if (state.current.lastValue.includes(e.target.value) && e.target.value.length < state.current.lastValue.length) {
          state.current.lastValue = e.target.value;
          return;
        }

        if (ext.includes(e.target.value)) {
          //e.target.value = ext;
          setTitle(idx, ext)
          state.current.lastValue = ext;
        }
      }
      state.current.lastTimeout = undefined;
    }, 1000);
  }


  const songlistControls = (
    <div className='songlist controls'>
      <button type="button" className="songlist control" onMouseUp={_ => onDelete()}>
        {uiLabels.delete}
        </button>
      <button type="button" className="songlist control" onMouseUp={_ => songUtils.uploadSongs(props.appState)}>
        {uiLabels.upload} 
      </button>
      {isMobile && (
        <button type="button" className="songlist control" onMouseUp={_ => {
          const ok = confirm("アンロックします。作業内容は失われます")
          if (ok) {
            utils.endSession(props.appState)
          }
        }}>
          {uiLabels.unlock} 
        </button>
      )}
    </div>
  )
  if (isMobile) {
    return (
      <>
      { songlistControls }
      <div id="songListContainer">
        <table className="tablecss" border={1}>
          <thead>
            <tr>
              <th className="no">No.</th>
              <th className="item">Item</th>
            </tr>
          </thead>
          <tbody id="stamps">
              {props.appState.songList.map((state: Song, index: number) => (
                <tr key={index} onMouseOver={e => onHover(e, index)}>
                  <td className="no">
                    <input type="checkbox" checked={uiState[index]?.checked || false} onChange={_ => handleUIChange(index)}></input>{index}</td>

                  <td className='item'>

                    <div className="item inputs">
                      <div className="title" onFocus={e => onFocus(e, index, state, "t")}>
                        <button type="button" onMouseUp={_ => utils.search(props.appState, state.title)} className='songlist search'><FaSearch /></button>
                        <input type="text" value={state.title} onChange={e => handleTimeChange(index, "title", e.target.value)} onKeyUp={e => titleKeyUp(e, state)} onInput={e => extract_word(e, index)}></input>
                        <button type="button" onMouseUp={_ => addSong(index)} className='songlist add'>
                          <FaPlus />
                        </button>
                      </div>
                    </div>

                    <div className='item times'>
                      <div className="start" onFocus={e => onFocus(e, index, state, "s")} onKeyUp={e => timeKeyUp(e, index, state, "s")}>
                        <Time type="start" time={state.start} time_update={(value: string|number) => handleTimeChange(index, "start", to_num(value))} audioEl={props.appState.audioEl}></Time>
                        <div>
                          <button type="button" onClick={_=>setTime("s", state)} className='time tostart'><FaStepBackward /></button>
                        </div>
                      </div>
                      <div className="length" >{showLength(state)}</div>
                      <div className="end" onFocus={e => onFocus(e, index, state, "e")} onKeyUp={e => timeKeyUp(e, index, state, "e")} onBlur={_ => onBlur()}>
                        <div>
                          <button type="button" onClick={ _=>setTime("e", state)} className='time toend'><FaStepForward /></button>
                        </div>
                        <Time type="end" time={state.end} time_update={(value: string|number) => handleTimeChange(index, "end", to_num(value))} audioEl={props.appState.audioEl}></Time>
                      </div>
                    </div>
                    
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
    )
  } else {
    return (
      <>
      { songlistControls }
      <div id="songListContainer">
        <table className="tablecss">
          <thead>
            <tr>
              <th className="no">No.</th>
              <th className="start">Start</th>
              <th className="end">End</th>
              <th className="length">Length</th>
              <th className="title">Song title</th>
              {/*<th className="artist">Artist</th>*/}
            </tr>
          </thead>
          <tbody id="stamps">
            {props.appState.songList.map((state: Song, index: number) => (
              <tr key={index} onMouseOver={e=>onHover(e, index)}>
                <td className="no">
                  <input type="checkbox" checked={uiState[index]?.checked || false} onChange={_=>handleUIChange(index)}></input>{index}</td>
                <td className="start" onFocus={e => onFocus(e, index, state, "s")} onKeyUp={e=>timeKeyUp(e, index, state, "s")}>
                  <Time type="start" time={state.start} time_update={(value: string|number) => handleTimeChange(index, "start", to_num(value))} ></Time></td>
                <td className="end" onFocus={e => onFocus(e, index, state, "e")} onKeyUp={e=>timeKeyUp(e, index, state, "e")} onBlur={_=>onBlur()}>
                  <Time type="end" time={state.end} time_update={(value: string|number) => handleTimeChange(index, "end", to_num(value))} ></Time></td>
                <td className="length" align="center">{showLength(state)}</td>
                <td className="title" onFocus={e => onFocus(e, index, state, "t")}>
                  <button type="button" onMouseUp={_=>utils.search(props.appState, state.title)} className='songlist search'><FaSearch /></button>
                  <input type="text" value={state.title} onChange={e => handleTimeChange(index, "title", e.target.value)} onKeyUp={e=>titleKeyUp(e, state)} onInput={e=>extract_word(e, index)}></input></td>
                <td>
                {
                  hoveredElement == index ?
                  <button type="button" onMouseUp={_=>addSong(index)} className='songlist add'>
                    <FaPlus />
                  </button> : <div></div>
                }
                </td>
              </tr>
            ))}
            
          </tbody>
        </table>
      </div>
      </>
    )
  }
}

export default SongList