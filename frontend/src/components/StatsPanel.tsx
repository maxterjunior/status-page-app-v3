import React, { useState, useEffect } from 'react';
import { StatusPageService } from '../../bindings/changeme';
import './StatsPanel.css';

interface SiteStats {
    siteName: string;
    totalChecks: number;
    upChecks: number;
    downChecks: number;
    uptimePercent: number;
    avgResponseTime: number;
}

interface Stats {
    totalRecords: number;
    oldestRecord: string;
    newestRecord: string;
    retentionDays: number;
    checkInterval: number;
    siteStats: SiteStats[];
    generatedAt: string;
}

interface Props {
}

const StatsPanel: React.FC<Props> = ({ }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const statsData = await StatusPageService.GetStats();
            setStats(statsData);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('es-ES');
        } catch {
            return 'Fecha inválida';
        }
    };

    const formatPercentage = (percent: number) => {
        return `${percent.toFixed(2)}%`;
    };

    const formatResponseTime = (time: number) => {
        return `${time.toFixed(0)}ms`;
    };

    const getUptimeColor = (uptime: number) => {
        if (uptime >= 99) return '#10b981';
        if (uptime >= 95) return '#f59e0b';
        return '#ef4444';
    };

    if (loading) {
        return (
            <div className="stats-loading">
                <div className="loading-spinner"></div>
                <p>Cargando datos...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="stats-error">
                <h3>Error al cargar estadísticas</h3>
                <button onClick={loadStats}>Reintentar</button>
            </div>
        );
    }

    return (
        <div className="stats-panel">
            <div className="stats-header">
                <h2>Estadísticas del Sistema</h2>
                <div className="stats-actions">
                    <button className="refresh-stats-btn" onClick={loadStats}>
                        🔄 Actualizar Estadísticas
                    </button>
                </div>
            </div>

            <div className="stats-overview">
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <h3>{stats.totalRecords.toLocaleString()}</h3>
                        <p>Total de Verificaciones</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⏱️</div>
                    <div className="stat-content">
                        <h3>{stats.checkInterval}s</h3>
                        <p>Intervalo de Verificación</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🗂️</div>
                    <div className="stat-content">
                        <h3>{stats.retentionDays} días</h3>
                        <p>Retención de Datos</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div className="stat-content">
                        <h3>{stats.siteStats.length}</h3>
                        <p>Sitios Monitoreados</p>
                    </div>
                </div>
            </div>

            <div className="time-range">
                <div className="time-info">
                    <div className="time-item">
                        <strong>Primer registro:</strong>
                        <span>{formatDate(stats.oldestRecord)}</span>
                    </div>
                    <div className="time-item">
                        <strong>Último registro:</strong>
                        <span>{formatDate(stats.newestRecord)}</span>
                    </div>
                    <div className="time-item">
                        <strong>Generado:</strong>
                        <span>{formatDate(stats.generatedAt)}</span>
                    </div>
                </div>
            </div>

            <div className="sites-stats">
                <h3>Estadísticas por Sitio</h3>

                {stats.siteStats.length === 0 ? (
                    <div className="no-stats">
                        <div className="empty-icon">📊</div>
                        <p>No hay estadísticas disponibles</p>
                        <p>Espera a que se recopilen más datos</p>
                    </div>
                ) : (
                    <div className="stats-table">
                        <div className="table-header">
                            <div className="col-site">Sitio</div>
                            <div className="col-uptime">Uptime</div>
                            <div className="col-checks">Verificaciones</div>
                            <div className="col-response">Resp. Promedio</div>
                            <div className="col-status">Estado</div>
                        </div>

                        {stats.siteStats.map((siteStats, index) => (
                            <div key={index} className="table-row">
                                <div className="col-site">
                                    <strong>{siteStats.siteName}</strong>
                                </div>

                                <div className="col-uptime">
                                    <div className="uptime-container">
                                        <div
                                            className="uptime-bar"
                                            style={{
                                                width: `${siteStats.uptimePercent}%`,
                                                backgroundColor: getUptimeColor(siteStats.uptimePercent)
                                            }}
                                        ></div>
                                        <span
                                            className="uptime-text"
                                            style={{ color: getUptimeColor(siteStats.uptimePercent) }}
                                        >
                                            {formatPercentage(siteStats.uptimePercent)}
                                        </span>
                                    </div>
                                </div>

                                <div className="col-checks">
                                    <div className="checks-breakdown">
                                        <span className="total-checks">{siteStats.totalChecks}</span>
                                        <div className="checks-detail">
                                            <span className="up-checks">✅ {siteStats.upChecks}</span>
                                            <span className="down-checks">❌ {siteStats.downChecks}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-response">
                                    <span className="response-time">
                                        {formatResponseTime(siteStats.avgResponseTime)}
                                    </span>
                                </div>

                                <div className="col-status">
                                    <span
                                        className={`status-badge ${siteStats.uptimePercent >= 99 ? 'excellent' :
                                            siteStats.uptimePercent >= 95 ? 'good' : 'poor'}`}
                                    >
                                        {siteStats.uptimePercent >= 99 ? 'Excelente' :
                                            siteStats.uptimePercent >= 95 ? 'Bueno' : 'Necesita atención'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="stats-summary">
                <h3>Resumen General</h3>
                <div className="summary-grid">
                    <div className="summary-item">
                        <span className="summary-label">Uptime promedio:</span>
                        <span className="summary-value">
                            {stats.siteStats.length > 0
                                ? formatPercentage(stats.siteStats.reduce((acc, site) => acc + site.uptimePercent, 0) / stats.siteStats.length)
                                : '0%'
                            }
                        </span>
                    </div>

                    <div className="summary-item">
                        <span className="summary-label">Respuesta promedio:</span>
                        <span className="summary-value">
                            {stats.siteStats.length > 0
                                ? formatResponseTime(stats.siteStats.reduce((acc, site) => acc + site.avgResponseTime, 0) / stats.siteStats.length)
                                : '0ms'
                            }
                        </span>
                    </div>

                    <div className="summary-item">
                        <span className="summary-label">Total verificaciones exitosas:</span>
                        <span className="summary-value">
                            {stats.siteStats.reduce((acc, site) => acc + site.upChecks, 0).toLocaleString()}
                        </span>
                    </div>

                    <div className="summary-item">
                        <span className="summary-label">Total verificaciones fallidas:</span>
                        <span className="summary-value">
                            {stats.siteStats.reduce((acc, site) => acc + site.downChecks, 0).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsPanel;
