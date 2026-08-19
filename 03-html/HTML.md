# HTML Deep Dive: From URL Bar to Rendered Page

---

## 📌 Executive Summary: The Big Picture

Before writing a single `<div>`, it's worth understanding **what actually happens** between typing a URL and seeing a page on screen. HTML isn't just "tags you memorize" — it's one input into a pipeline: **browser engine → rendering engine → DOM/CSSOM → render tree → paint → display**.

This doc covers two things:

1. **How browsers actually turn HTML into pixels** (the mental model — DOM, parsing, rendering engine).
2. **A comprehensive HTML reference** — every commonly used tag, grouped by purpose, with runnable snippets — as the actual "digital notes" you'll come back to while building.

> **HTML's job, in one sentence:** "Describe the structure and meaning of content, so a browser (or screen reader, or search engine) knows what everything *is*, not just what it *looks like*."

---

## 🧠 Core Analogy: The Restaurant Kitchen

- **HTML** = the raw ingredients and the order ticket (what dishes are needed, structure only).
- **CSS** = the plating and presentation (how it looks on the table).
- **JavaScript** = the chef actively doing things — reacting, modifying, adding new dishes on the fly.
- **The Browser Engine** = the entire kitchen staff and process that takes the ticket and ingredients and turns them into a served plate (the rendered page) you actually see.

---

## ⚖️ Compliance & Accessibility Laws (Why HTML Structure Matters)

HTML isn't just for looks — a badly structured page can be **illegal** to ship in some jurisdictions, and unusable for people relying on assistive technology.

### Visual Impairment & Accessibility Laws

Different countries enforce accessibility differently:

| Region | Requirement |
|---|---|
| **Europe (EU)** | **All websites** must be accessible (public and private) |
| **India** | Only **government websites** are legally required to be accessible |

**Why this matters for HTML specifically:** semantic tags (`<nav>`, `<button>`, `<label>`, `alt` attributes, proper heading order) are what screen readers actually use to navigate a page. A `<div onclick="...">` styled to look like a button is invisible to a screen reader — a real `<button>` is not.

### GDPR Compliance (EU Rule)

**GDPR = General Data Protection Regulation**

- A set of rules giving individuals more control over their personal data.
- Essentially a **"bill of rights" for the internet age**.
- Covers general data privacy for *everyone*, not just a specific industry.
- Relevant to HTML forms: any `<input>` collecting personal data (email, name, location) typically needs explicit consent UI, and cookie banners exist because of this law.

### HIPAA Compliance (US Rule)

**HIPAA = Health Insurance Portability & Accountability Act**

- A US law specifically focused on **medical and health information**.
- Example: it's the reason a doctor can't share your medical records with your boss or a random telemarketer without your permission.
- Relevant to forms/apps in healthcare: any form collecting health data needs to be built with this in mind (secure transmission, access control — beyond just HTML, but starts with how forms are structured and submitted).

---

## 🌐 WWW, URLs, and How a Page Request Works

**WWW = World Wide Web**, invented by **Tim Berners-Lee**.

A URL has a structure:

```
https://  chaicode.com  /contact-us
   ↑           ↑              ↑
protocol   domain name    HTML page (path)
```

### The Request/Response Flow

```
[Browser/User]  ──── Request ────→  [Web Server]
[Browser/User]  ←──── Response ───  [Web Server]

Response can be: Text (HTML), Image, JSON, File, Video
```

- The server that returns HTML is called a **web server**.
- Giving direct access to a server's filesystem is hard/risky — instead, servers expose specific routes/files (like `/contact-us`) that map to HTML documents.

### How the Server Tells the Browser "This is HTML"

Every HTTP response includes headers. One matters most for rendering:

```
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
```

`Content-Type: text/html` is what tells the browser: *"parse what follows as HTML, not plain text or JSON."* Without the right `Content-Type`, a browser might download the file instead of rendering it.

### WWW Standard Stack

```
WWW - Standard
  ├── HTTP        (the protocol carrying the request/response)
  ├── HTML        (the document format returned)
  └── URL Structure (how a resource is addressed)
```

Example: `www.chaicode.com` → WWW server tags point to the web server that hosts the landing page → often **redirects** to the bare domain `chaicode.com` (or vice versa).

---

## 🖥️ Anatomy of a Browser

A browser is made of several distinct engines/components working together:

| Component | Role |
|---|---|
| **URL bar** | Uniform Resource Locator input — e.g. `https://google.com` |
| **User Interface (UI)** | Tabs, bookmarks, back/forward buttons — everything except the rendered page |
| **Browser Engine** | The "manager" — coordinates between the UI and the rendering engine |
| **Rendering Engine** | The "artist" — takes raw HTML/CSS/JS and paints the pixels you see |
| **Networking** | Handles HTTP requests, DNS resolution, downloading resources |
| **JS Interpreter** | Executes JavaScript (e.g. V8 in Chrome, SpiderMonkey in Firefox) |
| **UI Backend** | Draws native OS widgets (dropdowns, checkboxes, scrollbars) |
| **Disk API (Local Storage)** | Where data you write persists — e.g. cookies, `localStorage` |

**Common Browser Engines:**

| Engine | Used By |
|---|---|
| **Blink** | Chrome, Edge, Brave, Opera |
| **WebKit** | Safari |
| **Gecko** | Firefox |

