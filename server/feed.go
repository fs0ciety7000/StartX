package main

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"html"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	xhtml "golang.org/x/net/html"
	"golang.org/x/net/html/charset"
)

const (
	maxItems   = 50
	summaryLen = 280
	okTTL      = 10 * time.Minute
	errTTL     = 2 * time.Minute
	cacheSize  = 512
)

// Feed is what /api/feed returns: RSS 2.0, RSS 1.0 (RDF) and Atom normalised to one shape.
type Feed struct {
	URL   string `json:"url"`
	Title string `json:"title"`
	Site  string `json:"site"`
	Items []Item `json:"items"`
}

type Item struct {
	Title   string `json:"title"`
	Link    string `json:"link"`
	Date    string `json:"date"`
	Summary string `json:"summary"`
}

// ---------- XML shapes (local names only, so namespaces don't matter) ----------

type xmlLink struct {
	Href string `xml:"href,attr"`
	Rel  string `xml:"rel,attr"`
	Text string `xml:",chardata"`
}

type xmlItem struct {
	Title       string    `xml:"title"`
	Links       []xmlLink `xml:"link"`
	GUID        string    `xml:"guid"`
	PubDate     string    `xml:"pubDate"`
	DCDate      string    `xml:"date"`
	Published   string    `xml:"published"`
	Updated     string    `xml:"updated"`
	Description string    `xml:"description"`
	Summary     string    `xml:"summary"`
	Content     string    `xml:"content"`
	Encoded     string    `xml:"encoded"`
}

type xmlChannel struct {
	Title string    `xml:"title"`
	Links []xmlLink `xml:"link"`
	Items []xmlItem `xml:"item"`
}

type xmlDoc struct {
	XMLName xml.Name
	Channel *xmlChannel `xml:"channel"`
	Title   string      `xml:"title"`
	Links   []xmlLink   `xml:"link"`
	Entries []xmlItem   `xml:"entry"`
	Items   []xmlItem   `xml:"item"`
}

var errNotFeed = errors.New("pas un flux RSS ou Atom")

// parseFeed reads RSS 2.0, RSS 1.0/RDF or Atom. base resolves relative links.
func parseFeed(body []byte, base *url.URL) (*Feed, error) {
	dec := xml.NewDecoder(bytes.NewReader(body))
	dec.Strict = false
	dec.Entity = xml.HTMLEntity
	dec.CharsetReader = charset.NewReaderLabel
	var doc xmlDoc
	if err := dec.Decode(&doc); err != nil {
		return nil, errNotFeed
	}
	f := &Feed{}
	var items []xmlItem
	switch strings.ToLower(doc.XMLName.Local) {
	case "rss":
		if doc.Channel == nil {
			return nil, errNotFeed
		}
		f.Title, f.Site, items = doc.Channel.Title, pickLink(doc.Channel.Links, base), doc.Channel.Items
	case "rdf":
		if doc.Channel != nil {
			f.Title, f.Site = doc.Channel.Title, pickLink(doc.Channel.Links, base)
		}
		items = doc.Items
	case "feed":
		f.Title, f.Site, items = doc.Title, pickLink(doc.Links, base), doc.Entries
	default:
		return nil, errNotFeed
	}
	f.Title = clean(f.Title, 120)
	if f.Site == "" && base != nil {
		f.Site = base.Scheme + "://" + base.Host + "/"
	}
	if f.Title == "" && base != nil {
		f.Title = strings.TrimPrefix(base.Hostname(), "www.")
	}
	seen := map[string]bool{}
	for _, it := range items {
		link := pickLink(it.Links, base)
		if link == "" && strings.HasPrefix(it.GUID, "http") {
			link = resolve(base, it.GUID)
		}
		title := clean(it.Title, 300)
		if link == "" || title == "" || seen[link] {
			continue
		}
		seen[link] = true
		summary := firstNonEmpty(it.Description, it.Summary, it.Encoded, it.Content)
		f.Items = append(f.Items, Item{
			Title:   title,
			Link:    link,
			Date:    parseDate(firstNonEmpty(it.PubDate, it.Published, it.DCDate, it.Updated)),
			Summary: clean(stripTags(summary), summaryLen),
		})
		if len(f.Items) == maxItems {
			break
		}
	}
	if f.Items == nil {
		f.Items = []Item{}
	}
	return f, nil
}

