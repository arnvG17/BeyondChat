import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import Article from "../models/articlesSchema.js";

const router = express.Router();

import { scrape } from "../scrape.js";

// ... (keep usage of Article model and other imports if needed, but remove cheerio/axios if not used elsewhere in this file)
// actually, let's keep it simple and just replace the route handler and the helper functions
// I need to see the imports again to be clean, but for now let's just replace the route block.

router.get("/scrape", async (req, res) => {
  try {
    console.log("Starting scrape...");
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

export default router;

