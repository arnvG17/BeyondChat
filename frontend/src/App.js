import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ArticleList from './pages/ArticleList';
import ArticleView from './pages/ArticleView';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<ArticleList />} />
                <Route path="/article/:id" element={<ArticleView />} />
            </Routes>
        </Router>
    );
}

export default App;
