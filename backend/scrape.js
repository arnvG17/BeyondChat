import axios from "axios";
import * as cheerio from "cheerio";
import Article from "./models/articlesSchema.js";

const BASE = "https://beyondchats.com";

async function scrapeArticle(url) {
    try {
        const res = await axios.get(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 10000
        });

        const $ = cheerio.load(res.data);

        const title =
            $("h1").first().text().trim() ||
            $("title").first().text().trim();

        $("nav, header, footer, aside, script, style").remove();

        let content = $("article")
            .text()
            .replace(/\s+/g, " ")
            .trim();

        if (!content || content.length < 200) {
            content = $("p")
                .map((_, p) => $(p).text().trim())
                .get()
                .join("\n\n");
        }

        return { title, url, content };
    } catch (error) {
        console.error(`Error scraping article ${url}:`, error.message);
        return null;
    }
}

export async function scrape(startPage = 1, maxPages = null) {
    let page = startPage;
    let hasMore = true;
    let pagesScraped = 0;
    const stats = {
        pagesProcessed: 0,
        saved: 0,
        duplicates: 0,
        skipped: 0,
        errors: 0
    };

    while (hasMore) {
        if (maxPages !== null && pagesScraped >= maxPages) {
            console.log(`🛑 Reached max pages limit (${maxPages}). Stopping.`);
            break;
        }

        const pageUrl =
            page === 1
                ? `${BASE}/blogs/`
                : `${BASE}/blogs/page/${page}/`;

        console.log(`📄 Fetching page ${page}: ${pageUrl}`);

        try {
            const res = await axios.get(pageUrl, {
                headers: { "User-Agent": "Mozilla/5.0" },
                timeout: 10000
            });

            const $ = cheerio.load(res.data);

            // Targeted Selector: Main column blog titles only
            const links = $("article h2 a")
                .map((_, el) => $(el).attr("href"))
                .get()
                .filter(h => h) // ensure not null
                .map(h => h.startsWith("http") ? h : BASE + h);

            // make them unique
            const unique = [...new Set(links)];

            console.log(`📝 Found ${unique.length} articles on page ${page}`);

            // **STOP HERE IF NONE FOUND**
            if (unique.length === 0) {
                console.log("🚦 No more pages — stopping.");
                hasMore = false;
                break;
            }

            // scrape every article page
            for (const url of unique) {
                // Check for duplicates first
                const exists = await Article.findOne({ url });
                if (exists) {
                    console.log(`⏭️  Skipping duplicate: ${url}`);
                    stats.duplicates++;
                    continue;
                }

                console.log(`➡️ Scraping: ${url}`);

                const articleData = await scrapeArticle(url);

                if (articleData && articleData.content && articleData.content.length > 200) {
                    try {
                        await Article.create(articleData);
                        console.log(`✅ Created Blog Object: { id: "${articleData.url}", title: "${articleData.title}", url: "${articleData.url}" }`);
                        stats.saved++;
                    } catch (dbErr) {
                        console.error(`❌ DB Error saving ${url}:`, dbErr.message);
                        stats.errors++;
                    }
                } else {
                    console.log("⚠️ Skipped — content too short or failed");
                    stats.skipped++;
                }

                // delay so we don't hammer server
                await new Promise(r => setTimeout(r, 300));
            }

            page++;
            stats.pagesProcessed++;
            pagesScraped++;
        } catch (err) {
            if (err.response && err.response.status === 404) {
                console.log(`🚦 Page ${page} not found (404). Stopping.`);
            } else {
                console.error(`❌ Error fetching page ${page}:`, err.message);
                stats.errors++;
            }
            hasMore = false;
        }
    }

    console.log(`\n✅ DONE — Scraped ${stats.saved} new articles.`);
    return stats;
}
