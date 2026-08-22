# The DOM & Browser Events
## Part 11 of 17 — Host APIs, DOM Manipulation, and the Event System

---

## 📌 Executive Summary

- JavaScript-the-language (ECMAScript) has no idea what a webpage, a button, or a network request is — `document`, `fetch`, and `setTimeout` are **Browser APIs** the host environment bolts on, not features of the language itself.
- The **DOM** is the browser's live tree representation of your HTML; JS reads and mutates the page by walking and editing this tree through methods like `querySelector` and `createElement`, never by touching the `.html` file directly.
- `addEventListener` attaches a callback that runs when something happens on an element, and every callback receives an **event object** describing what happened.
- Events don't just fire at their target — they travel through the DOM tree in two phases, **capturing** (top-down) then **bubbling** (bottom-up), and understanding this is what makes advanced patterns like event delegation possible.
- **Event delegation** — attaching one listener to a parent instead of one to every child — exploits bubbling to handle events on elements that don't even exist yet, which is the standard way to manage dynamically-added content.

---

## 🧠 Core Analogy: The Building Intercom System

Picture an apartment building where every floor has its own intercom panel, and the building's front desk has one master panel wired to all of them.

- The **building itself** (walls, floors, wiring) is like the **host environment** — the browser. It exists independently of any one resident and provides shared infrastructure (elevators, intercoms, mail slots) that no single apartment could build on its own. JavaScript is a resident who can use that infrastructure but didn't build it.
- The **DOM** is the building's **floor plan** — a structured, walkable map of every room, hallway, and door. A resident doesn't renovate the physical building by editing the blueprint on paper; they walk to the actual room and change it. Likewise, JS doesn't edit HTML source — it walks the live DOM tree and mutates the real thing on screen.
- An **event** (someone presses a doorbell) doesn't just alert the one apartment — the signal first travels from the front desk *down* toward the room (**capturing**), reaches the doorbell itself (**target**), and then the notification travels back *up* through every hallway and floor toward the front desk (**bubbling**), triggering any intercom listening along that path.
- **Event delegation** is the front desk deciding not to install a separate listener in every apartment. Instead, it wires **one** receiver at the building's master panel that listens for "any doorbell, anywhere in the building," and inspects which specific doorbell rang when a signal arrives — including apartments that get built and added to the building *after* the front desk panel was installed.

---

## 🌐 1. What JS Does NOT Own: Browser & Node APIs

The ECMAScript specification defines the *language* — variables, functions, objects, `Array.prototype.map`, closures, and so on. It says nothing about screens, files, or networks. The **JS engine** (e.g. V8) can only compute; it has no built-in way to talk to a network card, a display, or a disk.

```
┌─────────────────────────────────────────────┐
│              Browser / Node.js                │
│                                                 │
│   ┌───────────────┐      ┌──────────────────┐ │
│   │   JS Engine    │      │   Host APIs       │ │
│   │  (pure ECMA-   │◀────▶│  document, DOM,   │ │
│   │  Script logic)  │      │  fetch, timers,   │ │
│   │  only            │      │  file system      │ │
│   └───────────────┘      └──────────────────┘ │
└─────────────────────────────────────────────┘
```

Everything that lets JS *do* something with the outside world is supplied by the **host environment** — the browser (via **Web APIs**) or Node.js (via built-in modules and the `libuv` library):

| API | Who provides it | Why it's not "just JS" |
|---|---|---|
| `document.querySelector` | Browser (Web APIs / DOM) | The DOM doesn't exist outside a browser — plain Node scripts have no `document` at all |
| `fetch` | Browser (Web APIs) or Node (built on `libuv`/`undici`) | A real network request needs OS-level networking the engine cannot perform alone |
| `setTimeout`, `setInterval` | Browser (Web APIs) or Node (`libuv`) | The engine has no built-in concept of "wait and come back later" |
| `console.log` | Browser DevTools / Node's stdout | The ECMAScript spec doesn't define `console` at all |
| File system (`fs` module) | Node only | Browsers deliberately don't expose raw file access, for security |

This distinction matters for two reasons. First, it explains a common source of confusion: the *same* JS syntax (`function`, `const`, `.map()`) works identically everywhere, but `document.querySelector(...)` throws in Node because Node never installed a `document`. Second, it sets up vocabulary needed later: `fetch` and `setTimeout` are asynchronous precisely *because* the actual work (network I/O, waiting) happens outside the JS engine, on infrastructure the engine doesn't control — the engine only gets notified once that work finishes. The full mechanics of that handoff (the event loop, the callback queue) are covered in a later file; for now, the takeaway is simply: **if it talks to the world outside your script, the host environment provided it, not the language.**

