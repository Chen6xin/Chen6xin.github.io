# Chen6xin.github.io

Personal homepage for **Chen6xin**, built with [Jekyll](https://jekyllrb.com/) and GitHub Pages.

Live site target: <https://chen6xin.github.io>

## What to edit

- **Homepage content:** `index.md`
- **Site title / sidebar subtitle / avatar path:** `_config.yml`
- **Contact links:** `_includes/side-info.html`
- **Publications or writing list:** `publications.md`
- **Styling:** `assets/css/style.scss`
- **Avatar:** replace `assets/img/profile-placeholder.svg` or update `logo` in `_config.yml`
- **CV:** add your PDF under `assets/pdf/` and update `_includes/side-info.html`

## Local preview

Use Ruby 3.x for the current GitHub Pages gem stack.

```sh
bundle install
bundle exec jekyll serve --watch
```

Then open <http://127.0.0.1:4000/>.

## Deploy on GitHub Pages

1. Create a repository named `Chen6xin.github.io` under the `Chen6xin` GitHub account.
2. Push this project to the repository's default branch.
3. In GitHub, open **Settings → Pages** and use GitHub Pages from the default branch if it is not enabled automatically.
4. Visit <https://chen6xin.github.io> after the first build completes.
