import { FaLock, FaUnlock, FaRedo, FaAppStore } from 'react-icons/fa';

import React, { useEffect, useState } from 'react'
import {Time, to_time, to_num} from './Time'
import './StreamList.css'

import {Stream, AppState} from './interfaces'
import * as songUtils from './songUtils'

interface StreamListProps {
  appState: AppState
  isMobile?: boolean;
}

function StreamList(props: StreamListProps) {

  /*
  const [uiState, setUIState] = useState(props.appState.streamList.map(_ => ({ checked: false })))
  useEffect(() => {
    const tmp = props.appState.streamList.map(_ => ({ checked: false }));
    setUIState(tmp);
  }, [props.appState.streamList]);


  const handleUIChange = (idx: number, typeKey: string, value: number|string)  => {
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
    props.appState.setStreamList(prevState =>{
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

  // FIXME: idx must be id
  const handleTimeChange = (idx: number, typeKey: string, value: number|string)  => {
    props.appState.setStreamList(prevState => {
      return prevState.map((elm, idx2) => {
        if (idx2 == idx) {
          return {...elm, [typeKey]: value}
        }
        return elm
      })

    })
  }

  let [hoveredElement, setHoveredElement] = useState(-1)
  function onHover(e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, idx: number) {
    if (hoveredElement != idx) {
      setHoveredElement(idx)
    }
  }

  async function seekTime(state: Stream, ui: string, delta: number = 1) {
    const audioEl = props.appState.audioEl
    if (audioEl) {
        const curTime = ui == "e" ? state.end - delta : state.start // -1 if end time
        audioEl.currentTime = curTime
        if (audioEl.paused) {
          await audioEl.play()
        }
    }
  }

  function updateStreamList(updFunc: (streamList: Stream[]) => Stream[]) {
    props.appState.setStreamList(prevState => {
        const newState = updFunc(prevState.map(el=> ({...el})))
        console.log("upd StreamList", newState)
        return newState
    })
  }

  async function timeKeyUp(e: React.KeyboardEvent<HTMLTableDataCellElement>, idx: number, state: Stream, type: string) {
    const audioEl = props.appState.audioEl
    if (!audioEl) return

    if (e.key == "a") { // apply time
      let newState = undefined
      newState = {...state, [type == "s" ? "start" : "end"]: Math.round(audioEl.currentTime)}
      updateStreamList((streamList) =>{
        return streamList.map((stream, index)=>{
          if (index == idx) {
            return newState
          }
          return stream
        })
      })
    } else if (e.key == "s")  { // set cur time to state time
      audioEl.currentTime = type == "s" ? state.start : state.end
    } else if (e.key == " ") {
      if (audioEl.paused) {
        await audioEl.play()
      } else {
        await audioEl.pause()
      }
    } else if (e.key.includes("Arrow")) {
      if (e.key.includes("Left")) {
        audioEl.currentTime -= 5
      } else if (e.key.includes("Right")) {
        audioEl.currentTime += 5
      }
    }
  }

  let [focusedElementIndex, setFosucElementIndex] = useState(-1)
  const onFocus = async (e: React.FocusEvent<any, Element>, idx: number, state: Stream, ui: string) => {

    if (focusedElementIndex != idx) {
      console.log(`Focus on ${idx}`, e.target, `${state.title} at ${state.start}`)//, !!audioEl)
      await seekTime(state, ui)
      setFosucElementIndex(idx)
    }
  }


  function addStream(idx: number) {
    const audioEl = props.appState.audioEl
    console.log("addStream", idx, audioEl)

    if (audioEl) {
      const currentTime = audioEl.currentTime
      props.appState.setStreamList(prevState => {
        const stream: Stream = { start: currentTime, end: currentTime + 60, title: "タイトルを入力", artist: "" }
        const newState = prevState.map(el=> ({...el}))
        newState.splice(idx+1, 0, stream)
        //const newState = [stream, ...prevState]
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

  //console.log(streamlist)
  const showLength = (stream: Stream) => {
    const diff = stream.end - stream.start
    if (diff > 3600) {
      return to_time(diff, 3)
    } else {
      return to_time(diff, 2)
    }
  }
  */

  if (props.isMobile) {
    return (
      <>
        <table className="tablecss">
          <thead>
            <tr>
              <th className="no">No.</th>
              <th className="item">Item</th>
            </tr>
          </thead>
          <tbody id="stamps"></tbody>
        </table>
      </>
    )
  } else {
    return (
      <>
      <div className='streamlist controls'>
        <button type="button" className="streamlist control" onMouseUp={_ => songUtils.fetchStreams(props.appState)}><FaRedo />Reload</button>
        {/* 
        <button type="button" className="streamlist control" onMouseUp={e => streamUtils.uploadStreams(props.appState)}>Submit</button>
        */} 
      </div>
      <div id="streamListContainer">
        <table className="tablecss">
          <thead>
            <tr>
              <th className="no">No.</th>
              <th className="title">Title</th>
              <th className="status">Status</th>
            </tr>
          </thead>
          <tbody id="streams">
            {props.appState.streamList.map((stream: Stream, index: number) => (
              <tr key={index}>
                <td className="no">{index}</td>
                <td className="title" >{nameToDate(stream.name)}</td>
                <td className="status">{stream.taggingLock ? (<FaLock />) : (<FaUnlock />)}</td>
              </tr>
            ))}
            
          </tbody>
        </table>
      </div>
      </>
    )
  }
}

function nameToDate(name: string) {
  const match = name.match(/^([-0-9]+)_/)
  if (match) {
    return `${match[1]} 歌枠` || name
  }
  return name
}

export default StreamList