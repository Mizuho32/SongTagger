import axios from "axios"
import { nanoid } from "nanoid";

import { APIReturn, AppState, Stream } from "./interfaces";
import {Song} from "./interfaces"
import * as songUtils from './songUtils'


export async function initSession(appState: AppState, artist: string, filename: string|null = "", audioEl: HTMLAudioElement) {
    if (!appState.cookies.sessionID) {
        const expire = new Date();
        expire.setMonth(expire.getMonth() + 6);
        const cookieDate = new Date(expire)

        appState.setCookie("sessionID", nanoid(), { expires: cookieDate, path: '/' })
    }

    appState.audioEl = audioEl

    return await startSession(appState, artist, filename)
}

export async function startSession(appState: AppState, artist: string, filename: string|null = "") {
    let ret = true
    if (artist) {
        // FIXME?
        appState.artist = artist
        appState.setArtist(artist)
    } else {
        artist = appState.artist
    }
    let param = ""

    if (filename) {

        // release lock
        if (appState.filename != filename) {
            await lock(appState.artist, appState.filename, appState.cookies.sessionID, false)
        }

        // get lock
        const status = await lock(appState.artist, filename, appState.cookies.sessionID, true)
        if (status) {
            appState.filename = filename
            appState.setFilename(filename)

            await songUtils.fetchDetections(appState)
            param = `?artist=${artist}&filename=${filename}`

        } else {
            ret = false
        }

    }

    await songUtils.fetchStreams(appState)
    if (param && appState.audioEl) appState.audioEl.src = `/api/audio${param}`
    return ret
}

export async function lock(artist: string, filename: string, sid: string, get: boolean) {
    if (!artist || !filename || !sid) return false

    let param = `?artist=${artist}&filename=${filename}`
    if (get) {
        param += `&lock=${sid}`
    } else { // release
        param += `&unlock=${sid}`
    }

    try {
        const results = await axios.get<APIReturn>(`/api/lock${param}`);
        if (results.status === 200) {
            console.log(get ? "lock" : "unlock", results.data)
            return results.data.status
        }
    } catch (error) {
        alert(`Error fetching data\n${error}`);
    }

    return false
}

export function unlockWhenClose(appState: AppState) {

    const artist = appState.artist
    const filename = appState.filename
    const sid = appState.cookies.sessionID

    if (!artist || !filename || !sid) return

    let socket = new WebSocket(`ws://${location.host}/api/websocket`);
    socket.onopen = function () {
        socket.send(
            JSON.stringify({ artist: artist, filename: filename, unlock: sid }))
    }

    /*let timeout_id = setTimeout(() => {
        socket.close();
        alert("アップロードがタイムアウトしました");
    }, 5 * 1000)

    socket.onmessage = function (event) {
        clearTimeout(timeout_id);

        let num = parseInt(event.data);
        if (num == csvData.length) {
            alert("アップロード完了");

            // unlock
            //onclose();

        } else {
            alert(`Error: ${event.data}`);
        }

        socket.close();
    }*/
}

// Search
export function search(appState:AppState, word: string) {
  console.log(`search got "${word}"`);

  if (word !== "") {
    let socket = new WebSocket(`ws://${location.host}/api/websocket`);

    socket.onopen = function(e) {
      socket.send(JSON.stringify({search: word}));
    };

    socket.onmessage = function(event) {
        let div = document.querySelector('#search > div')
        if (div) {
            div.innerHTML = event.data;
            const search_main = div.querySelector("#main")
            search_main?.setAttribute("id", "search_main")

            div.querySelectorAll("a").forEach(a => {
                a.removeAttribute("href");
                a.setAttribute("tabindex", "-1");
            });

        }

      // if (is_mobile_html()) toggle_info(true);
      socket.close();
    };

  }
}

export function extractWord(word: string, html: string) {
    if (!word) return word;

    let initial = html.indexOf(word);
    let subst = html.substring(initial - 50, initial - 1) + html.substring(initial, initial + 50);
    let nonsymbols = "[^-!$%^&*()_+|~=\`{}\\[\\]:\\\";'<>?,.\\/ 「」]";
    //console.log({word, initial, subst});

    return subst.match(`(${nonsymbols}*${escapeRegex(word)}${nonsymbols}*)`)?.[1] || "";
}

function escapeRegex(string: string) {
      return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}