---

## 🌳 2. The DOM: A Live Tree of Your HTML

The **DOM (Document Object Model)** is the browser's in-memory tree representation of the page's HTML. Every tag becomes a **node** in this tree, and JS interacts with the page by walking and editing that tree.

```
document
 └── html
      ├── head
      │    └── title
      └── body
           ├── h1
           └── ul#task-list
                ├── li
                └── li
```

JS never edits the original `.html` file — it changes the live tree, and the browser repaints the screen to match.

---

## 🔍 3. Selecting Elements

```js
document.getElementById('main');            // single element, by id
document.querySelector('.card');            // first match, any CSS selector
document.querySelectorAll('.card');         // ALL matches, as a static NodeList
document.getElementsByClassName('card');    // ALL matches, as a LIVE HTMLCollection
document.getElementsByTagName('li');        // ALL matches, as a LIVE HTMLCollection
```

- `querySelector`/`querySelectorAll` accept **any CSS selector** (`'#id'`, `'.class'`, `'div > p'`) — the most flexible option, and generally the default choice today.
- `getElementsBy...` methods return a **live** collection that auto-updates as the DOM changes; `querySelectorAll` returns a **static snapshot** taken at the moment it was called — elements added afterward will not appear in that same NodeList.

```js
const liveList = document.getElementsByClassName('item');
const staticList = document.querySelectorAll('.item');

document.body.appendChild(document.createElement('div')); // unrelated change, ignore

console.log(liveList.length === document.getElementsByClassName('item').length); // true — always reflects current DOM
console.log(staticList.length); // frozen at the count when querySelectorAll ran
```

---

## ✏️ 4. Reading & Changing Content, Attributes, Classes, Styles

```js
const el = document.querySelector('#main');

el.textContent = 'Hello';        // sets plain text (safe — no HTML parsing)
el.innerHTML = '<b>Hello</b>';   // sets HTML markup (parses tags — risky with untrusted input, XSS vector)

console.log(el.textContent);     // 'Hello'
```

- `textContent` treats its input as plain text — safe even if the string contains `<script>` tags, because nothing is parsed as markup.
- `innerHTML` parses its input as HTML. Setting it to a string built from user input (a comment, a username) without sanitizing it is a classic **XSS** vulnerability, because any `<script>` or event-attribute the attacker embeds gets parsed and can execute.

```js
el.style.color = 'red';
el.style.backgroundColor = 'black';   // camelCase for hyphenated CSS properties

el.classList.add('active');
el.classList.remove('hidden');
el.classList.toggle('open');       // adds if missing, removes if present
el.classList.contains('active');   // true / false

el.setAttribute('data-id', '42');
el.getAttribute('data-id');        // '42'
```

Prefer `classList` over directly writing `el.style...` for anything beyond one-off inline tweaks — toggling a CSS class keeps styling rules in your stylesheet instead of scattering them through JS.

---

## 🏗️ 5. Creating & Inserting Elements

```js
const newItem = document.createElement('li');
newItem.textContent = 'Buy milk';

document.querySelector('#task-list').appendChild(newItem);  // insert at the end
newItem.remove();                                             // remove an element from the DOM
```

`createElement` builds a node that exists only in memory until it's inserted somewhere with `appendChild` (or similar methods like `prepend`/`insertBefore`) — the page doesn't change until the new node actually becomes part of the live tree.

---

## 🖱️ 6. Events: `addEventListener` and the Event Object

```js
const button = document.querySelector('#submit-btn');

button.addEventListener('click', function (event) {
  console.log('Button clicked!', event.type, event.target);
});
```

- `addEventListener` is a **Higher-Order Function** — it takes your callback and invokes it every time the named event fires on that element.
- The callback receives an **event object** describing what happened: `event.type` (e.g. `'click'`), `event.target` (the exact element the event originated on), `event.currentTarget` (the element the listener is attached to — these two can differ, see below), mouse coordinates, key pressed, and more.
- Prefer `addEventListener` over inline `onclick="..."` HTML attributes — it keeps JS out of markup and allows **multiple independent listeners** on the same element without one overwriting another.

```js
button.addEventListener('click', () => console.log('listener A'));
button.addEventListener('click', () => console.log('listener B'));
// both run on a single click — inline onclick="" could only ever hold one handler
```

---

## 🔼 7. Event Bubbling and Capturing: The Two-Phase Model

An event fired on a nested element doesn't just run listeners attached to that exact element — it travels through the DOM tree in a well-defined path, with **three phases**:

