// ==MiruExtension==
// @name         JiruHub Latino
// @version      v0.1.1
// @author       jephMD
// @lang         es
// @license      MIT
// @icon         https://raw.githubusercontent.com/jephersonRD/JiruHub/main/icons/app.png
// @package      jiruhublatino
// @type         bangumi
// @webSite      https://www.1024terabox.com
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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.terabox.com/",
          "Origin": "https://www.terabox.com"
        },
        subtitles: []
      };
    }

    // Extraer surl de la URL de Terabox
    const surlMatch = url.match(/\/s\/([a-zA-Z0-9_-]+)/);
    const surl = surlMatch ? surlMatch[1] : null;

    if (surl) {
      try {
        // Paso 1: Obtener la lista de archivos del share link
        const listUrl = "https://www.1024terabox.com/share/list?app_id=250528&channel=dubox&clienttype=0&web=1&surl=" + surl + "&page=1&num=100&order=time&desc=1&showempty=0";
        const listRaw = await this.request(listUrl);
        const listData = typeof listRaw === "string" ? JSON.parse(listRaw) : listRaw;

        if (listData && listData.errno === 0 && Array.isArray(listData.list) && listData.list.length > 0) {
          const file = listData.list[0];
          const fsId = file.fs_id;

          // Paso 2: Obtener la URL de descarga directa
          const dlUrl = "https://www.1024terabox.com/share/download?app_id=250528&channel=dubox&clienttype=0&web=1&surl=" + surl + "&fs_id=" + fsId;
          const dlRaw = await this.request(dlUrl);
          const dlData = typeof dlRaw === "string" ? JSON.parse(dlRaw) : dlRaw;

          if (dlData && dlData.errno === 0 && dlData.dlink) {
            let videoUrl = dlData.dlink;
            if (videoUrl.startsWith("//")) videoUrl = "https:" + videoUrl;
            return {
              type: videoUrl.includes(".m3u8") ? "hls" : "mp4",
              url: videoUrl,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.terabox.com/",
                "Origin": "https://www.terabox.com"
              },
              subtitles: []
            };
          }
        }

        if (listData && listData.errno === 2) {
          return {
            type: "mp4",
            url: "error://terabox-needs-login",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            subtitles: []
          };
        }
      } catch (e) {
        this.log && this.log("Error API Terabox: " + String(e));
      }
    }

    // Fallback: devolver la URL original con headers
    return {
      type: "mp4",
      url: url,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.terabox.com/",
        "Origin": "https://www.terabox.com"
      },
      subtitles: []
    };
  }
}
