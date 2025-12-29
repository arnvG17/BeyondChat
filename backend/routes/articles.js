import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import Article from "../models/articlesSchema.js";

const router = express.Router();

import { scrape } from "../scrape.js";

// ... (keep usage of Article model and other imports if needed, but remove cheerio/axios if not used elsewhere in this file)
// actually, let's keep it simple and just replace the route handler and the helper functions
// I need to see the imports again to be clean, but for now let's just replace the route block.

router.get("/all", async (req, res) => {
  try {
    const articles = await Article.find().sort({ createdAt: -1 });
    res.json({
      count: articles.length,
      articles: articles.map(article => ({
        id: article._id,
        title: article.title,
        url: article.url,
        // content: article.content, // Not needed for list view, save bandwidth? 
        // User requirements said "hyperlink to original", "title".
        // Let's keep it lightweight.
        // Wait, prompt 1 said "Display... optional image".
        image: article.image || null
      }))
    });
  } catch (error) {
    console.error("Error fetching all articles:", error);
    res.status(500).json({ error: "Failed to fetch articles", message: error.message });
  }
});

router.post("/scrape", async (req, res) => {
  try {
    console.log("Starting scrape driven by button click...");
    // We can pass parameters if needed, e.g. req.body.limit
    // For now using default behavior
    const stats = await scrape();
    res.json({ message: "Scraping complete", stats });
  } catch (error) {
    console.error("Scraping error:", error);
    res.status(500).json({ error: "Scraping failed", message: error.message });
  }
});

// Re-scrape and update existing articles with bad content
router.post("/rescrape", async (req, res) => {
  try {
    console.log("🔄 Starting re-scrape to fix existing articles...");

    const articles = await Article.find();
    let updatedCount = 0;
    let errorCount = 0;

    for (const article of articles) {
      try {
        console.log(`\n📄 Re-scraping: ${article.url}`);
        const { title, content } = await getArticleContent(article.url);

        if (content && content.length > 200) {
          // Update all three fields: title, url, content
          article.title = (title || article.title).trim();
          article.url = article.url.trim(); // URL stays the same
          article.content = content.trim();
          article.isUpdated = true;
          await article.save();

          console.log(`   ✅ Updated article:`);
          console.log(`      ID: ${article._id}`);
          console.log(`      Title: "${article.title}"`);
          console.log(`      URL: ${article.url}`);
          console.log(`      Content: ${article.content.length} characters`);
          updatedCount++;
        } else {
          console.log(`   ⚠️  Could not extract valid content, skipping`);
          console.log(`      URL: ${article.url}`);
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`   ❌ Error re-scraping ${article.url}:`, error.message);
        errorCount++;
      }
    }

    res.json({
      message: "Re-scraping complete",
      stats: {
        totalArticles: articles.length,
        updated: updatedCount,
        errors: errorCount
      }
    });
  } catch (error) {
    console.error("Re-scraping error:", error);
    res.status(500).json({ error: "Re-scraping failed", message: error.message });
  }
});

// Get all articles from database
router.get("/", async (req, res) => {
  try {
    const articles = await Article.find().sort({ createdAt: -1 });
    res.json({
      count: articles.length,
      articles: articles.map(article => ({
        id: article._id,
        title: article.title,
        url: article.url,
        content: article.content, // Return full content, not just preview
        contentPreview: article.content ? article.content.substring(0, 200) + "..." : "",
        isUpdated: article.isUpdated,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt
      }))
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Failed to fetch articles", message: error.message });
  }
});

// Get a single article by ID
router.get("/:id", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    res.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ error: "Failed to fetch article", message: error.message });
  }
});

// Update article content by re-scraping
router.put("/:id", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    console.log(`Updating article ${article._id}: ${article.url}`);

    // Fetch page
    const response = await axios.get(article.url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('nav, header, footer, aside, script, style, .widget, .sidebar, #comments, .comments-area').remove();

    // Extract content
    let $content = $('div[data-widget_type="theme-post-content.default"]');

    // Fallbacks
    if ($content.length === 0 || $content.text().trim().length < 200) { $content = $('article .entry-content'); }
    if ($content.length === 0 || $content.text().trim().length < 200) { $content = $('article .post-content'); }
    if ($content.length === 0 || $content.text().trim().length < 200) { $content = $('article'); }
    if ($content.length === 0 || $content.text().trim().length < 200) { $content = $('main article'); }
    if ($content.length === 0 || $content.text().trim().length < 200) { $content = $('main'); }
    if ($content.length === 0 || $content.text().trim().length < 200) { $content = $('p'); }

    // Normalize
    let cleanText = $content.text().replace(/\s+/g, ' ').trim();

    if (!cleanText || cleanText.length < 50) {
      return res.status(400).json({ error: "Could not extract sufficient content from URL" });
    }

    // Update in place
    article.content = cleanText;
    article.updatedContent = cleanText; // Also populate new field
    article.isUpdated = true;

    await article.save();

    res.json(article);

  } catch (error) {
    console.error("Update error:", error.message);
    res.status(500).json({ error: "Update failed", message: error.message });
  }
});

export default router;