// pickLink prefers rel="alternate" (Atom), then any href, then RSS's text link.
func pickLink(links []xmlLink, base *url.URL) string {
	var best string
	for _, l := range links {
		href := strings.TrimSpace(l.Href)
		if href == "" {
			href = strings.TrimSpace(l.Text)
		}
		if href == "" || l.Rel == "self" || l.Rel == "hub" || l.Rel == "enclosure" {
			continue
		}
		if l.Rel == "" || l.Rel == "alternate" {
			if r := resolve(base, href); r != "" {
				if l.Rel == "alternate" {
					return r
				}
				if best == "" {
					best = r
				}
			}
		}
	}
	return best
}

func resolve(base *url.URL, ref string) string {
	u, err := url.Parse(strings.TrimSpace(ref))
	if err != nil {
		return ""
	}
	if base != nil {
		u = base.ResolveReference(u)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return ""
	}
	return u.String()
}

var dateLayouts = []string{
	time.RFC1123Z, time.RFC1123, time.RFC3339, time.RFC3339Nano, time.RFC822Z, time.RFC822,
	"Mon, 2 Jan 2006 15:04:05 -0700", "Mon, 2 Jan 2006 15:04:05 MST", "2 Jan 2006 15:04:05 -0700",
	"Mon, 02 Jan 2006 15:04 -0700", "Mon, 2 Jan 2006 15:04:05", "2006-01-02T15:04:05", "2006-01-02 15:04:05",
	"2006-01-02T15:04:05-07:00", "2006-01-02", "Mon, 02 Jan 06 15:04:05 -0700",
}

func parseDate(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	for _, l := range dateLayouts {
		if t, err := time.Parse(l, s); err == nil {
			// Feeds sometimes date items in the future (scheduled posts, bad clocks): clamp to now.
			if now := time.Now(); t.After(now) {
				t = now
			}
			return t.UTC().Format(time.RFC3339)
		}
	}
	return ""
}

var (
	tagRe   = regexp.MustCompile(`(?s)<[^>]*>`)
	spaceRe = regexp.MustCompile(`\s+`)
)

func stripTags(s string) string { return tagRe.ReplaceAllString(s, " ") }

// clean unescapes entities, collapses whitespace and truncates on a rune boundary.
// The client renders text only (never HTML), so this is presentation, not sanitisation.
func clean(s string, max int) string {
	s = html.UnescapeString(html.UnescapeString(s))
	s = strings.TrimSpace(spaceRe.ReplaceAllString(s, " "))
	if r := []rune(s); len(r) > max {
		s = strings.TrimSpace(string(r[:max-1])) + "…"
	}
	return s
}

func firstNonEmpty(v ...string) string {
	for _, s := range v {
		if strings.TrimSpace(s) != "" {
			return s
		}
	}
	return ""
}

// ---------- Discovery: a site's home page → its feed ----------

func looksLikeHTML(f *fetched) bool {
	if strings.Contains(strings.ToLower(f.contentType), "html") {
		return true
	}
	head := bytes.ToLower(bytes.TrimSpace(f.body[:min(len(f.body), 512)]))
	return bytes.HasPrefix(head, []byte("<!doctype html")) || bytes.HasPrefix(head, []byte("<html"))
}

// discoverFeeds returns <link rel="alternate" type="application/(rss|atom)+xml"> hrefs, in page order.
func discoverFeeds(body []byte, base *url.URL) []string {
	z := xhtml.NewTokenizer(bytes.NewReader(body))
	var out []string
	for {
		switch z.Next() {
		case xhtml.ErrorToken:
			return out
		case xhtml.StartTagToken, xhtml.SelfClosingTagToken:
			name, hasAttr := z.TagName()
			if string(name) == "body" {
				return out
			}
			if string(name) != "link" || !hasAttr {
				continue
			}
			var rel, typ, href string
			for {
				k, v, more := z.TagAttr()
				switch string(k) {
				case "rel":
					rel = strings.ToLower(string(v))
				case "type":
					typ = strings.ToLower(string(v))
				case "href":
					href = string(v)
				}
				if !more {
					break
				}
			}
			if strings.Contains(rel, "alternate") && (strings.Contains(typ, "rss") || strings.Contains(typ, "atom") || strings.Contains(typ, "rdf")) {
				if r := resolve(base, href); r != "" {
					out = append(out, r)
				}
			}
		}
	}
}

var commonFeedPaths = []string{"/feed", "/rss", "/feed.xml", "/rss.xml", "/atom.xml", "/index.xml", "/feed/"}