### How These Pieces Connect

```
                         Rendering Engine
                               ↑
        ┌──────────────────────┼──────────────────────┐
   Networking               JS Interpreter          UI Backend
        ↑                      ↑
        └──────────────────────┴─────────┐
                                      Disk API
                                  (Local Storage)
                          The data you write, e.g. cookies
```

**In short:** the Browser Engine takes raw code (HTML, CSS, JS) and turns it into the interactive visual webpage on your screen. The Rendering Engine is the part specifically responsible for "painting" that visual result, using instructions it receives from Networking, the JS Interpreter, and the UI Backend.

---

## 📄 HTML/CSS Files as "Documents" — The DOM Pipeline

**DOM = Document Object Model.** HTML and CSS are documents that get parsed into an in-memory **model/structure** the browser can work with.

### The Full Parsing → Painting Pipeline

```
URL hit in browser
        │
        ├──→ HTML  ──→ HTML Parser ──┐
        │                             ├── transfer ──→ Content Bulk
        └──→ CSS   ──→ CSS Parser  ──┘   (a container that holds
                            │              the HTML/CSS being processed)
                            ↓
                         CSSOM
                            │
                            ↓
                           DOM  (Document Object Model)
                            │
                            ↓
                   Frame Constructor
                            │
                            ↓
                   Frame Tree / Reflow
                            │
                            ↓
                        Painting
                            │
                            ↓
                        Display
```

**Step by step:**

1. **HTML Parser** reads the raw HTML text and builds the **DOM tree** — a tree of nodes representing every element, attribute, and text node.
2. **CSS Parser** reads stylesheets and builds the **CSSOM** (CSS Object Model) — a tree of every style rule and how it applies.
3. **Frame Constructor** combines DOM + CSSOM into a **render tree** (only visible elements — `display: none` elements are excluded).
4. **Frame Tree / Reflow** calculates the exact size and position of every element (layout).
5. **Painting** fills in pixels — colors, text, images, borders — for each element.
6. **Display** — the final composited image appears on screen.

### Parsers: Conventional vs. Un-conventional

```
                    Web Parsing
                   /            \
            Conventional     Un-conventional
                 |                  |
              CSS & JS            HTML
       (CSS & JS throw errors)  (HTML doesn't throw errors)
```

- **CSS & JS are strict** — a syntax error can break the whole script/stylesheet (throws an error).
- **HTML is forgiving** — browsers try their best to render even broken/malformed HTML instead of throwing an error. This is why a missing closing tag usually still "works," even though it's bad practice.
- **Strict HTML** did exist as a concept — **HTML-4** included stricter doctype variants where people tried to make HTML behave like an error-throwing language (e.g. XHTML enforced strict, valid, well-formed markup and *would* fail to render on error).

### A Simple Parsing Analogy: Expression Trees

Just like a browser builds a tree from your markup, a math expression parser builds a tree from an equation, following **order of operations**:

`1 + 2 * 3` → parsed as:

```
        +
       / \
      1   *
         / \
        2   3
```

**BODMAS Rule** (order of operations): Bracket ⇒ Order (powers) ⇒ Division ⇒ Multiplication ⇒ Addition ⇒ Subtraction.

The browser's HTML/CSS parsers work on the same core idea — turning a flat sequence of characters into a structured, nested tree.

---

## 🏷️ Fancy Words Glossary

| Term | Plain Meaning |
|---|---|
| **Render** | Display (draw pixels on screen) |
| **Parser** | Transfer/convert raw text into a structured tree |
| **DOM** | Document Object Model — the tree structure of HTML |
| **CSSOM** | CSS Object Model — the tree structure of CSS rules |
| **Reflow** | Recalculating layout (position/size) of elements |
| **DNS lookup** | Resolving a domain name to an IP address over the network (see [Networking notes](../01-networking/01/1-CN_The%20Secret_Life_of_Domain_Names.md)) |
| **JS Interpreter** | Executes JavaScript — e.g. **V8** (Chrome/Node), **Bun** (its own fast runtime/engine) |

---

## 🧱 HTML Fundamentals

**HTML = HyperText Markup Language — a language of tags.**

What HTML is *for*:

- **Structure** — organizing content into meaningful sections.
- **Capability of linking pages easily** — the "Hyper" in HyperText, via `<a>`.
- It is **not** primarily about looking good — that's CSS's job. HTML's job is meaning and structure; CSS handles appearance.

### Anatomy of an HTML Document

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
</head>
<body>
  <h1>Hello, World!</h1>
