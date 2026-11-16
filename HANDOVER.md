# CIL Centre for Sustainable Energy website: handover for the server administrator

This package replaces the current website of the CIL Centre for Sustainable Energy, IIT Madras.

**Main address:** https://energy.iitm.ac.in/
**Also served:** https://www.energyiitm.org/ and https://cse.energyiitm.org/ (and energyiitm.org, which already redirects to www)

## Urgent, independent of this update (checked 4 November 2026)

- The HTTPS certificate of energy.iitm.ac.in (`*.iitm.ac.in`, Sectigo, IIT Madras) has been renewed (checked 4 November 2026) and is valid until 16 May 2027. Its renewal stays with the IIT Madras IT team.
- **http://www.energyiitm.org and http://cse.energyiitm.org do not redirect to HTTPS**: they serve the site unencrypted. Their certificate is from AWS Certificate Manager, so TLS ends at an AWS load balancer (or CloudFront) in front of nginx. Add the redirect there: on the load balancer's HTTP:80 listener, set the default action to *Redirect to HTTPS, port 443, status 301* (or, in CloudFront, Viewer protocol policy *Redirect HTTP to HTTPS*). energy.iitm.ac.in already redirects.
- Good: all three addresses accept only TLS 1.2 and 1.3.

## What we found on the current server (checked 2 November 2026)

- All three addresses return the same file (same ETag and Last-Modified), so they share **one nginx document root** on one server. The `www.energyiitm.org` responses come from `nginx/1.24.0 (Ubuntu)`.
- `energy.iitm.ac.in` responses carry extra security headers (HSTS, CSP and others) and a plain `nginx` server header, so they probably pass through an IIT Madras proxy or a separate server block.
- The current site is a single-page app: every address, even one that does not exist, returns the home page with status 200. The new site has real pages and a real 404 page, so **that fallback must be removed** (step 4).

## What is in the package

| Path | What it is |
|---|---|
| `site/` | The complete website. Its contents go into the document root (`index.html` at the top). Plain static files: no database, no server-side code, no build step. |
| `nginx/cil-cse-headers.conf` | The site's security headers (Content-Security-Policy, HSTS and others) |
| `nginx/cil-cse-site.conf` | The rules for the site: clean addresses, 404 page, caching, compression. It includes the headers file. |
| `nginx/example-server.conf` | An example server block showing where the include goes, and an optional redirect of the other addresses to the main one |

## Steps

Commands assume Ubuntu with nginx, and sudo rights. Replace `/var/www/cil-cse` with the real document root.

1. **Find the document root and the server block(s).**
   `sudo nginx -T | grep -n -E "server_name|root |try_files|include"`
   Note the `root` used for energy.iitm.ac.in, www.energyiitm.org and cse.energyiitm.org, and the file each server block is in.

2. **Back up** the current site and configuration (for rollback).
   ```
   sudo tar czf ~/cil-cse-old-site-$(date +%F).tgz -C /var/www/cil-cse .
   sudo cp -a /etc/nginx ~/nginx-backup-$(date +%F)
   ```

3. **Put the new files in place.** Copy the zip to the server, then:
   ```
   unzip -q CIL-CSE-website-*.zip -d ~/cil-cse-new
   sudo rsync -a --delete ~/cil-cse-new/site/ /var/www/cil-cse/
   sudo chown -R www-data:www-data /var/www/cil-cse     # or the owner the old files had
   sudo find /var/www/cil-cse -type d -exec chmod 755 {} +
   sudo find /var/www/cil-cse -type f -exec chmod 644 {} +
   ```
   `--delete` removes the old app's files, which the new site does not use.

4. **nginx configuration.**
   ```
   sudo cp ~/cil-cse-new/nginx/cil-cse-headers.conf ~/cil-cse-new/nginx/cil-cse-site.conf /etc/nginx/snippets/
   ```
   In each server block that serves the site:
   - remove the old `location / { ... try_files $uri /index.html; }` (the single-page-app fallback) and any other `location` or `add_header` lines that only existed for the old app;
   - keep `listen`, `server_name`, the SSL certificate lines and `root`;
   - add, after `root`: `include snippets/cil-cse-site.conf;`

   Then test and reload:
   ```
   sudo nginx -t && sudo systemctl reload nginx
   ```
   If `nginx -t` reports a directive as **duplicate** (for example `gzip`, `server_tokens`, `charset` or `absolute_redirect`), the server block already sets it: delete that line from the server block (the include sets the same value) and test again. A **duplicate location "/"** means the old `location /` is still there.

5. **energy.iitm.ac.in proxy.** If energy.iitm.ac.in reaches this server through an IIT Madras proxy, please confirm with the IIT Madras network team:
   - which `Host` header the proxy sends (needed before enabling the optional redirect in `example-server.conf`);
   - that it passes 404 status codes through unchanged, and does not cache pages for long (pages are sent with `Cache-Control: no-cache`).
   The proxy currently adds its own Content-Security-Policy. Browsers apply both policies, so the site's stricter policy still holds; nothing needs changing there.

6. **Optional: one address for search engines.** When the above is confirmed, the second server block in `example-server.conf` sends www.energyiitm.org and cse.energyiitm.org to https://energy.iitm.ac.in with a permanent (301) redirect. Without it the site still works on all addresses; every page already names https://energy.iitm.ac.in/ as its canonical address.

## Checks after the switch

```
curl -sI https://energy.iitm.ac.in/            | head -1      # 200
curl -sI https://energy.iitm.ac.in/about       | grep -i location   # /about/ (301)
curl -sI https://energy.iitm.ac.in/no-such-page| head -1      # 404 (not 200)
curl -sI https://energy.iitm.ac.in/            | grep -i content-security-policy
curl -sI https://www.energyiitm.org/           | head -1      # 200, or 301 if step 6 is done
curl -sI https://energy.iitm.ac.in/favicon.ico | head -1      # 200
curl -s  https://energy.iitm.ac.in/.well-known/security.txt  # Contact: mailto:...
curl -sI -X POST https://energy.iitm.ac.in/    | head -1      # 405 (only GET and HEAD are allowed)
curl -sI https://energy.iitm.ac.in/.env        | head -1      # 404 (hidden files are never served)
```
In a browser: the home page, About, a research project page, News & Events (open a photo), and an address that does not exist (the site's own 404 page should show). The browser console should show no Content-Security-Policy errors.

## Rollback

```
sudo rsync -a --delete <folder with the unpacked old-site backup>/ /var/www/cil-cse/
sudo cp -a ~/nginx-backup-<date>/. /etc/nginx/ && sudo nginx -t && sudo systemctl reload nginx
```

## Later updates

The website team will send a new zip at least once a month (some content, such as closing dates and upcoming events, is fixed when the site is built). Each update comes as a new zip. Repeat step 3 (`rsync --delete` of the new `site/` folder). The nginx files only need copying again if they changed (the update notes will say so). No reload is needed for content-only updates.

## After launch (website team)

- Google Search Console: add the property https://energy.iitm.ac.in, verify it, and submit https://energy.iitm.ac.in/sitemap.xml.
- LinkedIn Post Inspector and the Facebook Sharing Debugger: inspect https://energy.iitm.ac.in/ so link previews pick up the new share image.
