import React, { useState, useEffect } from 'react';
import './App.css';
import { StatusPageService } from './../bindings/changeme';
import StatusDashboard from './components/StatusDashboard';
import ConfigPanel from './components/ConfigPanel';
import StatsPanel from './components/StatsPanel';

interface StatusCheck {
    id: number;
    siteName: string;
    siteUrl: string;
    status: string;
    statusCode: number;
    responseTime: number;
    checkedAt: string;
    errorMessage?: string;
}

interface SiteDetail {
    name: string;
    url: string;
    method: string;
    timeout: number;
    status?: string;
    statusCode?: number;
    responseTime?: number;
    lastChecked?: string;
    errorMessage?: string;
    isActive: boolean;
}

function App() {
    const [currentView, setCurrentView] = useState<'dashboard' | 'config' | 'stats'>('dashboard');
    const [sites, setSites] = useState<SiteDetail[]>([]);
    const [statusChecks, setStatusChecks] = useState<StatusCheck[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);
            const [sitesData, statusData] = await Promise.all([
                StatusPageService.GetAllSites(),
                StatusPageService.GetAllStatus()
            ]);
            setSites(sitesData);
            setStatusChecks(statusData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Actualizar datos cada 30 segundos
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        loadData();
    };

    const handleManualCheck = async (siteName: string) => {
        try {
            await StatusPageService.ManualCheck(siteName);
            // Esperar un poco y recargar datos
            setTimeout(loadData, 2000);
        } catch (error) {
            console.error('Error en check manual:', error);
        }
    };

    if (loading) {
        return (
            <div className="app-loading">
                <div className="loading-spinner"></div>
                <p>Cargando StatusPage Monitor...</p>
            </div>
        );
    }

    return (
        <div className="app">
            <header className="app-header">
                <div className="header-content">
                    <h1>StatusPage Monitor</h1>
                    <nav className="nav-tabs">
                        <button
                            className={currentView === 'dashboard' ? 'active' : ''}
                            onClick={() => setCurrentView('dashboard')}
                        >
                            Dashboard
                        </button>
                        <button
                            className={currentView === 'stats' ? 'active' : ''}
                            onClick={() => setCurrentView('stats')}
                        >
                            Estadísticas
                        </button>
                        <button
                            className={currentView === 'config' ? 'active' : ''}
                            onClick={() => setCurrentView('config')}
                        >
                            Configuración
                        </button>
                    </nav>
                </div>
            </header>

            <main className="app-main">
                {currentView === 'dashboard' && (
                    <StatusDashboard
                        sites={sites}
                        statusChecks={statusChecks}
                        onManualCheck={handleManualCheck}
                        onRefresh={handleRefresh}
                    />
                )}

                {currentView === 'stats' && (
                    <StatsPanel onRefresh={handleRefresh} />
                )}

                {currentView === 'config' && (
                    <ConfigPanel onConfigUpdate={loadData} />
                )}
            </main>
        </div>
    );
}

export default App;
