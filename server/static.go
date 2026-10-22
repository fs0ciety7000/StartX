package main

import (
	"embed"
	"encoding/json"
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"
)

// dist is the Vite build (web/dist), copied here by the Dockerfile before `go build`.
//
//go:embed all:dist
var dist embed.FS

// csp: scripts and styles from the app only. Inline style *attributes* are allowed because
// Svelte's style: directives set them; there is no inline <script> or <style>.
// Images: any https (site favicons, custom icons). Weather is fetched from Open-Meteo by the browser.
const csp = "default-src 'self'; " +
	"script-src 'self'; " +
	"style-src 'self'; style-src-attr 'unsafe-inline'; " +
	"img-src 'self' data: https:; " +
	"font-src 'self'; " +
	"connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com; " +
	"base-uri 'self'; form-action 'none'; object-src 'none'; frame-ancestors 'none'"

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Security-Policy", csp)
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Cross-Origin-Opener-Policy", "same-origin")
		h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		h.Set("X-Robots-Tag", "noindex, nofollow")
		next.ServeHTTP(w, r)
	})
}

// staticHandler serves the app. dir (STARTX_STATIC) overrides the embedded build, for development.
// Unknown paths without an extension fall back to index.html (single-page app).
func staticHandler(dir string) http.Handler {
	var root fs.FS
	if dir != "" {
		root = os.DirFS(dir)
	} else {
		sub, err := fs.Sub(dist, "dist")
		if err != nil {
			panic(err)
		}
		root = sub
	}
	files := http.FileServerFS(root)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		p := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		switch {
		case strings.HasPrefix(p, "assets/"), strings.HasPrefix(p, "fonts/"):
			// Vite fingerprints assets/; fonts never change.
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		case strings.HasSuffix(p, ".webp"), strings.HasSuffix(p, ".svg"):
			w.Header().Set("Cache-Control", "public, max-age=604800")
		default:
			w.Header().Set("Cache-Control", "no-cache")
		}
		if p == "" || p == "." {
			files.ServeHTTP(w, r)
			return
		}
		if _, err := fs.Stat(root, p); err != nil {
			if path.Ext(p) != "" {
				http.NotFound(w, r)
				return
			}
			r = r.Clone(r.Context())
			r.URL.Path = "/"
		}
		files.ServeHTTP(w, r)
	})
}

// defaultsHandler serves STARTX_DEFAULT_CONFIG (a JSON export of a StartX config): the layout a
// browser starts from on its first visit. 204 when unset, so the built-in default applies.
func defaultsHandler(file string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		if file == "" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		b, err := os.ReadFile(file)
		if err != nil || !json.Valid(b) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(b)
	})
}
