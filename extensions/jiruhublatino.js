// ==MiruExtension==
// @name         JiruHub Latino
// @version      v0.1.0
// @author       jephMD
// @lang         es
// @license      MIT
// @icon         https://raw.githubusercontent.com/jephersonRD/JiruHub/main/icons/app.png
// @package      jiruhublatino
// @type         bangumi
// @webSite      https://github.com/jephersonRD/JiruHub
// @nsfw         false
// ==/MiruExtension==

const API_URL = "https://raw.githubusercontent.com/jephersonRD/JiruHub/main/extensions/anime_db.json";
const PAGE_SIZE = 20;

export default class extends Extension {
  constructor() {
    super();
    this.animeList = null;
  }

  async load() {
    if (this.animeList) return this.animeList;
    try {
      const raw = await this.request("", { headers: { "Miru-Url": API_URL } });
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      this.animeList = (data && Array.isArray(data.animes)) ? data.animes : [];
      return this.animeList;
    } catch {
      this.animeList = [];
      return this.animeList;
    }
  }

  async latest(page) {
    const list = await this.load();
    const p = Math.max(1, parseInt(page) || 1);
    const start = (p - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE).map(a => ({
      title: a.title,
      url: a.id,
      cover: a.cover
    }));
  }

  async search(kw, page) {
    const list = await this.load();
    const q = (kw || "").toLowerCase().trim();
    if (!q) return [];
    const filtered = list.filter(a => {
      const title = (a.title || "").toLowerCase();
      const genres = (a.genres || "").toLowerCase();
      const desc = (a.description || "").toLowerCase();
      return title.includes(q) || genres.includes(q) || desc.includes(q);
    });
    const p = Math.max(1, parseInt(page) || 1);
    const start = (p - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE).map(a => ({
      title: a.title,
      url: a.id,
      cover: a.cover
    }));
  }

  async detail(id) {
    const list = await this.load();
    const anime = list.find(a => a.id === id);
    if (!anime) return { title: "No encontrado", cover: "", desc: "", episodes: [] };
    let episodesOut = [];
    if (Array.isArray(anime.episodes)) {
      if (anime.episodes.length === 1 && anime.episodes[0].title === "Capitulos") {
        episodesOut = [{
          title: "Capitulos",
          urls: anime.episodes[0].urls.map(ep => ({ name: ep.name, url: ep.url }))
        }];
      } else {
        episodesOut = anime.episodes.map(season => ({
          title: season.title,
          urls: season.urls.map(ep => ({ name: ep.name, url: ep.url }))
        }));
      }
    }
    return { title: anime.title, cover: anime.cover, desc: anime.description || "", episodes: episodesOut };
  }

  async watch(url) {
    // Si la URL ya termina en .mp4, usarla directamente
    if (url.endsWith(".mp4")) {
      return {
        type: "mp4",
        url: url,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
          "Referer": "https://www.terabox.com/",
          "Origin": "https://www.terabox.com"
        },
        subtitles: []
      };
    }

    // URL es un share link de Terabox/1024terabox - extraer video real
    try {
      const html = await this.request(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });

      const text = typeof html === "string" ? html : String(html);

      // Buscar patrones comunes de URL de video en la pagina
      const patterns = [
        /"dlink"\s*:\s*"(https?:\/\/[^"]+\.(?:mp4|m3u8)[^"]*)"/,
        /"download_link"\s*:\s*"(https?:\/\/[^"]+)"/,
        /"video_url"\s*:\s*"(https?:\/\/[^"]+)"/,
        /data-src\s*=\s*"(https?:\/\/[^"]+\.(?:mp4|m3u8)[^"]*)"/,
        /src\s*=\s*"(https?:\/\/[^"]+\.(?:mp4|m3u8)[^"]*)"/,
        /video_url\s*:\s*"([^"]+)"/,
        /play_url\s*:\s*"([^"]+)"/,
        /"url"\s*:\s*"(https?:\/\/[^"]+\.(?:mp4|m3u8)[^"]*)"/
      ];

      for (const p of patterns) {
        const m = text.match(p);
        if (m) {
          let videoUrl = m[1];
          if (videoUrl.startsWith("//")) videoUrl = "https:" + videoUrl;
          return {
            type: videoUrl.includes(".m3u8") ? "hls" : "mp4",
            url: videoUrl,
            headers: {
              "User-Agent": "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
              "Referer": "https://www.terabox.com/",
              "Origin": "https://www.terabox.com"
            },
            subtitles: []
          };
        }
      }

      // Si no se encontro video en HTML, devolver la URL con headers
      return {
        type: "mp4",
        url: url,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
          "Referer": "https://www.terabox.com/",
          "Origin": "https://www.terabox.com"
        },
        subtitles: []
      };
    } catch {
      return {
        type: "mp4",
        url: url,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
          "Referer": "https://www.terabox.com/",
          "Origin": "https://www.terabox.com"
        },
        subtitles: []
      };
    }
  }
}
