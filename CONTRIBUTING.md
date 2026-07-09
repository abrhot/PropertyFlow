# Contributing

## Branching

- `main` — always working/deployable.
- Feature branches off `main`: `feat/work-orders-crud`, `fix/login-redirect`, `docs/api-notes`.

```bash
git checkout -b feat/work-orders-crud
```

## Commit messages — Conventional Commits

Every commit message looks like:

```
<type>(<optional scope>): <short summary>
```

- Use the **imperative mood** ("add", not "added"/"adds").
- Keep the summary under ~72 characters, lowercase, no trailing period.
- Scope is usually the app/package touched: `web`, `api`, `mobile`, `ui`, `types`,
  `auth`, `db`, `validation`, `constants`, `repo`.

### Types

| Type       | When to use it                                              |
| ---------- | ---------------------------------------------------------- |
| `feat`     | A new feature.                                             |
| `fix`      | A bug fix.                                                 |
| `docs`     | Documentation only.                                       |
| `style`    | Formatting, no code-behavior change.                      |
| `refactor` | Code change that neither fixes a bug nor adds a feature.  |
| `perf`     | A performance improvement.                                |
| `test`     | Adding or fixing tests.                                   |
| `build`    | Build system or dependency changes.                       |
| `ci`       | CI configuration changes.                                 |
| `chore`    | Routine tasks, no src/test change (e.g. scaffolding).     |

### Examples

```bash
git commit -m "feat(api): add work order CRUD endpoints"
git commit -m "fix(web): correct login redirect after refresh"
git commit -m "docs: document database setup steps"
git commit -m "refactor(auth): extract role hierarchy into helper"
git commit -m "chore(repo): scaffold monorepo structure"
```

### Breaking changes

Add a `!` after the type/scope, and explain in the body:

```
feat(api)!: change work order status enum values

BREAKING CHANGE: RESOLVED renamed to COMPLETED; update clients.
```

## Everyday workflow

```bash
git status                      # see what changed
git add <files>                 # stage specific files (prefer over `git add .`)
git commit -m "feat(web): add dashboard overview page"
git push -u origin feat/...     # push your branch
```

Then open a Pull Request into `main`. Keep PRs small and focused.

## Before committing

```bash
pnpm format        # auto-format
pnpm lint          # lint
pnpm typecheck     # type-check
```
