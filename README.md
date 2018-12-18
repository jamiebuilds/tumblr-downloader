# tumblr-downloader

> Download all your female-presenting nipples from Tumblr

## Usage

```sh
EMAIL=<your-email@example.com \
PASSWORD=<your-password> \
FOLDER=<~/path/to/folder> \
BASE_PATH=<https://tumblr.com/path/to/posts> \
PAGE=<number> \
CONCURRENCY=<number>
node index.js
```

The `ENVIRONMENT` variables will default to:

- `FOLDER`: A new `tumblr-downloads` folder in your system's "downloads" folder
- `BASE_PATH`: `https://tumblr.com/likes`
- `PAGE`: `0`
- `CONCURRENCY`: `10`
