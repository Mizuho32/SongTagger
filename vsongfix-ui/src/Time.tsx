import { useState } from 'react'
import Song from './interfaces'

//import './SongList.css'

interface TimeProps {
  type: string
  time: number
  time_update: (time: string)=>void
  isMobile: boolean
}

export function to_time(num: number, digit=3) {
  let date = new Date(0);
  date.setSeconds(num);
  let offset = (3-digit)*3; // 3 is e.g. hh:, mm:
  return date.toISOString().substr(11 + offset, 8-offset);
}

export function to_num(time: string) {
  let splitten = time.split(":")
  if (splitten.length == 2) // Chrome && second == 0
    splitten.push("00");

  return splitten
    .reverse()
    .map((s,i) => 60**i * parseInt(s))
    .reduce((el, sum)=>el+sum, 0)
}

export function Time(props: TimeProps) {

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
    // onChange="timechange(event);" onkeyup="timeinput_keyup(event);" 
    return (
      <>
        <input type="time" className={`time ${props.type}`} value={to_time(props.time)} onChange={e=>props.time_update(e.target.value)} step="1" /> 
      </>
    )
  }
}

export default Time