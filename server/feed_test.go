package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"net/url"
	"strings"
	"testing"
)

func mustURL(s string) *url.URL {
	u, _ := url.Parse(s)
	return u
}

func TestParseRSS2(t *testing.T) {
	body := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>Korben</title>
  <atom:link href="https://korben.info/feed" rel="self" type="application/rss+xml"/>
  <link>https://korben.info</link>
  <item>
    <title><![CDATA[Un outil &amp; une astuce]]></title>
    <link>https://korben.info/outil.html</link>
    <pubDate>Wed, 21 Oct 2026 08:30:00 +0200</pubDate>
    <description><![CDATA[<p>Un <b>super</b> outil.</p>]]></description>
  </item>
  <item><title>Sans lien</title></item>
</channel></rss>`
	f, err := parseFeed([]byte(body), mustURL("https://korben.info/feed"))
	if err != nil {
		t.Fatal(err)
	}
	if f.Title != "Korben" || f.Site != "https://korben.info" {
		t.Fatalf("channel: %+v", f)
	}
	if len(f.Items) != 1 {
		t.Fatalf("items: %d", len(f.Items))
	}
	it := f.Items[0]
	if it.Title != "Un outil & une astuce" || it.Link != "https://korben.info/outil.html" || it.Summary != "Un super outil." {
		t.Fatalf("item: %+v", it)
	}
	if it.Date != "2026-10-21T06:30:00Z" {
		t.Fatalf("date: %q", it.Date)
	}
}

func TestParseAtom(t *testing.T) {
	body := `<feed xmlns="http://www.w3.org/2005/Atom"><title>Go Blog</title>
<link rel="self" href="https://go.dev/blog/feed.atom"/><link rel="alternate" href="https://go.dev/blog/"/>
<entry><title>Go 1.26</title><link rel="alternate" href="/blog/go1.26"/><published>2026-02-10T00:00:00Z</published>
<summary type="html">&lt;p&gt;Release&lt;/p&gt;</summary></entry></feed>`
	f, err := parseFeed([]byte(body), mustURL("https://go.dev/blog/feed.atom"))
	if err != nil {
		t.Fatal(err)
	}
	if f.Site != "https://go.dev/blog/" || len(f.Items) != 1 || f.Items[0].Link != "https://go.dev/blog/go1.26" || f.Items[0].Summary != "Release" {
		t.Fatalf("%+v", f)
	}
}

func TestParseRDFAndLatin1(t *testing.T) {
	body := "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>\n<rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\" xmlns=\"http://purl.org/rss/1.0/\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\">" +
		"<channel><title>Caf\xe9</title><link>https://example.org/</link></channel>" +
		"<item><title>\xc9t\xe9</title><link>https://example.org/a</link><dc:date>2026-06-01T10:00:00+00:00</dc:date></item></rdf:RDF>"
	f, err := parseFeed([]byte(body), mustURL("https://example.org/rss"))
	if err != nil {
		t.Fatal(err)
	}
	if f.Title != "Café" || len(f.Items) != 1 || f.Items[0].Title != "Été" || f.Items[0].Date == "" {
		t.Fatalf("%+v", f)
	}
}

func TestParseRejectsHTML(t *testing.T) {
	if _, err := parseFeed([]byte("<html><body>hi</body></html>"), nil); !errors.Is(err, errNotFeed) {
		t.Fatalf("want errNotFeed, got %v", err)
	}
}

func TestDiscover(t *testing.T) {
	page := `<!doctype html><html><head>
<link rel="stylesheet" href="/s.css">
<link rel="alternate" type="application/rss+xml" title="Flux" href="/feed/">
<link rel="alternate" type="application/atom+xml" href="https://cdn.example.org/atom.xml">
</head><body><link rel="alternate" type="application/rss+xml" href="/ignored"></body></html>`
	got := discoverFeeds([]byte(page), mustURL("https://www.numerama.com/"))
	want := []string{"https://www.numerama.com/feed/", "https://cdn.example.org/atom.xml"}
	if strings.Join(got, ",") != strings.Join(want, ",") {
		t.Fatalf("got %v", got)
	}
}

func TestPublicIP(t *testing.T) {
	for _, s := range []string{"127.0.0.1", "10.0.0.8", "192.168.1.1", "172.17.0.2", "169.254.169.254", "100.100.1.1", "::1", "fe80::1", "::ffff:127.0.0.1", "0.0.0.0"} {
		if publicIP(netip.MustParseAddr(s)) {
			t.Errorf("%s should be blocked", s)
		}
	}
	for _, s := range []string{"1.1.1.1", "152.53.176.13", "2606:4700::1111"} {
		if !publicIP(netip.MustParseAddr(s)) {
			t.Errorf("%s should be allowed", s)
		}
	}
}

func TestCheckURL(t *testing.T) {
	ctx := context.Background()
	for _, s := range []string{"file:///etc/passwd", "http://127.0.0.1/", "http://[::1]:80/", "https://user:pw@example.org/", "http://example.org:22/", "gopher://example.org/"} {
		if err := checkURL(ctx, mustURL(s), false); err == nil {
			t.Errorf("%s should be rejected", s)
		}
	}
	if err := checkURL(ctx, mustURL("https://example.org/feed"), false); err != nil {
		t.Errorf("public URL rejected: %v", err)
	}
}

// The dial-time guard must stop a request to a local server even though the URL looks fine.
func TestFetcherBlocksLoopback(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("secret")) }))
	defer srv.Close()
	f := NewFetcher(FetcherOptions{})
	if _, err := f.get(context.Background(), srv.URL); err == nil {
		t.Fatal("loopback fetch should fail")
	}
}

func TestFeedHandlerErrors(t *testing.T) {
	h := feedHandler(NewFetcher(FetcherOptions{}))
	for path, status := range map[string]int{"/api/feed": 400, "/api/feed?url=http://127.0.0.1/": 403} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		var body map[string]string
		_ = json.Unmarshal(rec.Body.Bytes(), &body)
		if rec.Code != status || body["error"] == "" {
			t.Errorf("%s: got %d %v", path, rec.Code, body)
		}
	}
}

func TestStaticFallback(t *testing.T) {
	dir := t.TempDir()
	h := staticHandler(dir)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/missing.js", nil))
	if rec.Code != 404 {
		t.Fatalf("asset miss: %d", rec.Code)
	}
}

func TestRateLimit(t *testing.T) {
	l := newRateLimiter(2, 60e9)
	if !l.allow("a") || !l.allow("a") || l.allow("a") || !l.allow("b") {
		t.Fatal("limiter")
	}
}
