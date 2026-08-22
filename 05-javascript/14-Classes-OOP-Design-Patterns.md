# Classes, OOP & Design Patterns
## Part 14 of 17 — `class` Syntax in Full, Then Three Patterns Built On It

---

## 📌 Executive Summary

- **What is a `class`, really?** Syntactic sugar over the constructor-function-plus-`.prototype` pattern from file 13 — `typeof MyClass === "function"`, always. There is no separate "class" mechanism inside the engine.
- **Why do two instances of the same class share methods but not data?** Methods live once on the shared prototype (file 12's prototype chain); instance fields (`this.x = ...`) are copied fresh per instance, built during the `new` steps file 13 laid out.
- **How does one class extend another, and what does `super` actually do?** `extends` wires up the prototype chain automatically; `super(...)` must run first inside a subclass constructor, because the subclass's own `this` doesn't exist until the parent constructor builds it.
- **How do you get truly private data in a class**, not just a "please don't touch this" naming convention? The `#field` syntax — enforced by the engine, not a social contract.
- **How do the three most common class-based design patterns actually work?** Singleton (one shared instance, guarded at construction), Observer (a subject that notifies a list of subscribers), and Factory (a single creation point that decides which class to instantiate) — all just classes applying the mechanics above with intent.

---

## 🧠 Core Analogy: The Vehicle Manufacturing Plant

- A **class** is the plant's official build blueprint — the exact same spec sheet used to produce every unit of that model.
- **`constructor`** is what happens the moment a unit rolls off the line and gets configured: model name stamped, mileage zeroed, fuel tank filled.
- **Instance fields** (`this.model`, `this.mileage`) are things unique to *that one unit* — its own serial-numbered configuration.
- **Methods** (`describe()`) are the *shared service manual* — every unit is serviced using the exact same manual (one copy, on the prototype), not a personal photocopy per vehicle.
- **`static`** members belong to the *plant itself*, not to any individual unit — "total units produced so far" is a fact about the plant, not about any one vehicle.
- **`extends`/`super`** is a *specialized production line*: an electric model is still a vehicle first (`super()` runs the base build), then gets extra battery-specific assembly bolted on.
- **`#privateField`** is a sealed component only the plant's own internal machinery can read or write — the sales floor outside can't reach in and tamper with it.
- **Singleton** is the plant's *one* headquarters — every department asks for "the HQ" and gets routed to the same building, never a duplicate.
- **Observer** is the plant's *recall alert system* — when a defect is logged, every subscribed department (service, sales, logistics) gets notified automatically, without the alert system needing to know who they are in advance.
- **Factory** is the *order desk* — a customer specifies "sedan" or "truck," and the desk decides which production line actually builds the unit, without the customer ever calling a specific line directly.

---

## 🏗️ 1. Classes Are Just Functions — the Syntactic Sugar

```js
class Vehicle {
  constructor(model, type) {
    this.model = model;
    this.type = type;
    this.mileage = 0;
    this.fuelLevel = 100;
  }

  describe() {
    return `${this.model} (${this.type}) | mileage: ${this.mileage} | fuel: ${this.fuelLevel}`;
  }
}

const car1 = new Vehicle("Model X", "Sedan");
const car2 = new Vehicle("Model Y", "SUV");

console.log(car1.hasOwnProperty("model"));   // true — instance fields ARE the object's own properties
console.log(typeof Vehicle);                 // "function" — classes are functions under the hood!
```

> **Interview "gotcha": `typeof` a class is `"function"`.** `class` is **syntactic sugar** — a cleaner way to write the exact same constructor-function-plus-`.prototype`-methods pattern from file 13 §8–9. There is no separate "class" mechanism in the engine; `class Vehicle {}` compiles down to essentially the same thing as `function Vehicle(...) {...}` with `Vehicle.prototype.describe = ...` attached afterward — the same prototype chain file 12 introduced.

```js
console.log(car1.describe());
console.log(car2.describe());
// Model X (Sedan) | mileage: 0 | fuel: 100
// Model Y (SUV) | mileage: 0 | fuel: 100
```

> **Methods are shared via the prototype; `this` inside them is still per-call.** `car1` and `car2` each get their own **separate `this`** even though they're both calling the exact same `describe` method — one single copy, sitting on `Vehicle.prototype`, shared by every instance. The call-site rule from file 13 §2 (`this` = whatever is left of the dot) applies to class methods identically to plain object methods.

---

## ⚙️ 2. The `constructor` — a Special Method

> **`constructor` is a special method used to create and initialize an object instance of a class.** It runs automatically, exactly once, the moment `new ClassName(...)` is called — the class-syntax equivalent of the function-constructor body from file 13 §8.
>
> **A `method`, more generally, is a function that belongs to an object or a class.**

```js
class InspectionStation {
  constructor(stationId) {
    this.stationId = stationId;
    this.logPass = () => `Station ${this.stationId} approved this unit`;
  }
}

const station1 = new InspectionStation("A1");
const detachedLog = station1.logPass;   // detach it...
console.log(detachedLog());             // still works! "Station A1 approved this unit"

const station2 = new InspectionStation("B2");
console.log(station1.logPass === station2.logPass);   // false — NOT shared, unlike a regular prototype method
```

This is the exact detached-method fix from file 13 §5: defining `logPass` as an **arrow function assigned inside the constructor** binds `this` to that specific instance permanently (arrow functions never bind their own `this` — they inherit it lexically), at the cost of creating one separate copy of the function *per instance* — unlike `describe` above, which is one shared function on the prototype.

---

## 🏛️ 3. `static` Members — Belonging to the Class, Not the Instance

> A **`static` member** (method or property) belongs to the **class itself**, not to any individual instance. You call it as `ClassName.member`, never `instance.member` — instances can't see or use static members directly.

```js
class Vehicle {
  static totalUnitsProduced = 0;   // static field — one shared value, owned by the class

  constructor(model, type) {
    this.model = model;
    this.type = type;
    this.mileage = 0;
    Vehicle.totalUnitsProduced++;   // access via the CLASS name, not `this`
  }

  static compareMileage(vehicleA, vehicleB) {   // static method — a utility that belongs to the class
    return vehicleA.mileage - vehicleB.mileage;
  }
}

const unitA = new Vehicle("Model X", "Sedan");
const unitB = new Vehicle("Model Y", "SUV");

console.log(Vehicle.totalUnitsProduced);           // 2 — one shared counter, not per-instance
console.log(unitA.totalUnitsProduced);              // undefined — instances cannot see static members
console.log(Vehicle.compareMileage(unitA, unitB));  // 0 — called on the CLASS, not an instance
```

**Real-world use:** utility/helper functions that logically belong to a class but don't need any particular instance's data (`Array.isArray()`, `Object.keys()`, `Math.max()` are all static methods on built-in classes/objects), and shared counters/registries/caches/config that all instances should see the same copy of.

---

## 🧬 4. Inheritance — `extends` and `super`

> **`extends`** sets up the prototype chain between two classes automatically — the child class's instances inherit everything the parent class defines, and can add or override behavior on top.
>
> **`super`** does two different jobs depending on where it's used: **`super(...)`** (called as a function, inside a subclass constructor) invokes the *parent's* constructor; **`super.method()`** calls a specific method from the parent class, useful when overriding a method but still wanting the original behavior too.

```js
class Vehicle {
  constructor(model, type) {
    this.model = model;
    this.type = type;
    this.mileage = 0;
  }

  describe() {
    return `${this.model} (${this.type})`;
  }
}

class ElectricVehicle extends Vehicle {
  constructor(model, batteryCapacityKwh) {
    super(model, "Electric");   // MUST run first — builds the base `this` via the parent constructor
    this.batteryCapacityKwh = batteryCapacityKwh;
  }

  describe() {
    const baseDescription = super.describe();   // call the PARENT's version of describe()
    return `${baseDescription}, battery: ${this.batteryCapacityKwh} kWh`;
  }
}

const ev1 = new ElectricVehicle("Model E", 75);
console.log(ev1.describe());              // Model E (Electric), battery: 75 kWh
console.log(ev1 instanceof Vehicle);       // true — ElectricVehicle IS-A Vehicle, via the prototype chain
console.log(ev1 instanceof ElectricVehicle); // true
```

> **Why must `super()` be called before using `this` in a subclass constructor?** In a derived class, `this` does not exist yet at the start of the constructor — it only comes into existence once the parent constructor (`super(...)`) has run and built the base object. Trying to write `this.batteryCapacityKwh = ...` *before* calling `super(...)` throws a `ReferenceError: Must call super constructor before accessing 'this'`. This is a direct consequence of the four-step `new` mechanism from file 13 §9 — `super()` is what actually performs those steps for the parent's half of the object.

**The chain this builds:**

```
ev1 → ElectricVehicle.prototype → Vehicle.prototype → Object.prototype → null
```

Exactly the same prototype-chain mechanism as `Object.create()` from file 12 §3 — `extends` is just automated syntax for wiring that chain up, instead of doing it by hand.

---

## 🔒 5. Public vs Private Fields

> By default, every field and method on a class is **public** — accessible from outside the class via `instance.field`. **Private fields**, prefixed with `#`, are enforced by the JS engine itself — code outside the class **cannot** read, write, or even check for their existence; attempting to access `instance.#field` from outside throws a `SyntaxError` at parse time.

```js
class InventoryAccount {
  #unitsInStock;         // private field — declared with #, NOT accessible outside the class
  warehouseId;            // public field

  constructor(warehouseId, initialUnits) {
    this.warehouseId = warehouseId;
    this.#unitsInStock = initialUnits;
  }

  receiveShipment(units) {
    this.#unitsInStock += units;
    return this.#formattedStock();   // private methods work the same way — # prefix
  }

  dispatchOrder(units) {
    if (units > this.#unitsInStock) {
      throw new Error("Insufficient stock");
    }
    this.#unitsInStock -= units;
    return this.#formattedStock();
  }

  #formattedStock() {   // PRIVATE method — internal helper, not part of the public API
    return `Stock: ${this.#unitsInStock} units`;
  }
}

