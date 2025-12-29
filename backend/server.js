import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import articleRoutes from "./routes/articles.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/articles", articleRoutes);

console.log(process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.DB_NAME || 'beyondChats' // Use DB_NAME from .env or default to 'beyondChats'
})
    .then(() => app.listen(5000, () => console.log("Server running on 5000")))
    .catch(err => console.log(err));
