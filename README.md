# nhue (Next.js)

A new hue, a new you. Take front, left and right photos (guided live camera or upload), Gemini reads your skin
tone and undertone, and the site shows your season, your best three colors and two to avoid, held under your own face.

## Run it

You need Node.js 18.18 or newer.

```bash
npm install        # also copies the face-detection files into public/mediapipe
npm run dev        # http://localhost:3000
```

For a production build: `npm run build` then `npm start`.

## Add your Gemini key (the .env file)

Open **`.env.local`** in the project root and fill in:

```
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.5-flash
MOCK_ANALYSIS=false
```

- `GEMINI_API_KEY`: create one at https://aistudio.google.com/apikey.
- `GEMINI_MODEL`: the model that reads the photos. `gemini-2.5-flash` is the default. To use another Gemini model
  that accepts images (for example `gemini-2.5-pro`), just change this one line.
- `MOCK_ANALYSIS=true`: shows the whole flow with sample results and no key. Set it back to `false` for real analysis.

Restart `npm run dev` after editing `.env.local`. These values are only read on the server, so the key is never
sent to the browser. Do not commit `.env.local` (it is already in `.gitignore`). `.env.example` is a blank copy to share.

Check the setup any time at http://localhost:3000/api/health. It shows the model name and whether a key was
found, never the key itself.

## What's where

- `app/api/analyze/route.js`: receives the photos, calls Gemini, validates the answer, returns the result.
- `lib/analysis.js`: the prompt, the response schema and the checks on what the model returns.
- `components/Hero.jsx`: hero with the two-model slider and the season card.
- `components/Tool.jsx`: photo slots, analysis states and the drape result (arrows, "Best match for you", color strip).
- `components/GuidedCamera.jsx` + `lib/pose.js`: live camera with the head outline, angle checks, 3-2-1 count and auto-capture.
- `components/Live.jsx`: the Live camera section with the instruction note (dismissible) and the how-to video.
- `app/globals.css`: the whole theme. Colors are the variables at the top (`--stage`, `--on`, `--wine`).
- `public/models/`: the two hero photos. `public/video/how-it-works.mp4`: the instruction video.

## Notes

- The camera works on `http://localhost` and on `https://` addresses only, and needs the visitor's permission.
- The season card in the hero shows sample readings for the two example photos. It is not live analysis.
- Photos are sent to Google's Gemini API for analysis and are not stored by nhue.
- Fonts (Bricolage Grotesque, Newsreader) load from Google Fonts, so they need an internet connection.
