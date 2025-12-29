import mongoose from "mongoose";

const articleSchema = new mongoose.Schema({
    title: String,
    url: String,
    content: String,
    isUpdated: { type: Boolean, default: false },
    references: [String],
    originalId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

export default mongoose.model("Article", articleSchema);
