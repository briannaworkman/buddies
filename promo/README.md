# Buddies promo video

The 4:5 (1080×1350) promo video for Buddies, made with [Remotion](https://www.remotion.dev) from the plugin's own sprites in `../hooks`. About 54 seconds at 30 fps.

## Files it needs

Two files aren't in the repo and go in `public/` before rendering:

- `public/footage/recording.mov`: the Claude Code screen recording (2352×1672) used in the pet and chat scenes. The crops and clip times in `src/scenes.tsx` are set for that recording.
- `public/music/bensound-cozycoffeehouse.mp3`: Cozy Coffeehouse by Lunar Years, from [bensound.com](https://www.bensound.com). Its free license needs a credit wherever the video is posted.

## Making the video

```bash
npm install
npm run studio   # preview and scrub through it in the browser
npm run render   # writes out/buddies-promo.mp4
npm run thumbnail   # writes out/buddies-thumbnail.png, the cover image for posts
npm run social      # writes out/buddies-social-preview.png, for GitHub's Settings → Social preview
```

`src/Promo.tsx` sets the order and length of each scene, `src/scenes.tsx` holds the scenes, `src/Footage.tsx` crops the recording, `src/Thumbnail.tsx` is the video's cover image, and `src/SocialPreview.tsx` is the card shown when the repo link is shared.

Remotion is free for individuals and small teams; larger companies need a [company license](https://www.remotion.dev/license).
