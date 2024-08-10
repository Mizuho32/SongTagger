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

  let [hoveredElement, setHoveredElement] = useState(-1)
  function onHover(e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, idx: number) {
    if (hoveredElement != idx) {
      setHoveredElement(idx)
    }
  }

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
          {current ? <FaPencilAlt color="#ffd636" /> : <FaLock color="#ffd636" />} {date_str}
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