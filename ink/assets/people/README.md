# People

Reference photos for `person(name)`. Each photo must be free to use in a
published video. Keep the source and licence here.

| key | file | photo | source | licence |
| --- | --- | --- | --- | --- |
| `turing` | `turing-1951.jpg` | Alan Turing, 29 March 1951, by Elliott & Fry (712×949 crop) | [Wikimedia Commons: Alan Turing (1951) (crop).jpg](https://commons.wikimedia.org/wiki/File:Alan_Turing_(1951)_(crop).jpg), via the Computer History Museum | Public domain: PD-UK-unknown (anonymous studio work, over 70 years old) and PD-URAA (public domain in the US). No attribution required. |

## Adding someone

1. Find a public-domain photo (Wikimedia Commons: check the licence box says
   "Public domain" and read why). A clear, front-lit head and shoulders works
   best; a plain background matters more than resolution (700–1000 px is
   plenty).
2. Save it here and add a row above with the source link and licence.
3. Add an entry to `people` in `src/figures.ts`. Pass portrait options there if
   the defaults need tuning for this photo, e.g. `{ gamma: 1.3, vignette: { cy: 0.4 } }`.
4. Check it: `await person("key")` in a scene, `s.snap(...)`.

Any image path also works directly: `await person("path/to/photo.jpg")`.
