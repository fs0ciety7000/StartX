package main

import (
	"net"
	"net/http"
	"net/netip"
	"strings"
	"sync"
	"time"
)

// rateLimiter is a fixed-window counter per client IP: enough to keep the feed proxy
// from being used as a free crawler, without any state worth persisting.
type rateLimiter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	start  time.Time
	counts map[string]int
}

const maxTracked = 50_000

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{limit: limit, window: window, start: time.Now(), counts: map[string]int{}}
}

func (l *rateLimiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if time.Since(l.start) > l.window || len(l.counts) >= maxTracked {
		l.start = time.Now()
		clear(l.counts)
	}
	l.counts[ip]++
	return l.counts[ip] <= l.limit
}

func (l *rateLimiter) wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !l.allow(clientIP(r)) {
			w.Header().Set("Retry-After", "60")
			writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "trop de requêtes, réessaie dans une minute"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Cloudflare's published edge ranges (https://www.cloudflare.com/ips/).
var cloudflare = func() []netip.Prefix {
	var out []netip.Prefix
	for _, s := range []string{
		"173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18",
		"190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
		"104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22", "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32",
		"2405:b500::/32", "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
	} {
		out = append(out, netip.MustParsePrefix(s))
	}
	return out
}()

func fromCloudflare(ip string) bool {
	a, err := netip.ParseAddr(ip)
	if err != nil {
		return false
	}
	a = a.Unmap()
	for _, p := range cloudflare {
		if p.Contains(a) {
			return true
		}
	}
	return false
}

// clientIP: the direct peer, or when it is a local proxy (Traefik), the last X-Forwarded-For hop,
// which that proxy appended itself. Only when that hop is a Cloudflare edge is CF-Connecting-IP
// believed: anyone reaching the origin directly can write whatever headers they like.
func clientIP(r *http.Request) string {
	peer, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		peer = r.RemoteAddr
	}
	if a, err := netip.ParseAddr(peer); err == nil && (a.IsPrivate() || a.IsLoopback()) {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			hops := strings.Split(xff, ",")
			peer = strings.TrimSpace(hops[len(hops)-1])
		}
	}
	if fromCloudflare(peer) {
		if cf := strings.TrimSpace(r.Header.Get("CF-Connecting-IP")); cf != "" {
			return cf
		}
	}
	return peer
}