</body>
</html>
```

| Piece | Purpose |
|---|---|
| `<!DOCTYPE html>` | Tells the browser to use standards-compliant HTML5 parsing (not "quirks mode") |
| `<html lang="en">` | Root element; `lang` helps screen readers and translators |
| `<head>` | Metadata — not rendered directly on the page (title, character set, linked CSS/JS, SEO tags) |
| `<meta charset="UTF-8">` | Character encoding — always include this to avoid broken symbols |
| `<meta name="viewport" ...>` | Makes the page responsive on mobile devices |
| `<title>` | Text shown in the browser tab |
| `<body>` | Everything actually visible on the page |

---

## 📚 Comprehensive HTML Tag Reference

### 1. Text Content Tags

**Headings** — `<h1>` through `<h6>`, in order of importance (not just size):

```html
<h1>Main Page Title (only one per page, ideally)</h1>
<h2>Section Heading</h2>
<h3>Subsection Heading</h3>
<h4>...</h4>
<h5>...</h5>
<h6>Smallest heading</h6>
```

**Why heading order matters:** screen readers let users jump between headings like a table of contents. Skipping from `<h1>` to `<h4>` breaks that navigation — always nest in order.

**Paragraph** — `<p>`:

```html
<p>This is a paragraph of text. Browsers automatically add spacing before and after it.</p>
```

**Span** — inline, no semantic meaning, used purely to target a piece of text with CSS/JS:

```html
<p>The price is <span class="highlight">$49.99</span> today only.</p>
```

`<span>` vs `<div>`: `<span>` is **inline** (doesn't break the line, wraps content), `<div>` is **block** (takes its own line, used for larger structural grouping).

**Div** — generic block-level container (no semantic meaning):

```html
<div class="card">
  <p>Content grouped inside a div for styling/layout purposes.</p>
</div>
```

**Text formatting tags:**

```html
<strong>Important text (bold, semantic emphasis)</strong>
<em>Emphasized text (italic, semantic emphasis)</em>
<b>Bold text (visual only, no semantic weight)</b>
<i>Italic text (visual only, no semantic weight)</i>
<small>Fine print / less important text</small>
<mark>Highlighted text</mark>
<del>Deleted/removed text (strikethrough)</del>
<ins>Inserted text (underline)</ins>
<sub>Subscript (e.g. H<sub>2</sub>O)</sub>
<sup>Superscript (e.g. x<sup>2</sup>)</sup>
<code>inline code snippet</code>
<blockquote>A longer quoted passage from another source.</blockquote>
<q>A short inline quote</q>
```

**Prefer `<strong>`/`<em>` over `<b>`/`<i>`** when the emphasis is meaningful — screen readers announce `<strong>` differently, while `<b>` is purely visual.

---

### 2. Self-Closing / Void Tags

These tags don't wrap content and don't need a closing tag:

```html
<br>    <!-- line break -->
<hr>    <!-- horizontal rule / thematic divider -->
<img src="photo.jpg" alt="description">
<input type="text">
<meta charset="UTF-8">
<link rel="stylesheet" href="style.css">
```

---

### 3. The Image Tag — `<img>`

```html
<img src="photo.jpg" alt="A sunset over the mountains" width="600" height="400">
```

| Attribute | Purpose |
|---|---|
| `src` | Path/URL to the image file (**required**) |
| `alt` | Alternate text — shown if image fails to load, **read aloud by screen readers**, used for SEO. Always include a meaningful `alt` (or `alt=""` for purely decorative images) |
| `width` / `height` | Reserve space before the image loads (prevents layout shift) |
| `loading="lazy"` | Defers loading until the image is near the viewport (performance) |
| `srcset` | Provide multiple resolutions for responsive images |

**Responsive image example:**

```html
<img
  src="photo-800w.jpg"
  srcset="photo-400w.jpg 400w, photo-800w.jpg 800w, photo-1200w.jpg 1200w"
  sizes="(max-width: 600px) 400px, 800px"
  alt="A sunset over the mountains"
  loading="lazy"
>
```

---

### 4. The Video Tag — `<video>`

```html
<video controls width="640" height="360" poster="thumbnail.jpg">
  <source src="movie.mp4" type="video/mp4">
  <source src="movie.webm" type="video/webm">
  Your browser does not support the video tag.
</video>
```

| Attribute | Purpose |
|---|---|
| `controls` | Shows play/pause/volume UI |
| `autoplay` | Starts playing automatically (often requires `muted` to work in modern browsers) |
| `loop` | Restarts video after it ends |
| `muted` | Starts with sound off |
| `poster` | Image shown before the video plays |
| `<source>` | Multiple formats — browser picks the first one it supports |

**Audio works the same way:**

```html
<audio controls>
  <source src="song.mp3" type="audio/mpeg">
  <source src="song.ogg" type="audio/ogg">
  Your browser does not support the audio tag.
</audio>
```

---

### 5. Lists — `<ul>`, `<ol>`, `<li>`, `<dl>`

**Unordered list** (bullets):

```html
<ul>
  <li>Milk</li>
  <li>Eggs</li>
  <li>Bread</li>
</ul>
```

**Ordered list** (numbered):

```html
<ol>
  <li>Preheat the oven</li>
  <li>Mix the ingredients</li>
  <li>Bake for 20 minutes</li>
</ol>
```

`<ol>` attributes:

```html
<ol start="5" reversed>
  <li>Fifth item</li>
  <li>Sixth item</li>
</ol>
```

**Nested lists:**

```html
<ul>
  <li>Fruits
    <ul>
      <li>Apple</li>
      <li>Banana</li>
    </ul>
  </li>
  <li>Vegetables</li>
</ul>
```

**Description list** — for term/definition pairs:

```html
<dl>
  <dt>HTML</dt>
  <dd>HyperText Markup Language — structures web content.</dd>
  <dt>CSS</dt>
  <dd>Cascading Style Sheets — styles web content.</dd>
