# Staff login

Staff sign in with username and password to reach the admin area; unauthenticated visits to `/admin*` are sent to the login page.

## Sub-features

- `login-ok` valid credentials land on `/admin`.
- `login-bad` wrong password shows an error and stays on `/login`.
- `login-guard` visiting `/admin/menu` logged out redirects to `/login`.

## How to get to it (user POV)

- Open `/login` directly.
- Open any `/admin...` URL while logged out.

## Driving it with munchctl browser

Preconditions:

- Baseline; `verify_admin` exists (seeded by launch).

- **Guard.** `page.goto(WEB + '/admin/menu')`. URL ends at `/login`.
- **Bad password.** Fill `#username`=`verify_admin`, `#password`=`wrong`, click button `Iniciar Sesión`. A red error `h3` appears; URL stays `/login`.
- **Good login.** Use `login()`. URL becomes `/admin`; `localStorage.auth_token` is set.
- **Proof.** `shot('login-error')`, `shot('admin-landing')`; API side check: `POST /api/auth/validate` style check via `GET /api/auth/validate` with `Authorization: Bearer <token>` returns `"valid":true`.

## Gotchas

- `JWT_SECRET` is per run; tokens from other runs are invalid.
- Button text flips to `Iniciando sesión...` while pending; wait for URL change, not the button.
- Not yet driven end to end — journey not written.