1. **Capturing phase** — the event starts at `window`/`document` and travels *down* the tree, through each ancestor, toward the target.
2. **Target phase** — the event reaches the actual element it happened on.
3. **Bubbling phase** — the event then travels back *up*, from the target through each ancestor, all the way to `document`.

```
Capturing (down)         Target          Bubbling (up)
document                                  document
   │                                          ▲
  ul#task-list                          ul#task-list
   │                                          ▲
  li  ───────────────▶ [ click here ] ────────┘
```

By default, `addEventListener` listens during the **bubbling** phase. Passing `true` (or `{ capture: true }`) as the third argument makes it listen during the **capturing** phase instead:

```js
const outer = document.querySelector('#outer');
const inner = document.querySelector('#inner');

outer.addEventListener('click', () => console.log('outer - capturing'), true);
inner.addEventListener('click', () => console.log('inner - target'));
outer.addEventListener('click', () => console.log('outer - bubbling'), false);

// clicking #inner logs, in this exact order:
// "outer - capturing"   (capturing phase reaches outer first, on the way down)
// "inner - target"      (target phase)
// "outer - bubbling"    (bubbling phase reaches outer again, on the way back up)
```

Because most events bubble, a listener on a parent will fire for events that originated on any of its descendants — this is the exact mechanism event delegation (below) relies on. A handler can stop the event from continuing its journey with `event.stopPropagation()`:

```js
inner.addEventListener('click', (event) => {
  console.log('inner clicked');
  event.stopPropagation();   // prevents the event from reaching outer's bubbling listener
});
outer.addEventListener('click', () => console.log('outer heard it'));

// clicking #inner now logs only "inner clicked" — "outer heard it" never runs
```

`event.stopPropagation()` only stops the event traveling further through the tree; it does **not** prevent other listeners already attached to the *same* element from also running (that would instead be `event.stopImmediatePropagation()`, a rarer, more surgical tool).

Not every event bubbles — `focus` and `blur`, for instance, do not (their bubbling equivalents are `focusin`/`focusout`) — but `click`, `input`, `keydown`, and most common interaction events do.

---

## 🎯 8. Event Delegation: One Listener Instead of Many

**Event delegation** means attaching a single listener to a stable **parent** element rather than a separate listener to each of its children — relying on bubbling to catch events that originate on any descendant. This solves a real, common problem: attaching listeners to elements that don't exist yet.

### The problem without delegation

```js
// Attaching a listener directly to each existing <li> — this list is a snapshot in time
document.querySelectorAll('#task-list li').forEach((li) => {
  li.addEventListener('click', (event) => {
    event.target.classList.toggle('done');
  });
});

// Later, a new item is added dynamically:
const newItem = document.createElement('li');
newItem.textContent = 'Buy milk';
document.querySelector('#task-list').appendChild(newItem);

// Clicking "Buy milk" does NOTHING — it never received a listener,
// because it didn't exist when querySelectorAll ran.
```

Every time an item is added, you'd need to remember to attach a fresh listener to it too — easy to forget, and wasteful if the list is large (hundreds of listeners doing the same job).

### The fix — delegate to the parent

```js
const taskList = document.querySelector('#task-list');

taskList.addEventListener('click', (event) => {
  // event.target is whatever was actually clicked — could be the <li>, or something inside it
  const clickedItem = event.target.closest('li');

  if (!clickedItem) return;          // click landed on the list itself, not an item — ignore
  if (!taskList.contains(clickedItem)) return; // safety check: ignore items outside this list

  clickedItem.classList.toggle('done');
  console.log(`Toggled: ${clickedItem.textContent}`);
});
```

`event.target.closest('li')` walks up from the exact clicked element to the nearest ancestor `<li>` — necessary because a click might land on a child of the `<li>` (a checkbox icon, a span) rather than the `<li>` itself, and `event.target` always reports the most specific element under the cursor, not the one the listener is attached to.

### Worked example: a dynamically-populated task list

A single listener, attached once, transparently handles items added at any point afterward — including items created seconds, minutes, or hours later by user actions or by data arriving from elsewhere.

```html
<ul id="task-list">
  <li>Read the docs</li>
  <li>Write the tests</li>
</ul>
<input id="new-task-input" type="text" placeholder="New task" />
<button id="add-task-btn">Add task</button>
```

