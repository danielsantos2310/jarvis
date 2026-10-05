import { useEffect, useRef, useState } from 'react';
import { Form } from './Form.tsx';

export function youtubeTarget(value: string): { embed: string; link: string } | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(url.hostname) || url.username || url.password || url.port) return null;
    const video = url.hostname === 'youtu.be' ? url.pathname.slice(1) : /^\/(shorts|embed)\//.test(url.pathname) ? url.pathname.split('/')[2] : url.searchParams.get('v');
    if (video && /^[\w-]{11}$/.test(video)) return { embed: `https://www.youtube-nocookie.com/embed/${video}?autoplay=0`, link: `https://www.youtube.com/watch?v=${video}` };
    const list = url.searchParams.get('list');
    if (list && /^[\w-]{10,100}$/.test(list)) return { embed: `https://www.youtube-nocookie.com/embed/videoseries?list=${list}&autoplay=0`, link: `https://www.youtube.com/playlist?list=${list}` };
  } catch { /* Invalid input stays local. */ }
  return null;
}
export function MusicPanel() {
  const [url, setUrl] = useState(''), [player, setPlayer] = useState<ReturnType<typeof youtubeTarget>>(null), [error, setError] = useState('');
  return <section className="card"><h2>YouTube music</h2><p>Paste a YouTube video or playlist link. Loading the player contacts YouTube; use its play button to begin. Your account and library are not connected.</p>
    <Form noValidate className="service-form" onSubmit={e => { e.preventDefault(); const target = youtubeTarget(url.trim()); setError(target ? '' : 'Use an HTTPS YouTube video or playlist link.'); if (target) setPlayer(target); }}>
      <label>YouTube link<input type="url" required maxLength={500} value={url} onChange={e => { setUrl(e.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'youtube-error' : undefined} placeholder="https://www.youtube.com/watch?v=…"/></label>
      {error && <p id="youtube-error" role="alert">{error}</p>}<button type="submit">Load YouTube player</button>
    </Form>
    {player && <><iframe className="service-video" title="YouTube music player" src={player.embed} referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen/><button onClick={() => setPlayer(null)}>Stop and unload</button><p>If embedding is unavailable, <a href={player.link} target="_blank" rel="noopener noreferrer">open this on YouTube</a>.</p></>}
    <p><a href="https://music.youtube.com/" target="_blank" rel="noopener noreferrer">Open YouTube Music</a></p><p className="fineprint">Closing this widget stops the embedded player. No background playback or audio extraction.</p>
  </section>;
}
type Weather = { temperature: number; feels: number; wind: number; humidity: number; code: number; time: string; timezone: string };
function conditions(code: number) { if (code === 0) return 'Clear'; if (code <= 3) return 'Cloudy'; if (code <= 48) return 'Fog'; if (code <= 57) return 'Drizzle'; if (code <= 67) return 'Rain'; if (code <= 77) return 'Snow'; if (code <= 82) return 'Rain showers'; if (code <= 86) return 'Snow showers'; return 'Thunderstorms'; }
export function WeatherPanel() {
  const [weather, setWeather] = useState<Weather | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const generation = useRef(0), controller = useRef<AbortController | null>(null);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
  async function locate() {
    if (busy) return;
    const run = ++generation.current; setBusy(true); setError(''); setWeather(null);
    try {
      if (!navigator.geolocation) throw new Error('Location is unavailable in this browser.');
      const point = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Location was denied or unavailable. Allow location in your browser settings, then retry.')), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }));
      if (run !== generation.current) return;
      const lat = point.coords.latitude, lon = point.coords.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('The device returned an invalid location.');
      controller.current = new AbortController();
      const query = new URLSearchParams({ latitude: lat.toFixed(2), longitude: lon.toFixed(2), current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m', timezone: 'auto', forecast_days: '1' });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.any([controller.current.signal, AbortSignal.timeout(12000)]) });
      if (!response.ok) throw new Error('Weather is unavailable. Please retry shortly.');
      const data = await response.json(), current = data.current;
      if (!current || !['temperature_2m','apparent_temperature','wind_speed_10m','relative_humidity_2m','weather_code'].every(k => typeof current[k] === 'number' && Number.isFinite(current[k])) || typeof current.time !== 'string' || typeof data.timezone !== 'string') throw new Error('Weather returned an incomplete reading. Please retry.');
      if (run === generation.current) setWeather({ temperature: current.temperature_2m, feels: current.apparent_temperature, wind: current.wind_speed_10m, humidity: current.relative_humidity_2m, code: current.weather_code, time: current.time, timezone: data.timezone });
    } catch (e) { if (run === generation.current) setError(e instanceof Error && e.name !== 'TypeError' ? e.message : 'Could not reach the weather service. Check your connection and retry.'); }
    finally { if (run === generation.current) setBusy(false); }
  }
  return <section className="card"><h2>Weather near you</h2><p>Use your device’s location to load local weather. Approximate coordinates (rounded to two decimal places) are sent to Open-Meteo. They are not saved by JARVIS.</p><button disabled={busy} onClick={() => void locate()}>{busy ? 'Finding your weather…' : weather ? 'Refresh local weather' : 'Use my location for weather'}</button><div aria-live="polite">{error && <p className="error" role="alert">{error}</p>}{weather && <><p className="weather-reading">{Math.round(weather.temperature)}°C</p><p>{conditions(weather.code)} · feels like {Math.round(weather.feels)}°C</p><p>Wind {weather.wind} km/h · humidity {weather.humidity}%</p><p className="fineprint">Modelled conditions · {weather.time.replace('T', ' ')} ({weather.timezone})</p></>}</div><p><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather data by Open-Meteo</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p><p className="fineprint">Location may come from GPS, Wi-Fi or your device’s other location sources. Closing the widget cancels pending retrieval.</p></section>;
}