</dl>
```

---

### 6. Links — `<a>`

```html
<a href="https://chaicode.com">Visit ChaiCode</a>
<a href="/contact-us">Internal link (relative path)</a>
<a href="mailto:someone@example.com">Email us</a>
<a href="tel:+911234567890">Call us</a>
<a href="#section2">Jump to a section on this page</a>
<a href="https://example.com" target="_blank" rel="noopener noreferrer">Opens in new tab</a>
```

| Attribute | Purpose |
|---|---|
| `href` | Destination URL/path |
| `target="_blank"` | Opens link in a new tab |
| `rel="noopener noreferrer"` | Security best practice with `target="_blank"` — prevents the new page from accessing `window.opener` |
| `download` | Forces the browser to download the file instead of navigating to it |

---

### 7. Tables — `<table>`, `<tr>`, `<td>`, `<th>`

```html
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Role</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Mohammed Saif</td>
      <td>Student</td>
    </tr>
    <tr>
      <td>Jane Doe</td>
      <td>Instructor</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td colspan="2">2 rows total</td>
    </tr>
  </tfoot>
</table>
```

| Tag | Purpose |
|---|---|
| `<table>` | Wraps the whole table |
| `<thead>` / `<tbody>` / `<tfoot>` | Groups header/body/footer rows (semantic, also styleable independently) |
| `<tr>` | Table row |
| `<th>` | Header cell (bold, centered by default; use `scope="col"`/`scope="row"` for accessibility) |
| `<td>` | Standard data cell |
| `colspan` / `rowspan` | Merge cells across columns/rows |

---

### 8. Forms — The Full Reference

```html
<form action="/submit" method="POST">
  <!-- Text-type inputs -->
  <label for="name">Name:</label>
  <input type="text" id="name" name="name" placeholder="Enter your name" required>

  <label for="email">Email:</label>
  <input type="email" id="email" name="email" required>

  <label for="password">Password:</label>
  <input type="password" id="password" name="password" minlength="8" required>

  <label for="age">Age:</label>
  <input type="number" id="age" name="age" min="1" max="120">

  <label for="dob">Date of birth:</label>
  <input type="date" id="dob" name="dob">

  <label for="phone">Phone:</label>
  <input type="tel" id="phone" name="phone">

  <label for="site">Website:</label>
  <input type="url" id="site" name="site">

  <label for="vol">Volume:</label>
  <input type="range" id="vol" name="vol" min="0" max="100">

  <label for="color">Favorite color:</label>
  <input type="color" id="color" name="color">

  <!-- Select dropdown -->
  <label for="country">Country:</label>
  <select id="country" name="country">
    <option value="">-- Select --</option>
    <option value="in">India</option>
    <option value="us" selected>United States</option>
    <option value="uk">United Kingdom</option>
  </select>

  <!-- Multi-select -->
  <label for="skills">Skills:</label>
  <select id="skills" name="skills" multiple size="3">
    <option value="html">HTML</option>
    <option value="css">CSS</option>
    <option value="js">JavaScript</option>
  </select>

  <!-- Grouped options -->
  <select id="car" name="car">
    <optgroup label="Sedans">
      <option value="civic">Honda Civic</option>
      <option value="corolla">Toyota Corolla</option>
    </optgroup>
    <optgroup label="SUVs">
      <option value="rav4">Toyota RAV4</option>
    </optgroup>
  </select>

  <!-- Radio buttons (only one selectable per shared 'name') -->
  <p>Gender:</p>
  <input type="radio" id="male" name="gender" value="male">
  <label for="male">Male</label>
  <input type="radio" id="female" name="gender" value="female">
  <label for="female">Female</label>

  <!-- Checkboxes (multiple selectable) -->
  <p>Interests:</p>
  <input type="checkbox" id="sports" name="interests" value="sports">
  <label for="sports">Sports</label>
  <input type="checkbox" id="music" name="interests" value="music">
  <label for="music">Music</label>

  <!-- Textarea (multi-line text) -->
  <label for="bio">Bio:</label>
  <textarea id="bio" name="bio" rows="4" cols="40" placeholder="Tell us about yourself"></textarea>

  <!-- File upload -->
  <label for="resume">Upload resume:</label>
  <input type="file" id="resume" name="resume" accept=".pdf,.doc,.docx">

  <!-- Hidden field (sent with form, not visible to user) -->
  <input type="hidden" name="formVersion" value="v2">

  <!-- Fieldset groups related fields with a caption -->
  <fieldset>
    <legend>Delivery Address</legend>
    <input type="text" placeholder="Street">
    <input type="text" placeholder="City">
  </fieldset>

  <!-- Buttons -->
  <button type="submit">Submit</button>
  <button type="reset">Reset</button>
  <button type="button" onclick="alert('Just a click, no submit')">Click Me</button>
