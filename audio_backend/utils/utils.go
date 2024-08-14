package utils

import (
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v2"
)

/*
func helloHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message": "Hello, world!"}`))
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
*/

func GenAudioHandler(filename string) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		// メディアファイルのパスを指定します。リクエストパスからファイル名を取得します。
		filePath := filename
		if filename == "" {
			filePath = "./media" + r.URL.Path
		}
		file, err := os.Open(filePath)
		if err != nil {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}
		defer file.Close()

		// メディアファイルのコンテンツタイプを設定します。適宜変更してください。
		w.Header().Set("Content-Type", "audio/flac")
		// サーバーが適切なコンテンツを提供するために必要なヘッダーを設定します。
		w.Header().Set("Content-Disposition", "inline; filename="+r.URL.Path)

		// ファイルをクライアントに配信します。
		http.ServeContent(w, r, filePath, time.Now(), file)
	}
}

func GenAudioHandler2(idMap map[string]IdMap, detRoot string, taggingCacheRoot string) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		artist := GetArtist(idMap, r.URL.Query().Get("artist"))
		filename := r.URL.Query().Get("filename")

		artistPath := filepath.Join(detRoot, artist)
		filePath := filepath.Join(artistPath, filename)

		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			http.NotFound(w, r)
			return
		}

		// m4a_file_path = App.option[:tagging_cache_root] / params["artist"] / "#{file_path.basename(file_path.extname)}.m4a"
		m4aFilePath := filepath.Join(taggingCacheRoot, artist, strings.TrimSuffix(filepath.Base(filePath), filepath.Ext(filePath))+".m4a")
		if _, err := os.Stat(m4aFilePath); !os.IsNotExist(err) {
			filePath = m4aFilePath
		}

		file, err := os.Open(filePath)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer file.Close()

		mimeType := mime.TypeByExtension(filepath.Ext(filePath))
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}

		w.Header().Set("Content-Type", mimeType)
		w.Header().Set("Content-Disposition", "inline; filename="+r.URL.Path)

		http.ServeContent(w, r, filePath, time.Now(), file)
	}
}

type IdMap struct {
	SystemName string `yaml:":system_name"`
	TagName    string `yaml:":tag_name"`
}

func LoadIdMap(filePath string) map[string]IdMap {
	var idMap map[string]IdMap

	// YAMLファイルを読み込みます（例として "artists.yaml" ファイルを使用）
	data, err := os.ReadFile(filePath)
	if err != nil {
		log.Fatalf("Error reading YAML file: %v", err)
	}

	// YAMLデータをパースして idMap に格納します
	err = yaml.Unmarshal(data, &idMap)
	if err != nil {
		log.Fatalf("Error unmarshalling YAML data: %v", err)
	}

	return idMap
}

func GetArtist(idMap map[string]IdMap, id string) string {
	if artist, exists := idMap[":"+id]; exists {
		return artist.SystemName
	}
	return ""
}
