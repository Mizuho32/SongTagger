//import { useState } from 'react'
import { isMobile } from "react-device-detect";

//import Song from './interfaces'

import './Time.css'
import { useRef, useState } from "react";

interface TimeProps {
  type: string
  time: number
  time_update: (time: string|number)=>void
  audioEl?: HTMLAudioElement
}

export function to_time(num: number, digit=3) {
  let date = new Date(0);
  date.setSeconds(num);
  let offset = (3-digit)*3; // 3 is e.g. hh:, mm:
  return date.toISOString().substr(11 + offset, 8-offset);
}

export function to_num(time: string|number) {
  if (typeof time === "number") return time

  let splitten = time.split(":")
  if (splitten.length == 2) // Chrome && second == 0
    splitten.push("00");

  return splitten
    .reverse()
    .map((s,i) => 60**i * parseInt(s))
    .reduce((el, sum)=>el+sum, 0)
}

export function Time(props: TimeProps) {
  const timeEdit = useRef(false)
  const [tmpTimeStr, setTmpTimeStr] = useState("")

  function getTime() {
    if (timeEdit.current) {
      return tmpTimeStr
    } else {
      return to_time(props.time)
    }
  }

  if (isMobile) {
    return (
      <>
        <div className='time mobile'>
          <div>
            {/*
            <div className={`time ${props.type} mobile`}  onDoubleClick={_=> {
              console.log("DBLCLICK")
              if (!props.audioEl) return
              props.time_update(props.audioEl.currentTime)
            }}>{to_time(props.time)}</div>
            */}
            <input type="text" className={`time ${props.type} mobile`} onChange={e => {
              if (e.target.value.length == 8) { // valid time format
                timeEdit.current = false
                props.time_update(e.target.value)
              } else {
                timeEdit.current = true
                setTmpTimeStr(e.target.value)
              }
            }} value={getTime()}  onDoubleClick={_=> {
              //console.log("DBLCLICK")
              if (!props.audioEl) return
              props.time_update(props.audioEl.currentTime)
            }} />
            <div className='time change'>
              <button type="button" onClick={_ => props.time_update(props.time - 1)} className='time minus'>-</button>
              <button type="button" onClick={_ => props.time_update(props.time + 1)} className='time add'>+</button>
            </div>
          </div>
        </div>
      </>
    )
  } else {
    return (
      <>
        <input type="time" className={`time ${props.type}`} value={to_time(props.time)} onChange={e=>props.time_update(e.target.value)} step="1" /> 
      </>
    )
  }
}

export default Time