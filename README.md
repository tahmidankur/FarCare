# Tahmid Hossain Ankur — Personal Portfolio

> Personal portfolio website for [tahmidankur.dev](https://tahmidankur.dev) — built with plain HTML, CSS, and JavaScript. No frameworks, no build tools, no dependencies.

---

## Tech Stack

- HTML5 (semantic)
- CSS3 (custom properties, grid, flexbox, animations)
- Vanilla JavaScript (Intersection Observer, no libraries)
- Google Fonts: Sora · DM Sans · JetBrains Mono

---

## Project Structure

```
portfolio/
├── index.html       # All markup and content
├── style.css        # All styles and responsive rules
├── script.js        # Navbar, scroll reveal, commit grid, animations
├── resume.pdf       # Your resume (add this yourself)
└── photo.jpg        # Your profile photo (add this yourself)
```

---

## Sections

1. Sticky Navbar with active section highlighting
2. Hero with animated gradient background, photo placeholder, code card
3. About with identity cards
4. Featured Projects — Divine Mood, StudyForge, CommitCanvas, RentSplit
5. Skills grouped by category
6. Timeline / Education
7. GitHub Proof of Work with decorative contribution grid
8. More Than Code — personal values
9. Contact with email, GitHub, LinkedIn
10. Footer

---

## How to Customize

### 1. Add Your Profile Photo

Open `index.html` and find this block (around line 120):

```html
<div class="photo-placeholder">
  <!-- Replace this div with: <img src="photo.jpg" alt="Tahmid Hossain Ankur" /> -->
  <div class="placeholder-initials">THA</div>
  <p class="placeholder-hint">Add photo.jpg here</p>
</div>
```

Replace the entire inner content with just your image tag:

```html
<div class="photo-placeholder">
  <img src="photo.jpg" alt="Tahmid Hossain Ankur" />
</div>
```

Then place your photo file (named `photo.jpg`) in the same folder as `index.html`. Any format works — `.jpg`, `.png`, `.webp`. If you use a different filename, update the `src` attribute to match.

---

### 2. Add Your Resume

Place your resume file in the root folder and name it `resume.pdf`. The download links in the navbar and contact section will work automatically. If you name it something else (e.g. `tahmid-resume.pdf`), search for `resume.pdf` in `index.html` and replace all three instances.

---

### 3. Update Project Links

In `index.html`, search for `href="#"` — each one is a placeholder for either a GitHub repo link or a live demo link. There are 8 total (2 per project × 4 projects).

**Divine Mood**
```html
<!-- GitHub link -->
<a href="#" class="icon-link" aria-label="View Divine Mood on GitHub" title="GitHub">

<!-- Live demo link -->
<a href="#" class="icon-link" aria-label="View Divine Mood live demo" title="Live Demo">
```

**StudyForge**
```html
<a href="#" class="icon-link" aria-label="View StudyForge on GitHub" title="GitHub">
<a href="#" class="icon-link" aria-label="View StudyForge live demo" title="Live Demo">
```

**CommitCanvas**
```html
<a href="#" class="icon-link" aria-label="View CommitCanvas on GitHub" title="GitHub">
<a href="#" class="icon-link" aria-label="View CommitCanvas live demo" title="Live Demo">
```

**RentSplit**
```html
<a href="#" class="icon-link" aria-label="View RentSplit on GitHub" title="GitHub">
<a href="#" class="icon-link" aria-label="View RentSplit live demo" title="Live Demo">
```

Example replacement:
```html
<!-- Before -->
<a href="#" class="icon-link" aria-label="View Divine Mood on GitHub" title="GitHub">

<!-- After -->
<a href="https://github.com/tahmidankur/divine-mood" class="icon-link" aria-label="View Divine Mood on GitHub" title="GitHub">
```

---

### 4. Update Email / Social Links

All real links are already set. If anything changes, search in `index.html` for:

| What | Search for | Replace with |
|---|---|---|
| Email | `tahmidhossainankur0@gmail.com` | Your new email |
| GitHub profile | `https://github.com/tahmidankur` | Your GitHub URL |
| LinkedIn | `https://www.linkedin.com/in/tahmidankur/` | Your LinkedIn URL |

---

## Deployment

### Step 1 — Push to GitHub

Open your terminal in the portfolio folder and run:

```bash
git init
git add .
git commit -m "Initial portfolio commit"
git branch -M main
git remote add origin https://github.com/tahmidankur/portfolio.git
git push -u origin main
```

Before running these commands, create an empty repository named `portfolio` at github.com. Set it to Public and do not initialize it with any files.

---

### Step 2 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click **Add New** → **Project**
3. Find your `portfolio` repository and click **Import**
4. Leave all settings as default — no build command or output directory needed
5. Click **Deploy**

Your site will be live at a Vercel URL within about 30 seconds.

---

### Step 3 — Connect tahmidankur.dev

**In Vercel:**

1. Open your project dashboard
2. Click **Settings** → **Domains**
3. Type `tahmidankur.dev` and click **Add**
4. Also add `www.tahmidankur.dev` so the www version redirects correctly
5. Vercel will display the exact DNS records you need

**In your domain registrar** (Namecheap, Cloudflare, Google Domains, etc.), go to the DNS settings for `tahmidankur.dev` and add:

```
Type     Name     Value
A        @        76.76.21.21
CNAME    www      cname.vercel-dns.com
```

Use the exact values Vercel shows in your dashboard — they match your region and project.

**Wait for propagation.** DNS changes take anywhere from 5 minutes to 48 hours. Vercel shows a green checkmark next to your domain once it verifies the records.

**HTTPS is automatic.** Vercel provisions a free SSL certificate via Let's Encrypt once your domain is verified. No extra steps needed.

---

### Step 4 — Future Updates

Any push to `main` triggers an automatic redeploy on Vercel in about 20 seconds:

```bash
git add .
git commit -m "Update project links"
git push
```

---

## License

Built and designed by Tahmid Hossain Ankur.
