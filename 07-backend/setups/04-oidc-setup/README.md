# OIDC Auth Server

Minimal OIDC-compliant auth server: RS256-signed JWTs, `.well-known` discovery,
JWKS, and a full OAuth 2.0 authorization-code exchange with registered clients.

## Setup

1. Create `.env` with:
   ```
   DATABASE_URL=postgres://user:password@localhost:5432/oidc
   PORT=8000
   ```
2. `pnpm install`
3. `pnpm db:migrate`
4. `pnpm dev`

## Register a demo client

```bash
pnpm seed:client "My Test App" "http://localhost:3000/callback"
```

This prints a `client_id` and `client_secret` once — save them, they are
stored hashed and cannot be shown again.

## Full authorization-code flow (curl walkthrough)

Assume the server is at `http://localhost:8000`, and you registered a client
with `redirect_uri=http://localhost:3000/callback`.

**1. Send the user to the authorization endpoint** (in a real app this is a
browser redirect; here just open it in a browser):

```
http://localhost:8000/o/authenticate?client_id=<CLIENT_ID>&redirect_uri=http://localhost:3000/callback&state=xyz
```

**2. Sign up or sign in** through the form. The server validates
`client_id`/`redirect_uri` against the registered client, and responds with:

```json
{ "redirect": "http://localhost:3000/callback?code=<CODE>&state=xyz" }
```

The page JS follows that redirect. In a real client app, `/callback` would be
a server route that reads `code` from the query string. Since nothing is
listening on `localhost:3000` in this demo, just grab `code` from the
response (e.g. via browser dev tools Network tab) before the redirect fires.

**3. Exchange the code for a token — server-to-server:**

```bash
curl -X POST http://localhost:8000/o/token \
  -H "Content-Type: application/json" \
  -d '{
    "code": "<CODE>",
    "client_id": "<CLIENT_ID>",
    "client_secret": "<CLIENT_SECRET>"
  }'
```

Response:

```json
{ "token": "<JWT>" }
```

The code is single-use and expires after 60 seconds — re-using it returns
`400 Invalid or expired code`.

**4. Use the token against userinfo:**

```bash
curl http://localhost:8000/o/userinfo \
  -H "Authorization: Bearer <JWT>"
```

## Endpoints

| Route | Purpose |
|---|---|
| `GET /.well-known/openid-configuration` | OIDC discovery document |
| `GET /.well-known/jwks.json` | Public key (JWKS) for verifying tokens |
| `GET /o/authenticate` | Login page |
| `POST /o/authenticate/sign-in` | Validates credentials + client, returns `{ redirect }` with a short-lived code |
| `POST /o/authenticate/sign-up` | Creates a user, then same as sign-in |
| `POST /o/token` | Exchanges `code + client_id + client_secret` for a signed JWT |
| `GET /o/userinfo` | Returns claims for a valid Bearer token |

See [`../08-JWT-Keys-OIDC-OAuth2-Auth-Architecture.md`](../../08-JWT-Keys-OIDC-OAuth2-Auth-Architecture.md)
for the full concepts this implements.
