import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const ArticleList = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchArticles = async () => {
        try {
            const response = await api.get('/articles/all');
            // Backend returns { count: ..., articles: [...] }
            const allArticles = response.data.articles || [];

            // Deduplicate by URL
            const uniqueArticles = [];
            const seenUrls = new Set();

            for (const article of allArticles) {
                if (article.url && !seenUrls.has(article.url)) {
                    seenUrls.add(article.url);
                    uniqueArticles.push(article);
                }
            }

            setArticles(uniqueArticles);
        } catch (error) {
            console.error("Failed to fetch articles", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, []);

    const handleScrape = async () => {
        const confirm = window.confirm("Start scraping? This might take a while.");
        if (!confirm) return;

        try {
            alert("Scraping started... please wait.");
            await api.post('/articles/scrape');
            alert("Scraping complete! Refreshing list.");
            fetchArticles();
        } catch (error) {
            console.error("Scraping failed", error);
            alert("Scraping failed: " + (error.response?.data?.message || error.message));
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1>Articles ({articles.length})</h1>
                <button
                    onClick={handleScrape}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                    }}
                >
                    Start Scraper
                </button>
            </div>
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {articles.map((article) => (
                    <div key={article.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
                        {article.image && (
                            <img
                                src={article.image}
                                alt={article.title}
                                style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                        )}
                        <h3 style={{ margin: '10px 0' }}>{article.title || 'Untitled'}</h3>
                        <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', marginBottom: '10px', color: 'blue', textDecoration: 'none' }}
                        >
                            {article.url}
                        </a>
                        <button
                            onClick={() => navigate(`/article/${article.id}`)}
                            style={{ padding: '8px 16px', cursor: 'pointer', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px' }}
                        >
                            Open
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ArticleList;
