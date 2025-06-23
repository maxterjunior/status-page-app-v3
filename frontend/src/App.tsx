import { useState } from 'react';
import './App.css';
import ConfigPanel from './components/ConfigPanel';
import StatsPanel from './components/StatsPanel';
import StatusDashboard from './components/StatusDashboard';

function App() {
    const [currentView, setCurrentView] = useState<'dashboard' | 'config' | 'stats'>('dashboard');

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
                    <StatusDashboard />
                )}

                {currentView === 'stats' && (
                    <StatsPanel />
                )}

                {currentView === 'config' && (
                    <ConfigPanel />
                )}
            </main>
        </div>
    );
}

export default App;