// Load fetches raw (a feed or a web page) and returns the parsed feed.
func (f *Fetcher) Load(ctx context.Context, raw string) (*Feed, error) {
	first, err := f.get(ctx, raw)
	if err != nil {
		// Some sites refuse robots on their home page but serve their feed: try the usual paths.
		u, perr := url.Parse(raw)
		if errors.Is(err, errBlocked) || perr != nil || (u.Path != "" && u.Path != "/") {
			return nil, err
		}
		if feed := f.tryCandidates(ctx, u, nil); feed != nil {
			return feed, nil
		}
		return nil, err
	}
	base, _ := url.Parse(first.url)
	if !looksLikeHTML(first) {
		feed, err := parseFeed(first.body, base)
		if err != nil {
			return nil, err
		}
		feed.URL = first.url
		return feed, nil
	}
	if feed := f.tryCandidates(ctx, base, discoverFeeds(first.body, base)); feed != nil {
		return feed, nil
	}
	return nil, errors.New("aucun flux trouvé sur cette page")
}

// tryCandidates reads the discovered feeds, then the usual paths, and returns the first that parses.
func (f *Fetcher) tryCandidates(ctx context.Context, base *url.URL, discovered []string) *Feed {
	candidates := discovered
	for _, p := range commonFeedPaths {
		candidates = append(candidates, resolve(base, p))
	}
	seen := map[string]bool{}
	for _, c := range candidates {
		if c == "" || seen[c] || len(seen) >= 8 {
			continue
		}
		seen[c] = true
		res, err := f.get(ctx, c)
		if err != nil || looksLikeHTML(res) {
			continue
		}
		cu, _ := url.Parse(res.url)
		if feed, err := parseFeed(res.body, cu); err == nil {
			feed.URL = res.url
			return feed
		}
	}
	return nil
}

// ---------- Cache with request coalescing ----------

type cacheEntry struct {
	feed *Feed
	err  error
	exp  time.Time
	done chan struct{}
}

type feedCache struct {
	mu      sync.Mutex
	entries map[string]*cacheEntry
}

func (c *feedCache) get(ctx context.Context, key string, load func(context.Context) (*Feed, error)) (*Feed, error) {
	c.mu.Lock()
	for {
		e, ok := c.entries[key]
		if !ok {
			break
		}
		c.mu.Unlock()
		<-e.done
		if time.Now().Before(e.exp) {
			return e.feed, e.err
		}
		c.mu.Lock()
		if c.entries[key] == e {
			delete(c.entries, key)
		}
		// Someone else may have started a fresh load meanwhile: look again.
	}
	if len(c.entries) >= cacheSize {
		c.evictLocked()
	}
	e := &cacheEntry{done: make(chan struct{})}
	c.entries[key] = e
	c.mu.Unlock()

	defer close(e.done)
	e.exp = time.Now().Add(errTTL)
	e.err = errors.New("lecture interrompue")
	// Detached from the request (a closed tab must not poison the shared entry), and short
	// enough to answer within the server's WriteTimeout.
	lctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 20*time.Second)
	defer cancel()
	e.feed, e.err = load(lctx)
	if e.err == nil {
		e.exp = time.Now().Add(okTTL)
	} else {
		e.exp = time.Now().Add(errTTL)
	}
	return e.feed, e.err
}

func (c *feedCache) evictLocked() {
	now := time.Now()
	for k, e := range c.entries {
		select {
		case <-e.done:
			if now.After(e.exp) || len(c.entries) >= cacheSize {
				delete(c.entries, k)
			}
		default:
		}
		if len(c.entries) < cacheSize*3/4 {
			return
		}
	}
}

func feedHandler(f *Fetcher) http.Handler {
	cache := &feedCache{entries: map[string]*cacheEntry{}}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		raw := strings.TrimSpace(r.URL.Query().Get("url"))
		if raw == "" || len(raw) > 2048 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "paramètre url manquant"})
			return
		}
		if !strings.Contains(raw, "://") {
			raw = "https://" + raw
		}
		feed, err := cache.get(r.Context(), raw, func(ctx context.Context) (*Feed, error) { return f.Load(ctx, raw) })
		if err != nil {
			status := http.StatusBadGateway
			if errors.Is(err, errBlocked) {
				status = http.StatusForbidden
			}
			writeJSON(w, status, map[string]string{"error": err.Error()})
			return
		}
		w.Header().Set("Cache-Control", "public, max-age=300")
		writeJSON(w, http.StatusOK, feed)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}
