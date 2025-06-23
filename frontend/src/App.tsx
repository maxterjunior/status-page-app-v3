import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { DashboardOutlined, BarChartOutlined, SettingOutlined } from '@ant-design/icons';
import './App.css';
import ConfigPanel from './components/ConfigPanel';
import StatsPanel from './components/StatsPanel';
import StatusDashboard from './components/StatusDashboard';

const { Header, Content } = Layout;

function App() {
    const [currentView, setCurrentView] = useState<'dashboard' | 'config' | 'stats'>('dashboard');

    const menuItems = [
        {
            key: 'dashboard',
            icon: <DashboardOutlined />,
            label: 'Dashboard',
        },
        {
            key: 'stats',
            icon: <BarChartOutlined />,
            label: 'Estadísticas',
        },
        {
            key: 'config',
            icon: <SettingOutlined />,
            label: 'Configuración',
        },
    ];

    const handleMenuClick = (e: any) => {
        setCurrentView(e.key);
    };

    return (
        <Layout className="app-layout">
            <Header className="app-header">
                <div className="header-content">
                    <h1 className="app-title">StatusPage Monitor</h1>
                    <Menu
                        theme="dark"
                        mode="horizontal"
                        selectedKeys={[currentView]}
                        items={menuItems}
                        onClick={handleMenuClick}
                        className="app-menu"
                    />
                </div>
            </Header>

            <Content className="app-content">
                {currentView === 'dashboard' && <StatusDashboard />}
                {currentView === 'stats' && <StatsPanel />}
                {currentView === 'config' && <ConfigPanel />}
            </Content>
        </Layout>
    );
}

export default App;