</form>
```

**Key form concepts:**

| Concept | Explanation |
|---|---|
| `<label for="id">` | Clicking the label focuses/activates the matching input — critical for accessibility and usability |
| `name` attribute | The key used when the form data is submitted (`name=value` pairs) |
| `action` | URL the form data is sent to |
| `method="GET"` vs `"POST"` | GET appends data to the URL (visible, cacheable, size-limited); POST sends data in the request body (used for sensitive/large data) |
| `required` | Native browser validation — blocks submission until filled |
| `placeholder` | Grey hint text — **not** a replacement for a real `<label>` (disappears on focus, not read reliably by all screen readers) |

---

### 9. Semantic HTML — What It Is and Why It Exists

**Semantic HTML means choosing tags based on what the content *means* or *does*, not just how you want it to look.**

A `<div>` and a `<button>` can both be styled to look identical. But a `<div>` tells the browser (and screen readers, and search engines, and future-you reading the code) *nothing* about its purpose. A `<button>` announces: "I'm clickable, focusable with Tab, activatable with Enter/Space, and I'm a button" — for free, with zero JavaScript or ARIA needed.

**Semantic tag** = a tag whose *name* conveys meaning (`<nav>`, `<article>`, `<button>`, `<time>`).
**Non-semantic tag** = a generic container with no inherent meaning (`<div>`, `<span>`) — meaning only comes from `class`/`id` names, which the browser and assistive tech can't read.

#### The "Div Soup" Problem It Solves

Before HTML5 (pre-2014), developers built entire layouts out of nested `<div>`s:

```html
<!-- ❌ Non-semantic: "div soup" -->
<div class="header">
  <div class="nav">...</div>
</div>
<div class="main-content">
  <div class="post">...</div>
</div>
<div class="footer">...</div>
```

```html
<!-- ✅ Semantic: the tag names ARE the documentation -->
<header>
  <nav>...</nav>
</header>
<main>
  <article>...</article>
</main>
<footer>...</footer>
```

Both can render pixel-identical with the right CSS. The difference is entirely in what the *markup itself communicates*.

#### Why It Actually Matters (Not Just Style Preference)

| Benefit | How it works |
|---|---|
| **Accessibility** | Screen readers build a navigable outline from semantic tags — a blind user can jump straight to `<nav>`, `<main>`, or the next `<article>` with one keystroke. A page built entirely of `<div>`s is a flat, meaningless blob to that same user |
| **SEO** | Search engine crawlers weight content inside `<article>`, `<h1>`-`<h6>`, and `<nav>` differently than generic `<div>`s — semantic structure helps search engines understand what's actually the main content vs. a sidebar/ad |
| **Native behavior for free** | `<button>` gets keyboard focus, Enter/Space activation, and correct screen-reader role automatically. Recreating that on a `<div>` requires manually adding `tabindex`, `role="button"`, and JS key handlers — easy to get wrong |
| **Legal compliance** | This directly connects back to the [accessibility laws](#️-compliance--accessibility-laws-why-html-structure-matters) covered earlier — EU accessibility law effectively requires semantic, screen-reader-navigable markup |
| **Maintainability** | Six months later, `<article class="post">` tells you what it is at a glance. `<div class="post">` relies entirely on the class name being accurate and never renamed inconsistently |
| **Browser/tooling defaults** | Browsers apply sensible default behavior/styling to semantic elements (e.g. `<table>` structure, `<form>` submission on Enter) that generic containers don't get |

#### The Full Semantic Layout Tag Set

```html
<body>
  <header>
    <h1>My Website</h1>
    <nav>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <article>
      <h2>Blog Post Title</h2>
      <p>Article content...</p>
    </article>

    <section>
      <h2>Related Topics</h2>
      <p>Section content...</p>
    </section>

    <aside>
      <p>Sidebar content, e.g. ads or related links.</p>
    </aside>
  </main>

  <footer>
    <p>&copy; 2026 My Website. All rights reserved.</p>
  </footer>
</body>
```

| Tag | Meaning |
|---|---|
| `<header>` | Introductory content — often logo/title/nav (can appear multiple times, e.g. per `<article>`) |
| `<nav>` | Navigation links |
| `<main>` | The primary unique content of the page (only one per page) |
| `<article>` | Self-contained, independently distributable content (a blog post, a news story, a forum comment) |
| `<section>` | A thematic grouping of content, usually with its own heading |
| `<aside>` | Tangentially related content — sidebars, pull quotes, ads |
| `<footer>` | Closing content — copyright, links, contact info |
| `<figure>` / `<figcaption>` | Groups an image (or diagram/code) with its caption |

**`<section>` vs `<article>` vs `<div>` — the question everyone gets wrong at first:**

- Use `<article>` if the content could stand alone and make sense if pulled out and placed on a completely different site (a blog post, a product card, a tweet).
- Use `<section>` for a thematic chunk that belongs *within* the current page's flow and usually has its own heading (a "Reviews" section on a product page).
- Use `<div>` only when there's genuinely no semantic meaning — purely a styling/layout hook (e.g. a wrapper just to center content with CSS grid).

**Other semantic tags beyond layout** (semantics isn't only about page structure):

```html
<time datetime="2026-08-19">August 19, 2026</time>
<address>Contact: <a href="mailto:hello@chaicode.com">hello@chaicode.com</a></address>
<mark>highlighted search term</mark>
<abbr title="HyperText Markup Language">HTML</abbr>
```

| Tag | Meaning |
|---|---|
| `<time datetime="...">` | Machine-readable date/time, human-readable text — search engines and calendar apps can parse the `datetime` attribute |
| `<address>` | Contact information for the nearest `<article>`/`<body>` |
| `<abbr title="...">` | An abbreviation — hovering shows the full term, screen readers can announce it |
| `<mark>` | Text highlighted/relevant in the current context (e.g. a search match) |

**Figure example:**

```html
<figure>
  <img src="chart.png" alt="Sales growth chart">
  <figcaption>Fig 1. Sales growth over the last quarter.</figcaption>
