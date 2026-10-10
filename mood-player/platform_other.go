//go:build !windows

package main

import (
	"log"
	"os/exec"
)

// На Linux/macOS (для разработки) хоткеев и детекта игр нет.
func startHotkeys(fire func(string)) {}

func runningGame(want map[string]bool) string { return "" }

func openBrowser(dir, url string) {
	if err := exec.Command("xdg-open", url).Start(); err != nil {
		if err := exec.Command("open", url).Start(); err != nil {
			log.Printf("откройте %s", url)
		}
	}
}
