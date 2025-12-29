import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

const ArticleView = () => {
    const { id } = useParams();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const response = await api.get(`/articles/${id}`);
                setArticle(response.data);
            } catch (error) {
                console.error("Failed to fetch article", error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [id]);

    const handleUpdate = async () => {
        try {
            setLoading(true); // Re-use loading or add a separate one. Let's just block UI or show text.
            // Using simple alert flow as requested initially, but now we do work.
            alert("Updating content from source... please wait.");

            const response = await api.put(`/articles/${id}`);
            setArticle(response.data);

            alert("Content updated successfully!");
        } catch (error) {
            console.error("Update failed", error);
            alert("Update failed: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!article) return <div>Article not found</div>;

    // Check for content. The field might be 'content', 'text', 'body', etc. 
    // Usually it's 'content' based on typical patterns, but if it's missing or empty string:
    // "Handle missing content by writing: No content stored — only URL exists"
    const hasContent = article.content && article.content.trim().length > 0;

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
            <h1>{article.title || 'Untitled'}</h1>

            <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', marginBottom: '20px', color: 'blue' }}
            >
                {article.url}
            </a>

            <div style={{ whiteSpace: 'pre-wrap', marginBottom: '30px', lineHeight: '1.6' }}>
                {hasContent ? article.content : "No content stored — only URL exists"}
            </div>

            <button
                onClick={handleUpdate}
                style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
            >
                Update (LLM later)
            </button>
        </div>
    );
};

export default ArticleView;
