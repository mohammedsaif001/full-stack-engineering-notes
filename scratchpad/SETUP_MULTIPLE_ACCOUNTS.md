# Quick Setup: Two GitHub Accounts on This Machine

**Global (Office):** Already configured  
**Local (This Repo):** Personal account

## Step-by-Step for Your Situation

### 1. Check your global config (office account)
```bash
git config --global user.name
git config --global user.email
```

### 2. Override for this repo (personal account)
```bash
cd C:\Users\mohammed-saif\Desktop\cohort
git config --local user.name "Mohammed Saif"
git config --local user.email "mohammed001saif@gmail.com"
```

### 3. Verify
```bash
git config user.name    # should show "Mohammed Saif"
git config user.email   # should show "mohammed001saif@gmail.com"
```

That's it! All commits in this repo will now use your personal account.

### 4. If using SSH (recommended)

Make sure your SSH key for the personal account is added to GitHub and your SSH agent:
```bash
ssh-add ~/.ssh/id_ed25519    # or whatever your personal key is named
ssh-add -l                   # list all keys to verify it's there
```

### 5. If using HTTPS

The first time you `git push`, you'll be asked to authenticate. Paste your personal GitHub token (not password).

## Checking it worked

Make a test commit:
```bash
git commit --allow-empty -m "test: verify personal account"
git log -1 --format="%an <%ae>"
```

Should show: `Mohammed Saif <mohammed001saif@gmail.com>`
