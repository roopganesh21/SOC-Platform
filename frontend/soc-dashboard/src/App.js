import './App.css';
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import LogGenerator from './pages/LogGenerator';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const IncidentsList = lazy(() => import('./pages/IncidentsList'));
const IncidentDetail = lazy(() => import('./pages/IncidentDetail'));
const UploadLogs = lazy(() => import('./pages/UploadLogs'));
const About = lazy(() => import('./pages/About'));

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-slate-950/80">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <Suspense
              fallback={(
                <div className="flex h-64 items-center justify-center text-sm text-slate-400">
                  Loading dashboard...
                </div>
              )}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/incidents" element={<IncidentsList />} />
                <Route path="/incidents/:id" element={<IncidentDetail />} />
                <Route path="/upload" element={<UploadLogs />} />
                <Route path="/generator" element={<LogGenerator />} />
                <Route path="/generate" element={<LogGenerator />} />
                <Route path="/about" element={<About />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