```js
const taskList = document.querySelector('#task-list');
const input = document.querySelector('#new-task-input');
const addButton = document.querySelector('#add-task-btn');

// ONE listener, attached once, on the stable parent
taskList.addEventListener('click', (event) => {
  const clickedItem = event.target.closest('li');
  if (!clickedItem || !taskList.contains(clickedItem)) return;

  clickedItem.classList.toggle('done');
});

// Adding new items later never needs a matching new listener
addButton.addEventListener('click', () => {
  const text = input.value.trim();
  if (!text) return;

  const newItem = document.createElement('li');
  newItem.textContent = text;
  taskList.appendChild(newItem);   // this item is ALREADY clickable — no extra wiring needed

  input.value = '';
});

// Simulated usage:
// 1. Page loads with 2 items, both toggleable via the delegated listener.
// 2. User types "Buy milk", clicks "Add task" — a 3rd <li> is appended.
// 3. User clicks "Buy milk" — taskList's single listener catches the bubbled
//    click event, finds the nearest <li> via closest(), toggles its class.
//    No listener was ever attached to that specific <li>.
```

This pattern also closes over `taskList` and `input` via closures (file 7) rather than relying on `this` — each callback simply references the outer variable by name, which stays correct regardless of how or when the callback is invoked.

### Why delegate: the trade-offs

| | One listener per child | Delegation (one listener on parent) |
|---|---|---|
| Handles dynamically-added elements | No — needs re-wiring every time | Yes, automatically |
| Memory / listener count | Grows with number of children | Constant — always exactly one |
| Setup complexity | Simple per-element logic | Requires identifying the right target (`closest`) inside the handler |
| Works when children are removed/replaced wholesale | Old listeners silently orphaned (leak until GC) | Nothing to clean up — the listener lives on the parent |

---

## 💡 Cheat Sheet: Quick Reference

```js
// Selecting
document.querySelector('.card');         // first match
document.querySelectorAll('.card');      // static NodeList, all matches
document.getElementById('main');

// Reading / writing content
el.textContent = 'safe text';
el.innerHTML = '<b>parsed markup</b>';   // XSS risk with untrusted input

// Classes, attributes, styles
el.classList.add('active'); el.classList.remove('x'); el.classList.toggle('y');
el.setAttribute('data-id', '42'); el.getAttribute('data-id');
el.style.color = 'red';

// Creating & inserting
const node = document.createElement('li');
parent.appendChild(node);
node.remove();

// Events
el.addEventListener('click', (event) => { /* event.target, event.currentTarget */ });
el.addEventListener('click', handler, true);   // capturing phase instead of bubbling
event.stopPropagation();                        // stop the event traveling further

// Delegation pattern
parent.addEventListener('click', (event) => {
  const item = event.target.closest('.child-selector');
  if (!item || !parent.contains(item)) return;
  // handle item
});
```

---

## 🎯 Key Takeaways

- The DOM, `fetch`, `setTimeout`, and `console` are Browser/Node **host APIs**, not ECMAScript language features — this is why identical JS syntax behaves differently across environments, and why async APIs hand work off to infrastructure outside the engine.
- The DOM is a live tree; JS reads it with `querySelector`/`getElementById`, mutates it with `textContent`/`classList`/`setAttribute`, and grows it with `createElement` + `appendChild` — always editing the live page, never the source `.html`.
- Every DOM event travels capturing (top-down) then bubbling (bottom-up) through the tree; `addEventListener` listens on the bubbling phase by default, and `event.stopPropagation()` halts that travel.
- Event delegation attaches one listener to a stable parent and uses `event.target.closest(...)` to identify what was actually clicked — it automatically covers elements added to the DOM after the listener was attached, with a constant memory footprint regardless of list size.
- Prefer `event.target`/`event.currentTarget` over relying on implicit binding inside handlers for now — `this` inside a DOM callback has its own binding rules, covered later once the mechanics are in place to explain them properly.

---

## 📚 Related Concepts to Explore Next

This file builds on the closures from [07-Closures-Currying-Real-World-Patterns.md](./07-Closures-Currying-Real-World-Patterns.md) (the delegated handler above closes over `taskList` and `input` exactly the way a closure captures outer variables) and the collection types from [10-Collections-Iteration-Protocol.md](./10-Collections-Iteration-Protocol.md) (a `WeakMap` is a common way to attach metadata to DOM elements without leaking memory as they're added and removed). The next file, [12-Prototypes-Inheritance-Proxy-Reflect.md](./12-Prototypes-Inheritance-Proxy-Reflect.md), moves from browser mechanics back into the language itself, explaining the mechanism (the prototype chain) that lets every DOM element you've selected here inherit methods like `addEventListener` in the first place.

---

## 🔗 Resources

- [MDN — Introduction to the DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction)
- [MDN — EventTarget.addEventListener()](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
- [MDN — Event bubbling and capture](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling)
- [MDN — Element.closest()](https://developer.mozilla.org/en-US/docs/Web/API/Element/closest)
