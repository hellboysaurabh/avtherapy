# Listen & Play

Listening games for auditory-verbal therapy (AVT), made for Android tablets.

## Game 1: Ling Sounds
- A grown-up picks 2–6 pictures. The game plays one Ling sound and the child taps the matching picture.
- The answer timer (5 s by default) starts once the sound has finished. The yellow ear button plays the sound again.
- **Right answer:** the card bounces, a ✓ and confetti appear, Bobo the bunny hops, a chime plays and a voice says a word of praise.
- **Wrong answer or time up:** the card shakes and shows ✗, then the right picture glows and the sound plays again, so the child hears the correct model.
- **Explore sounds:** tap any picture to hear its sound (for warm-up and pairing).

| Picture | Ling sound |
|---|---|
| Aeroplane | aa /a/ |
| Train | oo /u/ |
| Car | ee /i/ |
| Sleeping baby | sh /ʃ/ |
| Chilli | s /s/ |
| Lollipop | mm /m/ |

Each picture plays its own sound file from `assets/ling/audio/` (`<picture>.mp3`). Silence at the start and end is trimmed, and all sounds are played at the same loudness. To change a sound, replace its file and keep the same name. The pairings in the table are only used for the progress report, and can be changed in the Grown-ups area.

## Grown-ups area
Press and hold ⚙ on the home screen for 1.5 seconds. In it you can:
- Set the answer time, the turns per game, spoken praise and reward chimes.
- Optionally record your own voice for any picture. The recording replaces that picture's sound file, and ✕ goes back to the file.
- See progress for each sound: how often it was right, how often there was no answer, and the average response time.

## Running it
```
node serve.js        # then open http://localhost:8080
```

## Putting it on the tablet
The app is a Progressive Web App (PWA): no app store is needed, and it works offline once installed.
1. Host the `ling-games` folder on any HTTPS host, such as GitHub Pages or Netlify Drop.
2. On the tablet, open the link in Chrome, then choose ⋮ → **Install app** (or **Add to Home screen**).
3. The app then opens full screen from its own icon and works offline.

HTTPS is required for installing, working offline and recording from the microphone.
If a real `.apk` is wanted later, the same folder can be wrapped with Capacitor.

## Adding more games
1. Create `js/games/<name>.js` that exports `mount(root, app)` and returns a cleanup function.
2. Add an entry for it in `js/games/index.js`. It then shows up on the home screen.
3. Add its files to the list in `sw.js` so it works offline.
