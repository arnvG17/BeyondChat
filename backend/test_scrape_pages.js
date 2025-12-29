import mongoose from "mongoose";
import dotenv from "dotenv";
import { scrape } from "./scrape.js";

dotenv.config();

async function testSpecificPages() {
    const START_PAGE = 1;
    const MAX_PAGES = 3;

    console.log(`🧪 Testing Scraper: Pages ${START_PAGE} to ${START_PAGE + MAX_PAGES - 1}...`);

    if (!process.env.MONGO_URI) {
        console.error("❌ MONGO_URI is missing in .env");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DB_NAME || 'beyondChats'
        });
        console.log("✅ Connected to MongoDB");

        // Run scraper for 2 pages starting from page 1
        const stats = await scrape(START_PAGE, MAX_PAGES);

        console.log("\n=================================");
        console.log("📈 Test Complete");
        console.log("=================================");
        console.log(stats);

    } catch (err) {
        console.error("❌ Test failed:", err);
    } finally {
        await mongoose.connection.close();
        console.log("👋 Connection closed");
    }
}

testSpecificPages();
