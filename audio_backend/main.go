package main

import (
	"audio_backend/utils"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
)

func main() {
	// コマンドライン引数からファイルパスを取得
	if len(os.Args) < 5+1 {
		log.Fatalf("Usage: %s <host addr> <proxy addr> <det_root> <tagging_cache_root> <id_map.yaml path>", os.Args[0])
	}
	hostAddr := os.Args[1]
	proxyAddr := os.Args[2]
	detRoot := os.Args[3]
	taggingCacheRoot := os.Args[4]
	idMapPath := os.Args[5]

	idMap := utils.LoadIdMap(idMapPath)
	/*
		for k, v := range idMap {
			log.Printf("k %s, v %s\n", k, v.SystemName)
		}
		log.Printf("Test %s\n", utils.GetArtist(idMap, ":"+"0KuxCxX17ZAOS_fqlakT5"))
		os.Exit(1)*/

	// プロキシサーバーの設定
	proxyURL, err := url.Parse(fmt.Sprintf("http://%s", proxyAddr)) // ここでプロキシ先のURLを指定

	if err != nil {
		log.Fatalf("Error parsing proxy URL: %v", err)
	}
	proxy := httputil.NewSingleHostReverseProxy(proxyURL)

	// ハンドラの設定
	mux := http.NewServeMux()

	mux.HandleFunc("/audio/", utils.GenAudioHandler2(idMap, detRoot, taggingCacheRoot))

	// その他すべてのパスに対するプロキシ
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		urlLen := len(r.URL.Path)
		if r.URL.Path != "" && (urlLen < 6 || r.URL.Path[:6] != "/audio") {
			proxy.ServeHTTP(w, r)
		} else {
			http.NotFound(w, r)
		}
	})

	// 静的ファイルのハンドリング
	//fs := http.FileServer(http.Dir("./public"))
	//mux.Handle("/static/", http.StripPrefix("/static/", fs))

	// REST APIエンドポイントのハンドリング
	//mux.HandleFunc("/api/hello", helloHandler)

	// メディアファイルのハンドリング
	//http.HandleFunc("/audio/", genAudioHandler(filePath))

	// サーバーの起動
	log.Printf("Server starting on %s\n", hostAddr)
	log.Fatal(http.ListenAndServe(hostAddr, mux))
}
