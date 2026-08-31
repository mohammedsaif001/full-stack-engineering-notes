# TypeScript Classes: OOP, Access Modifiers & Abstract Architectures
## Part 6 of 8 — Object-Oriented Design, Encapsulation & Polymorphism

---

## 📌 Executive Summary

- **Object-Oriented Programming (OOP) in TypeScript**: Builds on ES6 classes with static type annotations, access control modifiers, parameter properties, abstract classes, and interface implementation contracts.
- **Access Modifiers**:
  - `public` (default): Accessible from anywhere.
  - `protected`: Accessible within the declaring class and its subclasses.
  - `private` (TypeScript compile-time): Accessible only within the declaring class.
  - `#field` (ECMAScript runtime private): Truly private at JavaScript runtime.
- **Parameter Properties**: Concise constructor syntax that automatically declares and initializes class fields (`constructor(public name: string)`).
- **Abstract Classes**: Base classes that cannot be directly instantiated and contain abstract method signatures that derived classes must implement.
- **Interface Implementation (`implements`)**: Enforces that a class adheres to a predefined contract shape.

---

## 🧠 Core Analogies

- **Access Modifiers as Security Clearances**:
  - `public`: The company reception lobby — anyone from the public can walk in and view the directory.
  - `protected`: The employee-only office floor and subsidiaries — employees and their branch offices can enter, but the general public cannot.
  - `private`: The CEO's private safe — only the CEO inside that specific room has the combination.
- **Abstract Class as an Automobile Chassis**:
  - You cannot buy a raw "Vehicle" chassis off the lot and drive it on the highway (cannot instantiate abstract classes). However, every specific car (Sedan, Truck) must build upon the chassis and implement the required `steer()` and `brake()` controls.

---

## 🔒 1. Access Modifiers & Encapsulation

```typescript
class BankAccount {
  // 1. Public: Available everywhere
  public readonly accountNumber: string;

  // 2. Protected: Available here and in subclasses
  protected accountType: string;

  // 3. TypeScript Private: Enforced at compile-time only
  private _balance: number;

  // 4. ECMAScript Private: Enforced at JS runtime using #
  #internalPin: string;

  constructor(accountNumber: string, initialBalance: number, pin: string) {
    this.accountNumber = accountNumber;
    this.accountType = "Savings";
    this._balance = initialBalance;
    this.#internalPin = pin;
  }

  // Getter
  public get balance(): number {
    return this._balance;
  }

  // Setter with validation
  public set balance(amount: number) {
    if (amount < 0) throw new Error("Balance cannot be negative");
    this._balance = amount;
  }

  // Public Method
  public deposit(amount: number): void {
    this._balance += amount;
  }
}

const account = new BankAccount("ACC-9081", 500, "1234");
console.log(account.balance);       // 500
account.deposit(200);
console.log(account.balance);       // 700
// account._balance = 1000;         // ❌ Compile Error: Property '_balance' is private
```

---

## ⚡ 2. Constructor Parameter Properties

TypeScript provides shorthand syntax that declares and initializes properties directly in the constructor arguments:

```typescript
// Shorthand Syntax (Idiomatic TypeScript)
class UserSession {
  constructor(
    public userId: string,
    public email: string,
    private token: string,
    public readonly loginTime: Date = new Date()
  ) {
    // No manual assignment needed! TypeScript automatically executes:
    // this.userId = userId;
    // this.email = email;
    // this.token = token;
    // this.loginTime = loginTime;
  }
}
```

---

## 🏛️ 3. Inheritance & `super`

Classes can inherit behavior and properties from parent classes using `extends`:

```typescript
class BaseEntity {
  constructor(
    public readonly id: string,
    public readonly createdAt: Date = new Date()
  ) {}

  public getAgeInDays(): number {
    return (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  }
}

class ProductEntity extends BaseEntity {
  constructor(
    id: string,
    public name: string,
    public price: number
  ) {
    // super() must be invoked before accessing 'this'
    super(id);
  }

  public getFormattedPrice(): string {
    return `$${this.price.toFixed(2)}`;
  }
}
```

---

## 📋 4. Implementing Interfaces (`implements`)

A class can implement one or more interfaces to enforce architectural contracts:

```typescript
interface Logger {
  log(message: string): void;
  error(error: string): void;
}

interface Serializable {
  serialize(): string;
}

// Class must fulfill both contracts
class ConsoleAuditLogger implements Logger, Serializable {
  constructor(private context: string) {}

  public log(message: string): void {
    console.log(`[${this.context}] INFO: ${message}`);
  }

  public error(error: string): void {
    console.error(`[${this.context}] ERROR: ${error}`);
  }

  public serialize(): string {
    return JSON.stringify({ context: this.context });
  }
}
```

---

## 🏗️ 5. Abstract Classes & Polymorphism

Abstract classes serve as base templates for other classes. They can contain both **concrete implementations** and **abstract method declarations**.

```typescript
abstract class PaymentProcessor {
  constructor(public currency: string) {}

  // Concrete method shared by all processors
  public logTransaction(amount: number): void {
    console.log(`Processing transaction of ${amount} ${this.currency}`);
  }

  // Abstract method: Subclasses MUST implement this!
  public abstract processPayment(amount: number): Promise<boolean>;
}

class StripeProcessor extends PaymentProcessor {
  constructor(currency: string, private apiKey: string) {
    super(currency);
  }

  public async processPayment(amount: number): Promise<boolean> {
    this.logTransaction(amount);
    // Stripe SDK charge API call...
    return true;
  }
}

class PayPalProcessor extends PaymentProcessor {
  public async processPayment(amount: number): Promise<boolean> {
    this.logTransaction(amount);
    // PayPal API call...
    return true;
  }
}

// const processor = new PaymentProcessor("USD"); // ❌ Compile Error: Cannot create an instance of an abstract class
const stripe = new StripeProcessor("USD", "sk_test_123"); // ✅ Valid
```

---

## 🎯 6. Summary & Quick Revision Checklist

- [ ] **Access Modifiers**: `public` (everywhere), `protected` (subclasses), `private` (compile-time), `#` (runtime JS private).
- [ ] **Parameter Properties**: Use `constructor(public name: string)` to eliminate repetitive constructor assignments.
- [ ] **Getters/Setters**: Encapsulate internal fields with `get` and `set` accessors.
- [ ] **`implements`**: Force classes to adhere to interface contracts.
- [ ] **`abstract` Classes**: Use abstract base classes to define shared template behaviors and enforce subclass implementations.
- [ ] **Static Members**: Use `static` for utility methods that belong to the class constructor rather than instances.
