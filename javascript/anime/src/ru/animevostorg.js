// anime/src/ru/animevost.js

const mangayomiSources = [
  {
    name: "AnimeVost",
    lang: "all",
    baseUrl: "https://animevost.org",
    apiUrl: "",
    iconUrl: "https://animevost.org/favicon.ico",
    typeSource: "single",
    itemType: 1,
    isNsfw: false,
    version: "0.0.1",
    dateFormat: "",
    dateFormatLocale: "",
    pkgPath: "anime/src/ru/animevostorg.js",
  },
];

class DefaultExtension extends MProvider {
  constructor() {
    super();
    this.client = new Client();
  }

  async getPopular(page) {
    const baseUrl = this.source.baseUrl;
    const url = page > 1 ? `${baseUrl}/page/${page}/` : baseUrl;
    const res = await this.client.get(url);
    const document = new Document(res.body);
    const elements = document.select("div.shortstory");
    const list = [];
    for (const element of elements) {
      const link = element.selectFirst("div.shortstoryHead h2 a").attr("href");
      const name = element.selectFirst("div.shortstoryHead h2 a").text;
      const imageUrl =
        baseUrl + element.selectFirst("img.imgRadius").attr("src");
      list.push({ name, imageUrl, link });
    }
    const hasNextPage = !!document.selectFirst("div.block_2 td.block_4 a");
    return {
      list: list,
      hasNextPage: hasNextPage,
    };
  }

  async getLatestUpdates(page) {
    return await this.getPopular(page);
  }

  async search(query, page, filters) {
    const baseUrl = this.source.baseUrl;
    const url = page > 1 ? `${baseUrl}/page/${page}/` : baseUrl;
    const res = await this.client.get(url);
    const document = new Document(res.body);
    const elements = document.select("div.shortstory");
    const list = [];
    for (const element of elements) {
      const name = element.selectFirst("div.shortstoryHead h2 a").text;
      if (name.toLowerCase().includes(query.toLowerCase())) {
        const link = element
          .selectFirst("div.shortstoryHead h2 a")
          .attr("href");
        const imageUrl =
          baseUrl + element.selectFirst("img.imgRadius").attr("src");
        list.push({ name, imageUrl, link });
      }
    }
    const hasNextPage = !!document.selectFirst("div.block_2 td.block_4 a");
    return {
      list: list,
      hasNextPage: hasNextPage,
    };
  }

  cleanHtmlString(input) {
    if (!input) return "";
    return input
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/<br>/g, "\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/<a\s+href="([^"]*)".*?>.*?<\/a>/g, "$1");
  }

  async getDetail(url) {
    const baseUrl = this.source.baseUrl;
    const res = await this.client.get(
      url.startsWith("http") ? url : baseUrl + url,
    );
    const document = new Document(res.body);

    const name =
      document.selectFirst("div.shortstoryHead h2 a")?.text ||
      document.selectFirst("h1")?.text ||
      "";

    const imageUrl = document.selectFirst("img.imgRadius")?.attr("src");
    const fullImageUrl = imageUrl
      ? imageUrl.startsWith("http")
        ? imageUrl
        : baseUrl + imageUrl
      : "";

    const description = this.cleanHtmlString(
      document.selectFirst("div.shortstoryContent p:last-child")?.text ||
        document.selectFirst("div.shortstoryContent p")?.text ||
        "",
    );

    const genreText =
      document.selectFirst("div.shortstoryContent p:contains('Жанр')")?.text ||
      "";
    const genre = genreText
      .replace(/Жанр: /, "")
      .split(",")
      .map((g) => g.trim());

    const authorText =
      document.selectFirst("div.shortstoryContent p:contains('Режиссёр')")
        ?.text || "";
    const author = authorText.replace(/Режиссёр: /, "").trim();

    const status = 5;

    // Эпизоды: парсим playerbox
    const episodes = [];
    const playerbox = document.selectFirst("span#playerbox");
    if (playerbox) {
      const episodeElements = playerbox.select("div.epizode");
      for (const ep of episodeElements) {
        // Получаем ID серии из onclick="ajax2(ID,NUM)"
        const onclick = ep.attr("onclick");
        const match = onclick.match(/ajax2\((\d+),(\d+)\)/);
        if (match) {
          const episodeId = match[1];
          const episodeNum = match[2];
          const epName = ep.text;
          episodes.push({
            name: epName,
            url: `/frame5.php?play=${episodeId}`,
            episodeId: episodeId,
            episodeNum: episodeNum,
          });
        }
      }
    } else {
      // Если нет playerbox, просто ссылка на просмотр
      episodes.push({ name: "Смотреть", url: url });
    }

    return {
      name,
      imageUrl: fullImageUrl,
      description,
      author,
      status,
      genre,
      episodes,
    };
  }

  async getVideoList(url) {
    const baseUrl = this.source.baseUrl;
    // url может быть относительным, например /frame5.php?play=ID
    const fullUrl = url.startsWith("http") ? url : baseUrl + url;
    const res = await this.client.get(fullUrl);
    const document = new Document(res.body);

    // Кнопки 480p и 720p — <a href="...mp4">
    const videoLinks = document.select("a[download][href$='.mp4']");
    const videos = [];
    for (const link of videoLinks) {
      const videoUrl = link.attr("href");
      const quality = link.text.includes("720")
        ? "720p"
        : link.text.includes("480")
          ? "480p"
          : "";
      videos.push({
        url: videoUrl.startsWith("http") ? videoUrl : baseUrl + videoUrl,
        originalUrl: videoUrl.startsWith("http")
          ? videoUrl
          : baseUrl + videoUrl,
        quality: quality,
        headers: { Referer: baseUrl },
      });
    }
    // Если нет mp4, ищем iframe
    if (videos.length === 0) {
      const iframe = document.selectFirst("iframe");
      if (iframe) {
        const videoUrl = iframe.attr("src");
        videos.push({
          url: videoUrl.startsWith("http") ? videoUrl : baseUrl + videoUrl,
          originalUrl: videoUrl.startsWith("http")
            ? videoUrl
            : baseUrl + videoUrl,
          quality: "",
          headers: { Referer: baseUrl },
        });
      }
    }
    return videos;
  }

  getSourcePreferences() {
    return [];
  }
}