</figure>
```

---

### 10. Other Frequently Used Tags

```html
<iframe src="https://example.com" width="600" height="400" title="Embedded page"></iframe>

<progress value="70" max="100">70%</progress>

<meter value="0.6" min="0" max="1">60%</meter>

<details>
  <summary>Click to expand</summary>
  <p>Hidden content revealed on click — no JavaScript needed.</p>
</details>

<canvas id="myCanvas" width="200" height="100"></canvas>

<template id="my-template">
  <p>This content is not rendered until cloned via JavaScript.</p>
</template>
```

| Tag | Purpose |
|---|---|
| `<iframe>` | Embeds another HTML document inside the current page |
| `<progress>` | A progress bar (e.g. file upload %) |
| `<meter>` | A scalar measurement within a known range (e.g. disk usage) |
| `<details>` / `<summary>` | Native, JS-free collapsible/expandable content |
| `<canvas>` | A blank drawing surface controlled via JavaScript (for graphics/games) |
| `<template>` | Markup that's parsed but not rendered — used as a JS-cloneable blueprint |

---

### 11. Accessibility (a11y) & ARIA — Making HTML Usable by Everyone

**Accessibility (often abbreviated "a11y" — "a", 11 letters, "y")** means a page can be used by people relying on assistive technology: screen readers, keyboard-only navigation, switch devices, screen magnifiers. This directly connects back to the [accessibility laws](#️-compliance--accessibility-laws-why-html-structure-matters) covered earlier — it's not optional polish, it's often a legal requirement.

**The golden rule of accessibility: "No ARIA is better than bad ARIA."** Always prefer a native semantic HTML element over recreating its behavior with ARIA on a `<div>`. A real `<button>` gets keyboard focus, Enter/Space activation, and the correct screen-reader role automatically — for free. ARIA should fill gaps native HTML can't cover, not replace what it already does.

#### What Is ARIA?

**ARIA = Accessible Rich Internet Applications** — a set of HTML attributes that add extra information for assistive technology (mainly screen readers), used when semantic HTML alone isn't enough to describe a custom or dynamic component.

```html
<!-- A custom dropdown built from divs — semantics don't exist without ARIA -->
<div role="button" tabindex="0" aria-pressed="false" aria-label="Toggle menu">
  ☰
</div>
```

Without `role="button"`, `tabindex="0"`, and `aria-*` attributes, a screen reader has no idea this `<div>` is interactive at all — it would just be silently skipped.

#### `aria-label` vs. `aria-labelledby` vs. `alt` vs. visible text

These all answer the same question — "what should the screen reader announce for this element?" — but apply in different situations:

```html
<!-- aria-label: provides an accessible name with NO visible text on screen -->
<button aria-label="Close dialog">✕</button>

<!-- aria-labelledby: points to ANOTHER element's text to use as the accessible name -->
<h2 id="settings-heading">Settings</h2>
<section aria-labelledby="settings-heading">
  ...
</section>

<!-- aria-describedby: points to additional descriptive text (announced AFTER the label) -->
<input type="password" aria-describedby="pw-hint">
<p id="pw-hint">Must be at least 8 characters</p>

<!-- alt: the img-specific equivalent, NOT a general-purpose ARIA attribute -->
<img src="icon-close.png" alt="Close">
```

| Attribute | Use when |
|---|---|
| `alt` | Specifically on `<img>` — describes the image content |
| `aria-label` | An interactive element has no visible text (an icon-only button) and there's no existing on-page text to reference |
| `aria-labelledby` | Existing visible text elsewhere on the page should serve as this element's accessible name (avoids duplicating the string) |
| `aria-describedby` | Extra explanatory text, read *after* the label — hints, error messages, format requirements |

**Rule of thumb:** if there's already visible text that describes the element, use `aria-labelledby` to point to it rather than duplicating the string in `aria-label` — one source of truth, no risk of the two drifting out of sync.

#### Common ARIA Roles

`role` overrides or supplies the semantic meaning of an element for assistive technology — used mainly when building a custom widget that doesn't have a native HTML equivalent.

```html
<div role="alert">Your changes have been saved.</div>
<div role="navigation">...</div>
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Deletion</h2>
</div>
<ul role="tablist">
  <li role="tab" aria-selected="true">Tab 1</li>
  <li role="tab" aria-selected="false">Tab 2</li>
</ul>
```

| Role | Announces as | Common use |
|---|---|---|
| `role="alert"` | An urgent, live status message | Form submission errors, save confirmations |
| `role="dialog"` / `role="alertdialog"` | A modal/popup window | Custom modal implementations |
| `role="navigation"` | A navigation landmark | Equivalent to `<nav>` — prefer the real tag when possible |
| `role="tablist"` / `role="tab"` / `role="tabpanel"` | A tabbed interface | Custom tab components |
| `role="status"` | A polite, non-urgent live update | Loading indicators, "3 items in cart" |

**Landmark roles are mostly redundant with semantic HTML5 tags** (`<nav>` already implies `role="navigation"`, `<main>` already implies `role="main"`) — this is another reason to prefer real semantic tags over `<div role="...">` whenever a native equivalent exists.

#### ARIA States — Dynamic Properties That Change

Unlike `role` (usually static), **ARIA states** describe something that changes as the user interacts with the page — screen readers re-announce the update:

```html
<button aria-expanded="false" aria-controls="menu-panel">Menu ▾</button>
<div id="menu-panel" hidden>...</div>

