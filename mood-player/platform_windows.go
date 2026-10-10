//go:build windows

package main

import (
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"unsafe"
)

var (
	user32          = syscall.NewLazyDLL("user32.dll")
	pRegisterHotKey = user32.NewProc("RegisterHotKey")
	pGetMessageW    = user32.NewProc("GetMessageW")
)

const (
	modAlt      = 0x0001
	modControl  = 0x0002
	modNoRepeat = 0x4000
	wmHotkey    = 0x0312
)

// Глобальные хоткеи работают поверх игры (Dota в оконном/безрамочном и полноэкранном режиме).
var hotkeys = []struct {
	vk     uintptr
	action string
}{
	{0x23, "ban"},       // Ctrl+Alt+End      — удалить песню навсегда
	{0x22, "next"},      // Ctrl+Alt+PageDown — следующая
	{0x24, "playpause"}, // Ctrl+Alt+Home     — пауза / играть
	{0x2D, "love"},      // Ctrl+Alt+Insert   — нравится (будет чаще)
	{0x21, "mood"},      // Ctrl+Alt+PageUp   — сменить настроение
}

func startHotkeys(fire func(string)) {
	runtime.LockOSThread() // сообщения WM_HOTKEY приходят в поток, который регистрировал
	for i, h := range hotkeys {
		r, _, err := pRegisterHotKey.Call(0, uintptr(i+1), modControl|modAlt|modNoRepeat, h.vk)
		if r == 0 {
			log.Printf("хоткей %s занят: %v", h.action, err)
		}
	}
	var msg struct {
		hwnd    uintptr
		message uint32
		wParam  uintptr
		lParam  uintptr
		time    uint32
		pt      struct{ x, y int32 }
		private uint32
	}
	for {
		r, _, _ := pGetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		if int32(r) <= 0 {
			return
		}
		if msg.message == wmHotkey {
			if id := int(msg.wParam); id >= 1 && id <= len(hotkeys) {
				fire(hotkeys[id-1].action)
			}
		}
	}
}

func runningGame(want map[string]bool) string {
	snap, err := syscall.CreateToolhelp32Snapshot(syscall.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return ""
	}
	defer syscall.CloseHandle(snap)
	var e syscall.ProcessEntry32
	e.Size = uint32(unsafe.Sizeof(e))
	for err = syscall.Process32First(snap, &e); err == nil; err = syscall.Process32Next(snap, &e) {
		name := strings.ToLower(syscall.UTF16ToString(e.ExeFile[:]))
		if want[name] {
			return name
		}
	}
	return ""
}

// openBrowser открывает плеер отдельным лёгким окном Edge (есть в любой Windows 10/11,
// умеет DRM для Apple Music). Свой профиль — вход в Apple ID запоминается.
func openBrowser(dir, url string) {
	candidates := []string{
		filepath.Join(os.Getenv("ProgramFiles(x86)"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("ProgramFiles"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("LocalAppData"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("ProgramFiles"), `Google\Chrome\Application\chrome.exe`),
		filepath.Join(os.Getenv("LocalAppData"), `Google\Chrome\Application\chrome.exe`),
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err != nil {
			continue
		}
		cmd := exec.Command(c,
			"--app="+url,
			"--user-data-dir="+filepath.Join(dir, "edge-profile"),
			"--window-size=440,720",
			"--no-first-run",
			"--no-default-browser-check",
			"--disable-extensions",
			"--disable-sync",
			"--disable-background-networking",
			"--disable-component-update",
			"--disable-features=msEdgeSidebarV2,msHubApps,Translate,EdgeCollections,msShoppingTrigger,MediaRouter",
			"--renderer-process-limit=2",
		)
		if err := cmd.Start(); err == nil {
			return
		}
	}
	_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}
