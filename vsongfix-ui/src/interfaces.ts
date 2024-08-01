
export interface Song {
    start: number
    end: number
    title: string
    artist: string
}

export interface AppState {
    songList: Song[]
    setSongList: React.Dispatch<React.SetStateAction<Song[]>>
    audioEl?: HTMLAudioElement
}

export default Song