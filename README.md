# Xin Chen Personal Homepage

This repository hosts the personal academic homepage of **Xin Chen（陈鑫）**, a master's student in Computer Science and Technology at Anhui Normal University.

Live site: <https://chen6xin.github.io/>

## Overview

The website is built with [Jekyll](https://jekyllrb.com/) and deployed through GitHub Pages. It contains a concise personal profile, publication information, contact links, avatar, favicon, and a GitHub contribution chart.

## Site structure

- `index.md` — homepage content, including Personal Profile, Publications & Writing, and Misc.
- `publications.md` — editable publication list rendered automatically on the homepage.
- `_config.yml` — site title, subtitle, avatar path, and GitHub Pages settings.
- `_includes/side-info.html` — sidebar contact links, ORCID, Google Scholar, GitHub, and CV button.
- `_includes/head-custom.html` — custom head tags, including favicon.
- `assets/css/style.scss` — visual styling for the homepage.
- `assets/img/` — avatar, favicon image, and other site images.
- `assets/pdf/` — CV or other PDF files if needed.

## Editing publications

Add publications in `publications.md` using the existing block format:

```markdown
## Paper Title
- Authors: Author A, **Xin Chen**, Author B
- Venue: Journal or Conference Name
- Info: Volume / issue | ranking or metric | date
- Year: 2026
- URL: https://doi.org/...
```

The paper title on the homepage becomes clickable when `URL` is provided.

## Local preview

Use Ruby 3.x for the current GitHub Pages dependency stack.

```sh
bundle install
bundle exec jekyll serve --watch
```

Then open <http://127.0.0.1:4000/>.

## Deployment

Push changes to the `main` branch of this repository. GitHub Pages will build and publish the site automatically.

Repository: <https://github.com/Chen6xin/Chen6xin.github.io>
