import React, { useState } from 'react'
import {Time, to_time, to_num} from './Time'
import './SongList.css'
import {Song, AppState} from './interfaces'

interface SongListProps {
  appState: AppState
  isMobile?: boolean;
}

function SongList(props: SongListProps) {
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

  //let focusedElement: HTMLElement | undefined = undefined
  let [focusedElement, setFosucElement] = useState(-1)
  const onFocus = async (e: React.FocusEvent<HTMLTableRowElement, Element>, idx: number, state: Song) => {
    const audioEl = props.appState.audioEl
    //console.log(`Focus on ${idx}`, idx, focusedElement)
    if (focusedElement != idx) {
      console.log(`Focus on ${idx}`, e.target, `${state.title} at ${state.start}`, !!audioEl)
      if (audioEl) {
        audioEl.currentTime = state.start
        if (audioEl.paused) {
          await audioEl.play()
        }
      }
      setFosucElement(idx)
    }
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
              <tr key={index} onFocus={e => onFocus(e, index, state)}>
                <td className="no">{index}</td>
                <td className="start"><Time type="start" time={state.start} time_update={(value: string) => handleTimeChange(index, "start", to_num(value))} isMobile={false}></Time></td>
                <td className="end"><Time type="end" time={state.end} time_update={(value: string) => handleTimeChange(index, "end", to_num(value))} isMobile={false}></Time></td>
                <td className="length">{showLength(state)}</td>
                <td className="title"><input type="text" value={state.title} onChange={e => handleTimeChange(index, "title", e.target.value)}></input></td>
              </tr>
            ))}
            
          </tbody>
        </table>
      </>
    )
  }
}

export default SongList