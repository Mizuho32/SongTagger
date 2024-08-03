
export interface Song {
    start: number
    end: number
    title: string
    artist: string
}

export interface AppState {
    filename: string
    artist: string
    songList: Song[]
    audioEl?: HTMLAudioElement

    setSongList: React.Dispatch<React.SetStateAction<Song[]>>
    setFilename: React.Dispatch<React.SetStateAction<string>>
    setArtist: React.Dispatch<React.SetStateAction<string>>
}

export default Song