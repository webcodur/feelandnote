import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { Archive } from './pages/Archive';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { useAuthStore } from './store/useAuthStore';

const queryClient = new QueryClient();

function App() {
  const { initializeSubscription } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initializeSubscription();
    return () => unsubscribe();
  }, [initializeSubscription]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* 인증 페이지 (레이아웃 없음) */}
          <Route path="/login" element={<Login />} />

          {/* 메인 페이지 (레이아웃 포함) */}
          <Route path="/" element={<Navigate to="/books" replace />} />
          <Route path="/books" element={<Layout><Archive /></Layout>} />
          <Route path="/movies" element={<Layout><Archive /></Layout>} />
          <Route path="/profile" element={<Layout><Profile /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