<input type="checkbox" aria-checked="true">

<button aria-disabled="true">Submit (disabled)</button>

<div aria-live="polite">Item added to cart.</div>
<div aria-live="assertive">Error: connection lost.</div>
```

| State | Meaning |
|---|---|
| `aria-expanded` | Whether a collapsible section/dropdown is currently open |
| `aria-checked` | Whether a custom checkbox/toggle is checked |
| `aria-disabled` | Marks an element as disabled, without removing it from the tab order (unlike the native `disabled` attribute) |
| `aria-hidden="true"` | Hides an element from assistive technology *only* — still visible on screen (use for purely decorative icons) |
| `aria-live="polite"` / `"assertive"` | Announces dynamically-updated content automatically — `polite` waits for a pause, `assertive` interrupts immediately |

**Critical distinction:** `aria-hidden="true"` hides something from screen readers **but leaves it visually and interactively present** — it does not remove keyboard focusability. Pairing `aria-hidden="true"` with `tabindex="-1"` is usually needed together, otherwise a keyboard user can still Tab onto an element a screen reader user is told doesn't exist.

#### Keyboard Navigation & Focus

A page is only accessible if every interactive element can be reached and operated **without a mouse**.

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
...
<main id="main-content">...</main>
```

| Concept | Explanation |
|---|---|
| **Tab order** | The order elements receive focus when pressing Tab — follows DOM order by default; avoid fighting it with `tabindex` unless truly necessary |
| `tabindex="0"` | Adds an element to the natural tab order (used to make a non-interactive element like a `<div>` focusable — last resort, prefer a real `<button>`) |
| `tabindex="-1"` | Removes an element from the Tab key sequence, but it can still be focused programmatically (`element.focus()`) — used for things like modal headings after opening |
| `tabindex="1"`, `"2"`, etc. (positive) | **Avoid** — manually renumbering tab order almost always creates a confusing, hard-to-maintain experience; let DOM order do the work |
| **Skip link** | A hidden-until-focused link at the very top of the page letting keyboard users jump past a long nav straight to `<main>` — a near-universal accessibility pattern |
| **Focus trap** | Keeping keyboard focus contained inside an open modal (Tab cycles within it, doesn't escape to the page behind) — needed when using `role="dialog"` |

**Testing shortcut:** unplug the mouse (or just don't touch it) and try navigating an entire page/form using only Tab, Shift+Tab, Enter, and Space. If something can't be reached or operated this way, it's not accessible.

#### Accessible Forms (Building on Section 8 Above)

```html
<label for="email">Email <span aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
<input type="email" id="email" name="email" required aria-describedby="email-error" aria-invalid="true">
<p id="email-error" role="alert">Please enter a valid email address.</p>
```

| Pattern | Why it matters |
|---|---|
| `aria-invalid="true"` | Marks a field as currently failing validation — announced by screen readers alongside the field |
| `aria-describedby` pointing to an error message | Connects the error text to the field, so it's announced when the field receives focus, not just visually shown |
| A visible `*` marked `aria-hidden="true"`, paired with a screen-reader-only "(required)" | The `*` alone means nothing to a screen reader unless text backs it up |

#### `<picture>` — Serving Different Images by Context (Beyond `srcset`)

Building on the `<img>` `srcset` example in Section 3 — `<picture>` gives *full* control, including swapping to an entirely different image file (not just a different resolution of the same image) based on screen size or format support:

```html
<picture>
  <source media="(min-width: 800px)" srcset="hero-desktop.webp" type="image/webp">
  <source media="(min-width: 800px)" srcset="hero-desktop.jpg">
  <source srcset="hero-mobile.webp" type="image/webp">
  <img src="hero-mobile.jpg" alt="Team collaborating around a table">
</picture>
```

The browser evaluates each `<source>` top-to-bottom and uses the first one that matches; the `<img>` at the end is both the fallback and where `alt` text belongs (an `<img>` is always required inside `<picture>`, even though `<source>` provides the actual chosen file).

| Use `srcset` alone when... | Use `<picture>` when... |
|---|---|
| Serving the *same* image at different resolutions | Serving *entirely different* images (e.g. cropped differently) per screen size |
| — | Serving a modern format (WebP/AVIF) with a fallback for browsers that don't support it |

---

## 🏷️ Commonly Used Tags — Quick List

Straight from the "commonly used" grouping in the original notes:

```
H1...H6   P   Img   Div   A   Video   HR   BR   Input
```

Plus the self-closing set:

```
<br>  <hr>  <img>
```

---

## 💡 Cheat Sheet: Quick Reference

| Category | Tags |
|---|---|
| **Headings** | `h1 h2 h3 h4 h5 h6` |
| **Text** | `p span div strong em b i small mark del ins sub sup code blockquote q` |
| **Lists** | `ul ol li dl dt dd` |
| **Links** | `a` |
| **Media** | `img video audio source picture` |
| **Tables** | `table thead tbody tfoot tr th td` |
| **Forms** | `form input label select option optgroup textarea button fieldset legend` |
| **Semantic layout** | `header nav main article section aside footer figure figcaption` |
| **Misc/interactive** | `iframe progress meter details summary canvas template` |
| **Self-closing/void** | `br hr img input meta link` |
| **Accessibility (ARIA)** | `aria-label aria-labelledby aria-describedby aria-expanded aria-hidden aria-live aria-invalid role tabindex` |

| Input `type` values | Renders as |
|---|---|
| `text`, `email`, `password`, `number`, `tel`, `url`, `search` | Text-style input, browser adjusts keyboard/validation |
| `date`, `time`, `datetime-local`, `month`, `week` | Native date/time picker |
| `checkbox`, `radio` | Toggle inputs |
| `range` | Slider |
| `color` | Color picker |
| `file` | File upload |
| `hidden` | Not visible, still submitted |
| `submit`, `reset`, `button` | Form action buttons |

| ARIA attribute | One-line meaning |
|---|---|
| `aria-label="..."` | Accessible name when there's no visible text |
| `aria-labelledby="id"` | Accessible name sourced from another element's text |
| `aria-describedby="id"` | Extra descriptive text, read after the label |
| `role="..."` | Overrides/supplies semantic meaning for custom widgets |
| `aria-expanded` | Whether a collapsible/dropdown is open |
| `aria-hidden="true"` | Hides from screen readers only (still visible on screen) |
| `aria-live="polite"/"assertive"` | Announces dynamic content updates automatically |
| `tabindex="0"` | Adds to natural tab order (last resort on non-native elements) |
| `tabindex="-1"` | Focusable via JS only, removed from Tab key sequence |

---

## 🎯 Key Takeaways

1. **HTML is forgiving; CSS/JS are strict.** A browser tries its best to render broken HTML instead of throwing an error — this is by design (unconventional parsing), unlike CSS/JS which fail loudly.
2. **The DOM is a tree built from parsed HTML**, and the CSSOM is the equivalent tree for parsed CSS. They combine into a render tree, which goes through layout (reflow) and painting before anything appears on screen.
3. **The Rendering Engine is the "artist"** inside the Browser Engine — it paints pixels based on instructions from Networking, the JS Interpreter, and the UI Backend.
4. **`Content-Type: text/html` in the response header** is what tells the browser to parse the response as HTML at all.
5. **Semantic tags aren't optional polish** — `<nav>`, `<button>`, `<label for="">`, and meaningful `alt` text are what make a page accessible and legally compliant (GDPR/HIPAA/accessibility laws), not just "nice to have."
6. **`<span>` is inline, `<div>` is block** — both carry no semantic meaning on their own; use semantic tags (`<article>`, `<section>`, etc.) when the *meaning* of the content matters.
7. **`<label for="id">` is not decorative** — it's what lets a screen reader and mouse/touch users properly associate text with the input it describes.
8. **Always include `alt` on `<img>`** — for accessibility, SEO, and graceful fallback if the image fails to load.
9. **"No ARIA is better than bad ARIA"** — a native `<button>`, `<nav>`, or `<input>` already carries the correct role, focus behavior, and keyboard interaction for free; reach for `role`/`aria-*` only to fill gaps native HTML genuinely can't cover (custom widgets, dynamic live regions).
10. **`aria-hidden="true"` hides from screen readers but NOT visually or from keyboard focus** — it needs `tabindex="-1"` alongside it, or a keyboard user can still land on something a screen reader user is told doesn't exist.
11. **Accessibility is testable without special tools** — unplug the mouse and try to complete a task using only Tab, Shift+Tab, Enter, and Space; anything unreachable or inoperable that way has a real accessibility bug.

---

## 📚 Related Concepts to Explore Next

- **CSS fundamentals** — selectors, box model, flexbox/grid (natural next step after HTML structure)
- **DOM manipulation with JavaScript** — `document.querySelector`, `addEventListener`, dynamically creating elements
- **Automated accessibility testing** — axe DevTools, Lighthouse accessibility audits, WAVE
- **HTTP headers in depth** — `Content-Type`, caching headers, `Content-Security-Policy`
- **Web Components** — `<template>`, Shadow DOM, custom elements
- **WCAG (Web Content Accessibility Guidelines)** — the formal A/AA/AAA standard that EU/ADA accessibility law is typically measured against

---

## 🔗 Resources

- **MDN HTML Reference:** https://developer.mozilla.org/en-US/docs/Web/HTML
- **HTML Living Standard (WHATWG):** https://html.spec.whatwg.org/
- **web.dev Learn HTML:** https://web.dev/learn/html/
- **Can I Use (browser support checker):** https://caniuse.com/
- **MDN ARIA Reference:** https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA
- **WAI-ARIA Authoring Practices (patterns for common widgets):** https://www.w3.org/WAI/ARIA/apg/
- **WebAIM (accessibility testing & guides):** https://webaim.org/

---

**Last updated:** 2026-08-19
**Author:** Mohammed Saif
**LinkedIn:** linkedin.com/in/mohammedsaif001/
