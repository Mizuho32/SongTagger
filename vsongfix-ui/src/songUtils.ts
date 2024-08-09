import { AppState, Stream } from "./interfaces";
import {Song} from "./interfaces"

import axios from "axios"

function beautifySongList(songList: Song[]) {
    return songList
        .filter(row => row.title || row.artist)
        .map(row => {
            let title = row.title;
            let artist = row.artist;

            //if (!name && !artist) { return ""; } // should save raw data?

            return [row.start, row.end, title || "", artist || ""]
        }); // should save raw data?
    //.filter(row=>row[2] || row[3]);
}

export function uploadSongs(appState: AppState) {
    const artist = appState.artist
    const filename = appState.filename
    const songList = appState.songList
    const csvData = beautifySongList(songList)

    // send
    let socket = new WebSocket(`ws://${location.host}/api/websocket`);
    socket.onopen = function () {
        socket.send(
            JSON.stringify({ artist: artist, tags: csvData, filename: filename, key: "lock" }));
    };

    let timeout_id = setTimeout(() => {
        socket.close();
        alert("アップロードがタイムアウトしました");
    }, 5 * 1000);

    socket.onmessage = function (event) {
        clearTimeout(timeout_id);

        const data = JSON.parse(event.data)
        let num = parseInt(data?.value || -1);
        if (num == csvData.length) {
            alert("アップロード完了");

            // unlock
            //onclose();

        } else {
            alert(`Error: num is ${num}, ${data}`);
        }

        socket.close();
    };
}

export function escapeCSVValue(value: string | number): string {
  if (typeof value === "number") return `${value}`

  if (!value) return ""
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    // ダブルクォートで囲み、内部のダブルクォートをエスケープ
    value = '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export async function fetchDetections(appState: AppState, tagged: boolean = false) {
    const artist = appState.artist
    if (!artist) return
    const filename = appState.filename
    if (!filename) return

    const params = new URLSearchParams()
    params.set("artist", artist)
    params.set("filename", filename)

    if (tagged) {
        params.set("tagged", "1")
    }

    let search = params.toString()
    if (search) {
        search = `?${search}`
    }

    try {
        const results = await axios.get<Song[]>(`/api/detections${search}`);
        if (results.status === 200) {
            console.log("dets", search, results.data)
            appState.setSongList(results.data);
        }
    } catch (error) {
        alert(`Error fetching data\n${error}`);
    }
}

export async function fetchStreams(appState: AppState) {
    try {
        const results = await axios.get<Stream[]>(`/api/songlist?artist=${appState.artist}`);
        if (results.status === 200) {
            console.log("stream list", results.data)
            const streams: Stream[] = results.data.map(stream => ({
                ...stream,
                lastModified: stream.lastModified ? new Date(stream.lastModified) : undefined
            })).reverse()

            appState.setStreamList(streams);
        }
    } catch (error) {
        alert(`Error fetching data\n${error}`);
    }
}