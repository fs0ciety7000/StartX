package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"strconv"
	"syscall"
	"time"
)

const (
	maxBody      = 4 << 20 // 4 MiB: a feed bigger than that is not worth reading on a startpage
	fetchTimeout = 10 * time.Second
	userAgent    = "Mozilla/5.0 (compatible; StartX/1.0; +https://github.com/fs0ciety7000/StartX)"
)

var errBlocked = errors.New("adresse non autorisée")

// The proxy fetches URLs chosen by visitors: it must never reach the host's own network.
var blockedPrefixes = []netip.Prefix{
	netip.MustParsePrefix("0.0.0.0/8"),
	netip.MustParsePrefix("100.64.0.0/10"), // CGNAT, Tailscale
	netip.MustParsePrefix("192.0.0.0/24"),
	netip.MustParsePrefix("198.18.0.0/15"),
	netip.MustParsePrefix("240.0.0.0/4"),
	netip.MustParsePrefix("64:ff9b::/96"),
	netip.MustParsePrefix("2001:db8::/32"),
}

func publicIP(a netip.Addr) bool {
	a = a.Unmap()
	if !a.IsValid() || a.IsLoopback() || a.IsPrivate() || a.IsUnspecified() || a.IsMulticast() ||
		a.IsLinkLocalUnicast() || a.IsLinkLocalMulticast() || a.IsInterfaceLocalMulticast() {
		return false
	}
	for _, p := range blockedPrefixes {
		if p.Contains(a) {
			return false
		}
	}
	return true
}

var allowedPorts = map[string]bool{"": true, "80": true, "443": true, "8080": true, "8443": true}

// checkURL rejects anything but http(s) on usual ports to a host that resolves only to public addresses.
func checkURL(ctx context.Context, u *url.URL, resolve bool) error {
	if u.Scheme != "http" && u.Scheme != "https" {
		return errBlocked
	}
	if u.User != nil || u.Hostname() == "" || !allowedPorts[u.Port()] {
		return errBlocked
	}
	host := u.Hostname()
	if ip, err := netip.ParseAddr(host); err == nil {
		if !publicIP(ip) {
			return errBlocked
		}
		return nil
	}
	if !resolve {
		return nil
	}
	ips, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
	if err != nil {
		return fmt.Errorf("site introuvable (%s)", host)
	}
	for _, ip := range ips {
		if !publicIP(ip) {
			return errBlocked
		}
	}
	return nil
}

type FetcherOptions struct {
	// UseEnvProxy routes requests through HTTPS_PROXY (development sandboxes only). The dial-time
	// address check then sees the proxy, so URLs are resolved and checked before each request.
	UseEnvProxy bool
}

type Fetcher struct {
	client  *http.Client
	viaProx bool
}

func NewFetcher(opt FetcherOptions) *Fetcher {
	dialer := &net.Dialer{
		Timeout: 5 * time.Second,
		// Checked on the address actually dialled, after DNS: defeats rebinding between check and connect.
		Control: func(_, address string, _ syscall.RawConn) error {
			host, port, err := net.SplitHostPort(address)
			if err != nil {
				return err
			}
			ip, err := netip.ParseAddr(host)
			if err != nil || !publicIP(ip) || !allowedPorts[port] {
				return errBlocked
			}
			return nil
		},
	}
	tr := &http.Transport{
		DialContext:           dialer.DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          64,
		IdleConnTimeout:       60 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		ResponseHeaderTimeout: 8 * time.Second,
	}
	if opt.UseEnvProxy {
		tr.Proxy = http.ProxyFromEnvironment
		tr.DialContext = (&net.Dialer{Timeout: 5 * time.Second}).DialContext
	}
	f := &Fetcher{viaProx: opt.UseEnvProxy}
	f.client = &http.Client{
		Transport: tr,
		Timeout:   fetchTimeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return errors.New("trop de redirections")
			}
			return checkURL(req.Context(), req.URL, f.viaProx)
		},
	}
	return f
}

type fetched struct {
	url         string // final URL, after redirects
	contentType string
	body        []byte
}

func (f *Fetcher) get(ctx context.Context, raw string) (*fetched, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, errors.New("adresse invalide")
	}
	if err := checkURL(ctx, u, f.viaProx); err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, errors.New("adresse invalide")
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/rss+xml, application/atom+xml, application/rdf+xml;q=0.9, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5")
	req.Header.Set("Accept-Language", "fr,en;q=0.8")
	res, err := f.client.Do(req)
	if err != nil {
		if errors.Is(err, errBlocked) {
			return nil, errBlocked
		}
		var ne net.Error
		if errors.As(err, &ne) && ne.Timeout() {
			return nil, errors.New("le site ne répond pas")
		}
		return nil, errors.New("site injoignable")
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("le site répond %s", strconv.Itoa(res.StatusCode))
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, maxBody+1))
	if err != nil {
		return nil, errors.New("lecture interrompue")
	}
	if len(body) > maxBody {
		return nil, errors.New("flux trop volumineux")
	}
	return &fetched{url: res.Request.URL.String(), contentType: res.Header.Get("Content-Type"), body: body}, nil
}
