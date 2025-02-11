
export interface Song {
    start: number
    end: number
    title: string
    artist: string
}

export interface Stream {
    name: string
    extname: string
    taggingLock: boolean
    lastModified?: Date
}

type Cookie = {
    [x: string]: any;
}

export interface APIReturn {
    status: boolean
    value: string
}

export interface AppState {
    filename: string
    artist: string
    songList: Song[]
    streamList: Stream[]
    audioEl?: HTMLAudioElement
    cookies: Cookie
    showSearchResult: boolean
    //isMobile: boolean

    setSongList: React.Dispatch<React.SetStateAction<Song[]>>
    setStreamList: React.Dispatch<React.SetStateAction<Stream[]>>
    setFilename: React.Dispatch<React.SetStateAction<string>>
    setArtist: React.Dispatch<React.SetStateAction<string>>
    setCookie: (name: string, value: any, options?: any) => void
    removeCookie: (name: string, options?: any) => void
    setShowSearchResult: React.Dispatch<React.SetStateAction<boolean>>
    //setIsMobile: React.Dispatch<React.SetStateAction<boolean>>
}

export default Song