const wh1 = new InventoryAccount("WH-12", 1000);
console.log(wh1.receiveShipment(500));   // "Stock: 1500 units"
console.log(wh1.warehouseId);            // "WH-12" — public, freely accessible

console.log(wh1.#unitsInStock);          // ❌ SyntaxError — #unitsInStock is not accessible from outside the class
console.log(wh1.unitsInStock);           // undefined — this is NOT the same as #unitsInStock, just a missing public property
```

> **This is real, enforced privacy — not a naming convention.** Before `#` private fields existed, JS developers used a leading underscore (`_unitsInStock`) purely as a *social contract* — "please don't touch this from outside," but nothing actually stopped you. `#unitsInStock` is genuinely inaccessible from outside the class body; there's no workaround via bracket notation, reflection, or otherwise.

| | Public field/method | Private field/method (`#`) |
|---|---|---|
| Syntax | `fieldName` | `#fieldName` |
| Accessible outside the class? | ✅ Yes | ❌ No — enforced by the engine, `SyntaxError` if attempted |
| Accessible inside subclasses (`extends`)? | ✅ Yes | ❌ No — private fields are NOT inherited/visible to subclasses either |
| Old-school equivalent | — | `_fieldName` convention (never actually enforced) |

> ⚠️ **There is no `private`/`public` keyword in plain JavaScript.** Writing `private balance = 0;` inside a class body is a **SyntaxError** in real JS — that syntax belongs to **TypeScript**, not JavaScript. TypeScript's `private`/`public`/`protected` are compile-time-only annotations: the TS compiler checks your code against them, then **strips them out entirely** when it compiles down to plain JS, leaving a normal, fully public field behind — anyone can still reach it at runtime. `#field` is the only mechanism in either language that's actually **enforced by the engine at runtime**.

---

## ⚠️ 6. `throw`, `throw new Error(...)`, and `throw new CustomClass(...)`

> **`throw` can technically throw *any* value** — a string, a number, a plain object, or (the standard, correct practice) an `Error` instance. What you throw determines what downstream `catch` blocks receive and what properties/behavior they can rely on. (This section shows what different `throw` forms produce; the full shape of `try`/`catch`/`finally` itself is covered next, in file 15.)

```js
// ❌ Throwing a raw string — technically legal, but loses everything an Error gives you
function riskyDispatch() {
  throw "Stock check failed";
}
try {
  riskyDispatch();
} catch (e) {
  console.log(e);           // "Stock check failed"
  console.log(e.message);   // undefined — strings don't HAVE a .message property
  console.log(e.stack);     // undefined — no stack trace at all
}
```

```js
// ✅ Throwing `new Error(...)` — the standard, correct way
function riskyDispatch2() {
  throw new Error("Stock check failed");
}
try {
  riskyDispatch2();
} catch (e) {
  console.log(e.message);            // "Stock check failed"
  console.log(e.name);               // "Error"
  console.log(e instanceof Error);   // true
}
```

```js
// ✅✅ Throwing a CUSTOM error class — extends the real Error, gains real Error behavior PLUS your own data
class OutOfStockError extends Error {
  constructor(message, sku) {
    super(message);                 // sets up e.message via Error's own constructor
    this.name = "OutOfStockError";  // overrides the default "Error" name
    this.sku = sku;                 // your own extra data, specific to this error type
  }
}

function dispatchOrder(sku, requested, available) {
  if (requested > available) {
    throw new OutOfStockError(`Cannot dispatch ${requested} units`, sku);
  }
}

try {
  dispatchOrder("SKU-42", 50, 10);
} catch (e) {
  console.log(e.message);                       // "Cannot dispatch 50 units"
  console.log(e.name);                          // "OutOfStockError"
  console.log(e.sku);                           // "SKU-42" — custom data only THIS error type carries
  console.log(e instanceof OutOfStockError);    // true — lets you branch on error TYPE
  console.log(e instanceof Error);              // true — still a real Error underneath (via extends)
}
```

| What you `throw` | `.message` works? | `.stack` works? | `instanceof Error`? | Can carry custom data? |
|---|---|---|---|---|
| `throw "string"` | ❌ No | ❌ No | ❌ No | ❌ No |
| `throw new Error("msg")` | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No (generic) |
| `throw new CustomError("msg", ...)` (`extends Error`) | ✅ Yes | ✅ Yes | ✅ Yes (+ `instanceof CustomError`) | ✅ Yes |

> **Why should you always throw an `Error` object (or a subclass), never a raw string?** Logging tools, monitoring systems, and calling code all universally expect `.message`, `.stack`, and `.name` to exist for meaningful error reporting — a thrown string breaks all of that silently. Custom error classes go one step further: they let calling code distinguish *what kind* of failure happened via `instanceof`, and attach structured extra data without cramming everything into the message string. Full `try`/`catch`/`finally` mechanics are covered next, in [15-Error-Handling-Defensive-Coding.md](./15-Error-Handling-Defensive-Coding.md).

---

## 🏭 7. Design Pattern: Singleton

> **Singleton** guarantees a class has **exactly one instance**, and provides one well-known way to reach it. Any code asking for "the instance" gets routed to the same shared object, never a fresh one.

```js
class AppConfig {
  static #instance;   // private — holds the one-and-only instance, unreachable from outside

  constructor(environment) {
    if (AppConfig.#instance) {
      return AppConfig.#instance;   // guard: hand back the EXISTING instance instead of building a new one
    }
    this.environment = environment;
    this.settings = { retries: 3, timeoutMs: 5000 };
    AppConfig.#instance = this;
  }

  static getInstance() {
    if (!AppConfig.#instance) {
      AppConfig.#instance = new AppConfig("production");
    }
    return AppConfig.#instance;
  }
}

const configA = AppConfig.getInstance();
const configB = AppConfig.getInstance();

console.log(configA === configB);   // true — same object, not two separate configs

configA.settings.retries = 5;
console.log(configB.settings.retries);   // 5 — same underlying object, so the change is visible from either reference

const directAttempt = new AppConfig("staging");
console.log(directAttempt === configA);   // true — the constructor guard intercepts direct `new` calls too
```

> **Why does `new AppConfig("staging")` still return the original instance?** When a constructor explicitly `return`s an object, `new` uses *that* returned object as the result instead of the freshly built one — this is the exception to file 13 §9's step 4 ("if the constructor does NOT explicitly return its own object..."). The `if (AppConfig.#instance) return AppConfig.#instance;` guard exploits exactly that exception to make every construction path — `getInstance()` or a raw `new` — converge on the same object.

**Real-world use:** a single shared configuration object, a single database connection pool, a single logging service — anywhere exactly one shared instance should exist app-wide.

---

## 📡 8. Design Pattern: Observer

> **Observer** lets a "subject" maintain a list of subscribers and notify all of them automatically whenever something happens — the subject doesn't need to know who its subscribers are in advance, only that they can be called.

```js
class ShipmentTracker {
  #subscribers = [];

  subscribe(callback) {
    this.#subscribers.push(callback);
  }

  unsubscribe(callback) {
    this.#subscribers = this.#subscribers.filter((sub) => sub !== callback);
  }

  updateStatus(status) {
    this.#subscribers.forEach((callback) => callback(status));   // notify every current subscriber
  }
}

const tracker = new ShipmentTracker();

const emailAlert = (status) => console.log(`Email: shipment is now "${status}"`);
const smsAlert = (status) => console.log(`SMS: shipment is now "${status}"`);

tracker.subscribe(emailAlert);
tracker.subscribe(smsAlert);

tracker.updateStatus("out for delivery");
// Email: shipment is now "out for delivery"
// SMS: shipment is now "out for delivery"

tracker.unsubscribe(smsAlert);
tracker.updateStatus("delivered");
// Email: shipment is now "delivered"
```

After `unsubscribe(smsAlert)`, only `emailAlert` remains in `#subscribers`, so the second `updateStatus` call notifies just that one callback.

**Real-world use:** UI event systems, pub/sub messaging, reactive state libraries — anywhere multiple independent parts of a system need to react to one shared event without being tightly coupled to whoever triggers it.

---

## 🏗️ 9. Design Pattern: Factory

> **Factory** centralizes object creation behind a single function or method that decides, based on input, *which* class to instantiate — callers never construct the concrete classes directly, only ask the factory for what they need.

```js
class SedanVehicle {
  constructor(model) {
    this.model = model;
    this.type = "Sedan";
    this.wheels = 4;
  }
}

class MotorcycleVehicle {
  constructor(model) {
    this.model = model;
    this.type = "Motorcycle";
    this.wheels = 2;
  }
}

class TruckVehicle {
  constructor(model) {
    this.model = model;
    this.type = "Truck";
    this.wheels = 6;
  }
}

class VehicleFactory {
  static create(type, model) {
    switch (type) {
      case "sedan":
        return new SedanVehicle(model);
      case "motorcycle":
        return new MotorcycleVehicle(model);
      case "truck":
        return new TruckVehicle(model);
      default:
        throw new Error(`Unknown vehicle type: ${type}`);
    }
  }
}

const v1 = VehicleFactory.create("sedan", "Model X");
const v2 = VehicleFactory.create("truck", "Model H");

console.log(v1);   // SedanVehicle { model: 'Model X', type: 'Sedan', wheels: 4 }
console.log(v2);   // TruckVehicle { model: 'Model H', type: 'Truck', wheels: 6 }
console.log(v1 instanceof SedanVehicle);   // true
console.log(v1 instanceof VehicleFactory); // false — the factory CREATES instances, it isn't their prototype
```

**Real-world use:** UI component libraries that create the right component subclass from a config object, parsers that return different node classes depending on token type, and any place `new SpecificClass(...)` would otherwise be scattered across the codebase instead of centralized in one place.

---

## 💡 Cheat Sheet: Quick Reference

| Concept | One-line summary |
|---|---|
| `class` | Syntactic sugar over a constructor function + `.prototype` methods (file 12/13 mechanics) |
| `constructor` | Runs once, automatically, on `new ClassName(...)` |
| Instance field (`this.x`) | Copied fresh per instance |
| Prototype method | One shared copy, used by every instance |
| `static member` | Belongs to the class, accessed as `ClassName.member`, not `instance.member` |
| `extends` | Wires up the prototype chain between parent and child class |
| `super(...)` | Calls the parent constructor — must run before `this` is used in a subclass constructor |
| `super.method()` | Calls the parent's version of an overridden method |
| `#field` | Private — enforced by the engine, inaccessible outside the class, not inherited by subclasses |
| `throw "string"` | No `.message`, no `.stack`, no `instanceof Error` |
| `throw new Error(msg)` | Has `.message`/`.stack`/`instanceof Error`, but generic |
| `throw new CustomError(msg)` (`extends Error`) | All of the above, plus custom data and `instanceof CustomError` |
| Singleton | Guards construction so only one instance ever exists |
| Observer | Subject keeps a subscriber list, notifies all of them on an event |
| Factory | One creation point picks the concrete class based on input |

---

## 🎯 Key Takeaways

- `class` is not a new runtime mechanism — it's syntactic sugar over the constructor-function-plus-prototype pattern from file 12 and file 13; `typeof AnyClass === "function"` always confirms this.
- `constructor` initializes each new instance's own fields; regular methods live once on the shared prototype, while methods defined as arrow-function instance fields are duplicated per instance to permanently lock `this`.
- `static` members belong to the class itself, `extends`/`super` build the prototype chain and let a subclass call back into its parent's constructor or methods, and `#field` gives genuinely enforced privacy that no naming convention ever could.
- Always throw `Error` instances (or subclasses of `Error`) rather than raw values — it's the only form that reliably carries `.message`, `.stack`, and supports `instanceof` checks downstream.
- Singleton, Observer, and Factory are not exotic — they're ordinary classes applying `static` state, a subscriber array, and a conditional creation method respectively, with deliberate intent behind the structure.

---

## 📚 Related Concepts to Explore Next

This file delivers on the forward-pointers file 12 and file 13 both made toward `class` syntax, building directly on [13-This-Keyword-Call-Apply-Bind.md](./13-This-Keyword-Call-Apply-Bind.md)'s `this`-resolution rules and four-step `new` mechanism. The `throw` progression here is intentionally shallow — full `try`/`catch`/`finally` mechanics, `.message`/`.stack`/`.name` in depth, and defensive coding patterns are covered next, in [15-Error-Handling-Defensive-Coding.md](./15-Error-Handling-Defensive-Coding.md).

---

## 🔗 Resources

- [MDN — Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)
- [MDN — extends](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends)
- [MDN — Private class features](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties)
- [MDN — Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
