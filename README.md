# tumblr-downloader

> Download all your female-presenting nipples from Tumblr

## Usage

```sh

  Usage
    $ tumblr-downloader "<email>" "<password>"

  Options
    --page, -p <number>    Starting ?page=<number> (useful when restarting script)
    --dest, -d <filepath>  Folder to download into
    --url <url>            Paginated Tumblr URL to download from
    --concurrency          Number of Chromium tabs to run at the same time

  Examples

    Download all liked posts:
    $ tumblr-downloader "you@example.com" "hunter42"

    Download all blogged posts:
    $ tumblr-downloader "you@example.com" "hunter42" --url "https://tumblr.com/blog/<your-blog-name>"

    Download into specific folder:
    $ tumblr-downloader "you@example.com" "hunter42" --dest ~/path/to/folder

    Limit concurrency: (useful on low-powered machines)
    $ tumblr-downloader "you@example.com" "hunter42" --concurrency 4

```
