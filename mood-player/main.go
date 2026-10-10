// Mood Player — лёгкий плеер Apple Music для ПК.
// Go-сервер на 127.0.0.1 раздаёт веб-интерфейс (MusicKit JS), подписывает
// developer token, хранит чёрный список и ловит глобальные хоткеи.
package main

import (
	"crypto/ecdsa"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"embed"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

//go:embed web
var webFS embed.FS

type Config struct {
	TeamID        string   `json:"teamId"`
	KeyID         string   `json:"keyId"`
	KeyFile       string   `json:"keyFile"`
	Port          int      `json:"port"`
	GameProcesses []string `json:"gameProcesses"`
	Hotkeys       bool     `json:"hotkeys"`
	OpenBrowser   bool     `json:"openBrowser"`
}

type BannedItem struct {
	Name   string `json:"name"`
	Artist string `json:"artist"`
	At     int64  `json:"at"`
}

type Data struct {
	Banned        map[string]BannedItem `json:"banned"`        // catalog song id -> info
	BannedArtists map[string]int64      `json:"bannedArtists"` // lowercase artist -> time
	Skips         map[string]int        `json:"skips"`         // быстрые пропуски
	Loved         map[string]int64      `json:"loved"`
	Prefs         map[string]any        `json:"prefs"`
}

type App struct {
	dir     string
	mu      sync.Mutex
	cfg     Config
	data    Data
	token   string
	tokenAt time.Time

	subsMu   sync.Mutex
	subs     map[chan string]struct{}
	everSeen bool
	lastSub  time.Time
	game     string
}

func main() {
	exe, _ := os.Executable()
	dir := filepath.Dir(exe)
	if d := os.Getenv("MOODPLAYER_DIR"); d != "" {
		dir = d
	}
	lf, err := os.OpenFile(filepath.Join(dir, "moodplayer.log"), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err == nil {
		log.SetOutput(lf)
	}

	a := &App{dir: dir, subs: map[chan string]struct{}{}}
	a.loadConfig()
	a.loadData()

	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", a.cfg.Port))
	if err != nil {
		// Скорее всего плеер уже запущен — просто откроем окно ещё раз.
		log.Printf("listen: %v", err)
		openBrowser(a.dir, fmt.Sprintf("http://127.0.0.1:%d/", a.cfg.Port))
		return
	}
	url := fmt.Sprintf("http://127.0.0.1:%d/", a.cfg.Port)

	if a.cfg.Hotkeys {
		go startHotkeys(func(action string) { a.broadcast(`{"type":"hotkey","action":"` + action + `"}`) })
	}
	go a.watchGames()
	go a.watchAlive()

	if a.cfg.OpenBrowser {
		go openBrowser(a.dir, url)
	}
	log.Printf("Mood Player: %s", url)
	if err := http.Serve(ln, a.routes()); err != nil {
		log.Fatal(err)
	}
}

func (a *App) loadConfig() {
	a.cfg = Config{Port: 47823, KeyFile: "AuthKey.p8", Hotkeys: true, OpenBrowser: true,
		GameProcesses: []string{"dota2.exe", "cs2.exe", "valorant.exe", "leagueclient.exe"}}
	b, err := os.ReadFile(filepath.Join(a.dir, "config.json"))
	if err == nil {
		if err := json.Unmarshal(b, &a.cfg); err != nil {
			log.Printf("config.json: %v", err)
		}
	}
}

func (a *App) saveConfig() error {
	b, _ := json.MarshalIndent(a.cfg, "", "  ")
	return os.WriteFile(filepath.Join(a.dir, "config.json"), b, 0o600)
}

func (a *App) loadData() {
	b, err := os.ReadFile(filepath.Join(a.dir, "data.json"))
	if err == nil {
		_ = json.Unmarshal(b, &a.data)
	}
	if a.data.Banned == nil {
		a.data.Banned = map[string]BannedItem{}
	}
	if a.data.BannedArtists == nil {
		a.data.BannedArtists = map[string]int64{}
	}
	if a.data.Skips == nil {
		a.data.Skips = map[string]int{}
	}
	if a.data.Loved == nil {
		a.data.Loved = map[string]int64{}
	}
	if a.data.Prefs == nil {
		a.data.Prefs = map[string]any{}
	}
}

// saveData вызывается под a.mu. Запись через временный файл, чтобы не потерять
// чёрный список, если ПК выключится посреди записи.
func (a *App) saveData() {
	b, _ := json.MarshalIndent(a.data, "", " ")
	p := filepath.Join(a.dir, "data.json")
	if err := os.WriteFile(p+".tmp", b, 0o644); err != nil {
		log.Printf("save: %v", err)
		return
	}
	_ = os.Rename(p+".tmp", p)
}

// ---------- developer token (JWT ES256) ----------

func (a *App) devToken() (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.token != "" && time.Since(a.tokenAt) < 24*time.Hour {
		return a.token, nil
	}
	if a.cfg.TeamID == "" || a.cfg.KeyID == "" {
		return "", errors.New("not configured")
	}
	kp := a.cfg.KeyFile
	if !filepath.IsAbs(kp) {
		kp = filepath.Join(a.dir, kp)
	}
	pemBytes, err := os.ReadFile(kp)
	if err != nil {
		return "", fmt.Errorf("нет ключа %s", kp)
	}
	tok, err := signJWT(pemBytes, a.cfg.TeamID, a.cfg.KeyID, time.Now())
	if err != nil {
		return "", err
	}
	a.token, a.tokenAt = tok, time.Now()
	return tok, nil
}

func signJWT(pemBytes []byte, teamID, keyID string, now time.Time) (string, error) {
	blk, _ := pem.Decode(pemBytes)
	if blk == nil {
		return "", errors.New("ключ .p8 повреждён")
	}
	k, err := x509.ParsePKCS8PrivateKey(blk.Bytes)
	if err != nil {
		return "", err
	}
	key, ok := k.(*ecdsa.PrivateKey)
	if !ok {
		return "", errors.New("ключ .p8 не ES256")
	}
	enc := base64.RawURLEncoding
	h, _ := json.Marshal(map[string]string{"alg": "ES256", "kid": keyID})
	c, _ := json.Marshal(map[string]any{"iss": teamID, "iat": now.Unix(), "exp": now.Add(30 * 24 * time.Hour).Unix()})
	unsigned := enc.EncodeToString(h) + "." + enc.EncodeToString(c)
	sum := sha256.Sum256([]byte(unsigned))
	r, s, err := ecdsa.Sign(rand.Reader, key, sum[:])
	if err != nil {
		return "", err
	}
	sig := make([]byte, 64)
	r.FillBytes(sig[:32])
	s.FillBytes(sig[32:])
	return unsigned + "." + enc.EncodeToString(sig), nil
}

// ---------- HTTP ----------

func (a *App) routes() http.Handler {
	mux := http.NewServeMux()
	sub, _ := fs.Sub(webFS, "web")
	mux.Handle("/", http.FileServer(http.FS(sub)))

	mux.HandleFunc("/api/token", func(w http.ResponseWriter, r *http.Request) {
		tok, err := a.devToken()
		if err != nil {
			writeJSON(w, 200, map[string]any{"configured": false, "error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"configured": true, "token": tok})
	})

	mux.HandleFunc("/api/setup", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST", 405)
			return
		}
		var in struct{ TeamID, KeyID, Key string }
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		in.TeamID, in.KeyID = strings.TrimSpace(in.TeamID), strings.TrimSpace(in.KeyID)
		if _, err := signJWT([]byte(in.Key), in.TeamID, in.KeyID, time.Now()); err != nil {
			writeJSON(w, 400, map[string]any{"error": "Ключ не подошёл: " + err.Error()})
			return
		}
		a.mu.Lock()
		defer a.mu.Unlock()
		if err := os.WriteFile(filepath.Join(a.dir, "AuthKey.p8"), []byte(in.Key), 0o600); err != nil {
			writeJSON(w, 500, map[string]any{"error": err.Error()})
			return
		}
		a.cfg.TeamID, a.cfg.KeyID, a.cfg.KeyFile = in.TeamID, in.KeyID, "AuthKey.p8"
		a.token = ""
		if err := a.saveConfig(); err != nil {
			writeJSON(w, 500, map[string]any{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true})
	})

	mux.HandleFunc("/api/state", func(w http.ResponseWriter, r *http.Request) {
		a.mu.Lock()
		defer a.mu.Unlock()
		writeJSON(w, 200, map[string]any{"data": a.data, "game": a.currentGame()})
	})

	// Единая точка изменений: ban / unban / banArtist / unbanArtist / skip / love / prefs.
	mux.HandleFunc("/api/act", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST", 405)
			return
		}
		var in struct {
			Op     string         `json:"op"`
			ID     string         `json:"id"`
			Name   string         `json:"name"`
			Artist string         `json:"artist"`
			Prefs  map[string]any `json:"prefs"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		now := time.Now().Unix()
		artist := strings.ToLower(strings.TrimSpace(in.Artist))
		a.mu.Lock()
		switch in.Op {
		case "ban":
			a.data.Banned[in.ID] = BannedItem{Name: in.Name, Artist: in.Artist, At: now}
			delete(a.data.Loved, in.ID)
		case "unban":
			delete(a.data.Banned, in.ID)
			delete(a.data.Skips, in.ID)
		case "banArtist":
			a.data.BannedArtists[artist] = now
		case "unbanArtist":
			delete(a.data.BannedArtists, artist)
		case "skip":
			a.data.Skips[in.ID]++
		case "love":
			a.data.Loved[in.ID] = now
		case "unlove":
			delete(a.data.Loved, in.ID)
		case "prefs":
			for k, v := range in.Prefs {
				a.data.Prefs[k] = v
			}
		default:
			a.mu.Unlock()
			http.Error(w, "unknown op", 400)
			return
		}
		a.saveData()
		a.mu.Unlock()
		writeJSON(w, 200, map[string]any{"ok": true})
	})

	mux.HandleFunc("/api/events", a.events)
	return a.localOnly(mux)
}

// localOnly не даёт чужим сайтам в браузере дёргать API плеера (CSRF / DNS rebinding).
func (a *App) localOnly(next http.Handler) http.Handler {
	self := fmt.Sprintf("127.0.0.1:%d", a.cfg.Port)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host != self {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		if o := r.Header.Get("Origin"); o != "" && o != "http://"+self {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

// ---------- SSE: хоткеи и запуск игр ----------

func (a *App) events(w http.ResponseWriter, r *http.Request) {
	fl, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "no stream", 500)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	ch := make(chan string, 8)
	a.subsMu.Lock()
	a.subs[ch] = struct{}{}
	a.everSeen = true
	a.subsMu.Unlock()
	defer func() {
		a.subsMu.Lock()
		delete(a.subs, ch)
		a.lastSub = time.Now()
		a.subsMu.Unlock()
	}()
	fmt.Fprintf(w, "data: {\"type\":\"game\",\"game\":%q}\n\n", a.currentGame())
	fl.Flush()
	ping := time.NewTicker(25 * time.Second)
	defer ping.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case m := <-ch:
			fmt.Fprintf(w, "data: %s\n\n", m)
			fl.Flush()
		case <-ping.C:
			fmt.Fprint(w, ": ping\n\n")
			fl.Flush()
		}
	}
}

func (a *App) broadcast(m string) {
	a.subsMu.Lock()
	defer a.subsMu.Unlock()
	for ch := range a.subs {
		select {
		case ch <- m:
		default:
		}
	}
}

func (a *App) currentGame() string {
	a.subsMu.Lock()
	defer a.subsMu.Unlock()
	return a.game
}

// watchGames раз в 15 секунд смотрит, запущена ли игра (это дёшево: один снимок процессов).
func (a *App) watchGames() {
	want := map[string]bool{}
	for _, p := range a.cfg.GameProcesses {
		want[strings.ToLower(p)] = true
	}
	for {
		g := runningGame(want)
		a.subsMu.Lock()
		changed := g != a.game
		a.game = g
		a.subsMu.Unlock()
		if changed {
			a.broadcast(fmt.Sprintf(`{"type":"game","game":%q}`, g))
		}
		time.Sleep(15 * time.Second)
	}
}

// watchAlive закрывает сервер, когда окно плеера закрыто, чтобы ничего не висело в фоне.
func (a *App) watchAlive() {
	for {
		time.Sleep(5 * time.Second)
		a.subsMu.Lock()
		dead := a.everSeen && len(a.subs) == 0 && time.Since(a.lastSub) > 20*time.Second
		a.subsMu.Unlock()
		if dead {
			log.Print("окно закрыто — выходим")
			os.Exit(0)
		}
	}
}
