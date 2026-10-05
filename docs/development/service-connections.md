# Service connections — local-first, explicit opt-in

## What works

- Floating icons: single click/tap opens after a 360 ms double-tap window; double click/tap hides. Dragging never hides. Delete is the keyboard equivalent; the restore control returns all tools. Idle opacity is 50%, with full-opacity focus/interaction. Panel backgrounds are 50% opaque but text remains fully opaque.
- YouTube: paste an HTTPS video or playlist link and select **Load YouTube player**. The privacy-enhanced player loads on demand; use its play button. Closing the panel, pausing JARVIS or locking unloads the frame. This does not connect a YouTube account, import a music library or extract audio. Some videos disable embedding; an external YouTube link is available.
- Weather: **Use my location for weather** requests browser location permission. Coordinates rounded to two decimal places go to Open-Meteo, not JARVIS storage. No background location watch, automatic refresh or browser persistence. Weather failure offers retry; closing cancels pending retrieval. Device location is not guaranteed to come from GPS.
- Gmail: local build only, Google OAuth with read-only scope, PKCE and single-use session-bound state. Latest ten inbox messages, safe text excerpts and bounded plain-text message bodies. HTML-only messages must be opened in Gmail. Excerpts are not AI summaries. No sending, deleting, attachments or forwarding to an AI model.

## Gmail setup on your Windows PC

1. In [Google Cloud Console](https://console.cloud.google.com/), create/select your own project and enable the Gmail API.
2. Configure the OAuth consent screen. For a personal test application, configure your account as a test user where required. Gmail read-only is a restricted scope; follow Google's displayed verification requirements before broader distribution. This feature is not permission to bypass Google's review.
3. Create a **Web application** OAuth client. Register exactly `http://127.0.0.1:3000/` as its authorized redirect URI (including the trailing slash). If JARVIS_PORT differs, register that exact port instead. Do not put the public GitHub Pages URL here.
4. Configure `JARVIS_GOOGLE_CLIENT_ID` and `JARVIS_GOOGLE_CLIENT_SECRET` in the local server process environment using your credentials. Keep the secret out of source control, screenshots, chat and browser code. Existing environments are not read for credentials by this setup guide.
5. Build and restart the local server. Unlock JARVIS, open Email, select **Connect Gmail — read-only**, and review Google's consent screen.
6. After Google redirects back, choose **Load latest 10 emails**. Select a message, then **Full message** for its plain-text body.

The access token is held only in process memory, scoped to the local login session. No refresh token is requested or stored. Lock, pause, grant revocation, session expiration or server restart requires connecting again. Disconnect clears local access immediately and attempts Google revocation; failure is reported with a link to manage Google account connections. Logout clears local tokens, but does not itself remove the OAuth grant from Google's account settings.

Never forward or expose the loopback server to the internet to make Gmail work. The local service is intentionally bound to 127.0.0.1. A touchscreen attached to that PC can use it normally; another device needs a separately designed authenticated HTTPS deployment.

## The mind and voice — next decision, not connected by this change

Recommended architecture: an OpenAI API model for conversation and optional web search, behind the existing local permission checks. Local deterministic commands continue to work without a model. Do not allow email or web content to grant permissions or directly execute actions. Configure a server-side API key and explicit data-sharing consent before adding cloud inference, especially email summaries.

The existing local Whisper/Piper voice path remains available. For a more expressive original British assistant voice, consider ElevenLabs Voice Design or OpenAI text-to-speech. A suitable direction is: “British English, calm adult male assistant, clear diction, measured pace, restrained warmth and dry wit.” This is a voice direction, not a claim to reproduce or license the movie actor. Exact custom voices require the provider's supported consent/licensing process. Do not scrape film recordings to provision an assumed licensed voice.

## Official references

- [Google OAuth web-server flow and local redirect rules](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Gmail scopes and verification](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Gmail message retrieval](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get)
- [YouTube player parameters](https://developers.google.com/youtube/player_parameters)
- [YouTube embedding and privacy-enhanced mode](https://support.google.com/youtube/answer/171780)
- [Open-Meteo API](https://open-meteo.com/en/docs) and [usage terms](https://open-meteo.com/en/terms)
- [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search)
- [OpenAI text-to-speech](https://developers.openai.com/api/docs/guides/text-to-speech)
- [ElevenLabs Voice Design](https://elevenlabs.io/docs/eleven-creative/voices/voice-design)
- [Piper local voice engine](https://github.com/OHF-voice/piper1-gpl)
