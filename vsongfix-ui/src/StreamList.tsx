import { FaLock, FaUnlock, FaRedo, FaEdit, FaPencilAlt } from 'react-icons/fa';

import React, { useEffect, useState } from 'react'
import {Time, to_time, to_num} from './Time'
import './StreamList.css'

import {Stream, AppState} from './interfaces'
import * as songUtils from './songUtils'
import { startSession } from './utils';

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

  */
  let [hoveredElement, setHoveredElement] = useState(-1)
  function onHover(e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, idx: number) {
    if (hoveredElement != idx) {
      setHoveredElement(idx)
    }
  }
  /*

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

  async function openSession(text: string, stream: Stream) {
    /*if (stream.taggingLock) {
      alert(`${text}は作業中です。`)
      return
    }*/

    const ret = confirm(`${text}を開きます。現在の作業は破棄されます。`)
    if (ret) {
      const filename = stream.name + stream.extname
      const locked = await startSession(props.appState, "", filename)
      console.log("open Session", props.appState.artist, props.appState.filename)
      if (!locked) {
        alert(`${text}は既に作業中です。`)
      }
    }
  }
  const date = nameToDate(props.appState.filename)

  function toStatus(stream: Stream, currentDate = "") {
    let date_str = ""
    if (stream.lastModified)
      date_str = `${stream.lastModified?.toLocaleDateString()} ${stream.lastModified?.toLocaleTimeString()}`

    let current = false
    if (currentDate && stream.name.includes(currentDate)) {
      current = props.appState.filename.includes(stream.name)
    }

    if (stream.taggingLock) {
      return (
        <>
          {current ? <FaPencilAlt color="yellow" /> : <FaLock color="yellow" />} {date_str}
        </>
      )
    } else {
      return (
        <>
          <FaUnlock color="green" /> {date_str}
        </>
      )
    }
  }

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
              <tr key={index} onMouseOver={e=>onHover(e, index)}>
                <td className="no">{index}</td>
                <td className="title" >{nameToDate(stream.name)} 歌枠</td>
                <td className="status">{toStatus(stream, date)}</td>
                <td>
                {
                  hoveredElement == index || (hoveredElement==-1&&index==0)?
                  <button type="button" onMouseUp={_=>openSession(nameToDate(stream.name), stream)} className='streamlist open'><FaEdit /></button> : <div></div>
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



function nameToDate(name: string) {
  const match = name.match(/^([-0-9]+)_/)
  if (match) {
    return match[1] || name
  }
  return name
}

export default StreamList