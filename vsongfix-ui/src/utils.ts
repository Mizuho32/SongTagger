import axios from "axios"
import { nanoid } from "nanoid";

import { APIReturn, AppState, Stream } from "./interfaces";
import {Song} from "./interfaces"
import * as songUtils from './songUtils'


export async function initSession(appState: AppState, artist: string, filename: string|null = "", audioEl: HTMLAudioElement) {
    if (!appState.cookies.sessionID) {
        appState.setCookie("sessionID", nanoid())
    }

    appState.audioEl = audioEl

    return await startSession(appState, artist, filename)
}

export async function startSession(appState: AppState, artist: string, filename: string|null = "") {
    // FIXME?
    appState.artist = artist
    appState.setArtist(artist)
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

        }

    }

    await songUtils.fetchStreams(appState)
    if (param && appState.audioEl) appState.audioEl.src = `/api/audio${param}`
    //return param
}

export async function lock(artist: string, filename: string, sid: string, get: boolean) {
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