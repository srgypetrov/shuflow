# Shuflow

Shuflow is a web-based music player that enables random playback across your entire Spotify library. It addresses the limitation of Spotify's native application, which doesn't provide functionality for shuffling through a user's complete collection of liked content. The application fetches all liked tracks, albums, artists, and playlists from a user's Spotify library and implements random playback across this content.

A Spotify Premium account is required to use this application.

> Public Spotify apps are now effectively available only to approved company/partner applications. See the official update: [Updating the Criteria for Web API Extended Access](https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access).
>
> As a result, Shuflow cannot obtain approval as a public app and will not be developed further. You can still self‑host for personal use by creating your own Spotify application.

## Setup

1. Go to the Spotify Developer Dashboard and create a new application.
2. Copy `.env.example` to `.env` and fill in the following values:
    - `VITE_CLIENT_ID` — your Spotify app Client ID
    - `VITE_REDIRECT_URI` — the exact Redirect URI you register in the Spotify Developer Dashboard (e.g. http://localhost:5173/callback)

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm run preview
```
