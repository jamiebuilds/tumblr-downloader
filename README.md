# tumblr-downloader

> Download all your female-presenting nipples from Tumblr

## Install

First, please ensure [Chrome](https://www.google.com/chrome/) is installed on
your computer.

### Windows Users

Download this binary:

- [Download for Windows](https://github.com/jamiebuilds/tumblr-downloader/raw/master/binaries/bin-win.exe)

You should be able to double-click on it to launch it in the "Command Line"
program. Follow the prompts from there.

> **Note:** Your computer's anti-virus software might get angry at this program
> but don't worry about it. I'm sorry I don't know more about Windows development.

### macOS Users

Download this binary:

- [Download for macOS](https://github.com/jamiebuilds/tumblr-downloader/raw/master/binaries/bin-macos)

Then open up `Terminal.app` and drag the downloaded binary onto the window and
hit `return`. Follow the prompts from there.

#### Linux Users

Download this binary:

- [Download for Linux](https://github.com/jamiebuilds/tumblr-downloader/raw/master/binaries/bin-linux)

Run the binary in your system's terminal/command line program. Follow the
prompts from there.

## CLI Usage

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
