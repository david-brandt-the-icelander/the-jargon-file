# Where the source comes from

Everything in `upstream/` is exactly as Eric S. Raymond released it in the Jargon File, version 4.4.7, 29 Dec 2003, the last edition. Nothing in `upstream/` is ever edited. Every change this repository makes to the text is made by the build and listed in `LINKS.md` or `FIXES.md`.

## The text: `upstream/jargon.xml`

The DocBook XML master file of the Jargon File 4.4.7.

- **From:** Debian's source package `jargon-text`, file `jargon-text_4.4.7.orig.tar.gz`, which holds upstream's `jargon.xml` unpatched (Debian's patches live in its separate `debian/` tarball and were not applied).
  - Downloaded on 2026-11-20 from the Debian snapshot archive: <https://snapshot.debian.org/file/1235e204839d310e6505624ac8e49c05da5a270c>, package page <https://snapshot.debian.org/package/jargon-text/>.
  - The tarball's SHA-1, as Debian records it: `1235e204839d310e6505624ac8e49c05da5a270c`
  - The tarball's SHA-256: `9fe1741b8a6b9d5c6dc3bc6467fc4d437385d7f2bc418999fd80d3d7a4d7e7d7`
- **Upstream:** Debian took it from `http://www.catb.org/~esr/jargon/jargsrc.tar.gz` (Debian's `debian/copyright`). catb.org itself could not be reached securely when this copy was made: its certificate does not match its host name.
- **SHA-256 of `upstream/jargon.xml`:** `d4d05d39673f8266cb2ee02e361fe32c26399b6e1f78254ee36c84c9d16c3e15`

The file declares `ISO-8859-1` but contains only ASCII; everything outside ASCII is written as entities.

## The images: `upstream/graphics/`

The 33 images `jargon.xml` refers to (`<imagedata fileref='graphics/…'/>`), copied byte for byte from the `graphics/` folder of the official HTML edition, `jargon-4.4.7.tar.gz`. The other images in that folder (navigation buttons, backgrounds, layers of the comics) are not used by the text and are not copied.

- **From:** FreeBSD's distribution cache, <http://distcache.FreeBSD.org/ports-distfiles/jargon-4.4.7.tar.gz>, on 2026-11-21. FreeBSD's port `misc/jargon` fetches it from `http://www.catb.org/~esr/jargon/`.
- **Checked:** the download was over plain HTTP, so it was accepted only because its SHA-256 matched the one FreeBSD's ports tree records, read over HTTPS from <https://cgit.freebsd.org/ports/plain/misc/jargon/distinfo>:
  - `SHA256 (jargon-4.4.7.tar.gz) = d93627a2b581081457d0a48a767080bc47954240ca5908a2439606dd0cd16911`
  - `SIZE (jargon-4.4.7.tar.gz) = 9061260`

SHA-256 of each image:

```
10ec72a7b79c98cd4d3e7458ad1613220a37b9ce200db41e529bf685731b648c  73-05-18.png
81191beaa33b7fefeb25e9dbb48449fcefb228a43451ab2a0428db048faf107f  73-05-19.png
0b3c17087a0a29be17830038e1cc447e2dcc5105b7998a9286e0966373104ddb  73-05-20.png
c7777a3a06de760f891cf521608a3b9a5e8fb56a7db9b78680a25358262f575a  73-05-21.png
ecea6d3440c1861f97a92908c2d72b1737ef244b5b2542bc908f821d31fb3989  73-05-28.png
67efc8096d09a452bddcbbbd445a9406d04ba716852191bf75a65c3b5f4b016d  73-06-04.png
8a8ebe40e01f39d371e55280a8a44c4c225a4a9b7b72232a055aa4794b0133ad  73-07-24.png
9234ff2860b6606953da98bda00723e26570dde02210cacb2d0011ff0c30e0c3  73-07-29.png
4e99c8ac32a731782c619bfbd297319e80644071b0d6191f9c3dec584c656a38  73-10-31.png
2e5a4f06b500a49223fce41c9183ac69b2126e0aee491c4accb5798af54d8cb1  74-08-18.png
0ccbd6de9e87b72c6d9c4811880ccb04b6a1444c8668b931345b683953c238dc  74-12-25.png
abc99082ea19eec5bda15aa4bafcea5d1d7627ca35f51f955bf78bbb98dee64c  74-12-29.png
835dc3a8f73f0ff465b949e690bfa21bb3e40ec0de40ea082542f7cfba2561ea  74-12-31.png
79f382417bbc950dddb7d988005e74f715369df19c030d2e957942b6945edc13  75-10-04.png
00731a893b122d659d265572d569a3341b60790cb2a59d12be84a3f76d1efb4d  76-02-14.png
ed4cc430561245a3e337100bc649d9039052bcc9853ed58bf1356f09c050d3df  76-05-01.png
c29a12012615cad287b91816d95d92871ae7c56b81cf765fd6bae4179fd5b56f  76-07-18.png
dc5dad36f702e48b3f58ec12658bb087211c159c48aeedb01ce78ba763adfc84  ansi-c.png
1c702e6b7c1914bea8e975b99fbadb64e1e727db173ed957df69a6a5b57156bf  blivet.png
004d5ec9a177be7f9d9ff7827863fdcba0911759b062311ae08413f2426a1f67  bugpic-color.jpg
88cb9a37ad6b9ef8312b3b36c89b72d75126bd7cc2e6222270b0a8a549f3033c  cobol.png
0d3aea3d84e95adf636c6d0fc3edca28872ed56d95517f08df9957bb38c78e0b  crunchly-1.png
032abd3b7d6d449294e01b9f4b6c1f1937358528d5f8f28b78dc29db35ca4631  crunchly-2.png
90ed00a0270c5cbc027bcc8c04e9115e9e66ddc8d23dfaad9200b98ccdea7fcb  crunchly-5678.png
49a9c87e2ec9fe9e6152223430ab935e2ab306c9a3eddd7160359ae590206e64  eat-flaming-death.png
354eeed61717e889f28580bebc902414b581e34162b0b290cd12d02131b43ac7  fortran.png
6d73e8077be4cb48a6e03561a3a4d130934c5aaff9a2d98e721eb754e78499ac  gefingerpoken.jpg
674692fa445fb60e4eeebc0d1db673a42720b5278c0e74c758c473918c821137  glider.png
632a392af1de2e3de4d8b5ad62da7275550ee0004cdf9f54fa3de05cd28d0aac  len_std.jpg
ade68f6def5a076b70352c0eda8b7aa5dc3aeda90029fee5e62546d350f9ecc7  licenseplate.jpg
0ee877a93ebe7cb5a9eee58f0843946f8bbccb765aecfb4148994022dfa98fd1  lisp.png
2cc78a7253a7454ea08e04465bddbf8554f965c6adfb960fe0880cb5cb06a262  richiethompson.jpg
a84c7957648a33aa90e7070f149c95889b71f26c431be3fd5cb704e6bb3a3d7e  symbolics-keyboard.jpg
```

## The licence

The online edition's preface (`upstream/jargon.xml`, the `online-preface` section, which the web edition shows) says:

> This document (the Jargon File) is in the public domain, to be freely used, shared, and modified. There are (by intention) no legal restraints on what you can do with it, but there are traditions about its proper use to which many hackers are quite strongly attached. Please extend the courtesy of proper citation when you quote the File, ideally with a version number, as it will change and grow over time. (Examples of appropriate citation form: "Jargon File 4.4.7" or "The on-line hacker Jargon File, version 4.4.7, 29 Dec 2003".)

And on contributions:

> All contributions and suggestions about the Jargon File will be considered donations to be placed in the public domain as part of this File, and may be used in subsequent paper editions.

The same XML also carries "Copyright 1993 Eric S. Raymond. All rights reserved…". That notice is inside `<?if condition="book"?>`: it belongs to the printed book, *The New Hacker's Dictionary* (MIT Press), and is not part of the online edition. This repository builds the online edition only (`condition='web'`).

Debian's `debian/copyright` for the package records the File as public domain in the same words.

### The images are a separate question

The public-domain statement is Raymond's, about the File. Some of the images are other people's work, and that statement may not reach them:

- `len_std.jpg` (entry *Lenna*) is the cropped Playboy photograph of Lena Forsén (Sjööblom). Playboy holds its copyright; its use in image processing has long been tolerated, not licensed.
- `richiethompson.jpg` (entry *Unix*), `licenseplate.jpg` (entry *Live Free Or Die!*), `symbolics-keyboard.jpg` (entry *space-cadet keyboard*) and `gefingerpoken.jpg` (entry *blinkenlights*) are photographs whose photographers the File does not name.
- `bugpic-color.jpg` (entry *bug*) is the US Navy's photograph of the 1947 logbook, a work of the US government and in the public domain.
- The comic strips (`73-*.png` to `76-*.png`, `crunchly-*.png`) are Guy L. Steele Jr.'s *Crunchly* cartoons from the 1970s, which the File's editions have carried since *The Hacker's Dictionary* (1983). A comment at the top of `jargon.xml` lists their order and the entry each belongs to.
- The other cartoons (`ansi-c.png`, `cobol.png`, `fortran.png`, `lisp.png`) and drawings (`blivet.png`, `eat-flaming-death.png`, `glider.png`) are not credited individually in the File.

Whether to show the photographs on a public site is an open decision for the owner (see `README.md`, "Open decisions").

## How to cite it

The File asks for its version. Every page built from this repository carries: "The Jargon File, version 4.4.7, 29 Dec 2003. Eric S. Raymond, ed." with a link to the source, <http://www.catb.org/jargon/>.
