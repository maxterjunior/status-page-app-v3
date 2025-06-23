import React, { useState, useEffect } from 'react';
import { StatusPageService } from '../../bindings/changeme';
import { StatusCheck, SiteDetail } from '../types';
import './StatusDashboard.css';

interface Props {}

const StatusDashboard: React.FC<Props> = () => {
    const [selectedSite, setSelectedSite] = useState<string | null>(null);
    const [config, setConfig] = useState<any>(null);
    const [timelineDays, setTimelineDays] = useState(7);
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

    const handleManualCheck = async (siteName: string) => {
        try {
            await StatusPageService.ManualCheck(siteName);
            // Esperar un poco y recargar datos
            setTimeout(loadData, 2000);
        } catch (error) {
            console.error('Error en check manual:', error);
        }
    };

    useEffect(() => {
        loadConfig();
        loadData();

        // Actualizar datos cada 30 segundos
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadConfig = async () => {
        try {
            const configData = await StatusPageService.GetConfig();
            setConfig(configData);
            // Calcular número de checks a mostrar basado en días de retención
            // Asumiendo ~48 checks por día (cada 30 minutos), pero mínimo 30 y máximo 90
            const checksPerDay = Math.max(1, Math.floor(1440 / (configData.checkInterval / 60))); // checks por día
            const totalChecks = Math.min(90, Math.max(30, checksPerDay * Math.min(configData.retentionDays, 7)));
            setTimelineDays(configData.retentionDays);
        } catch (error) {
            console.error('Error loading config:', error);
            setTimelineDays(7); // valor por defecto
        }
    };

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'up':
                return '🟢';
            case 'down':
                return '🔴';
            case 'unknown':
                return '⚫';
            default:
                return '⚪';
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'up':
                return '#10b981';
            case 'down':
                return '#ef4444';
            case 'unknown':
                return '#6b7280';
            default:
                return '#d1d5db';
        }
    };

    const formatTime = (dateString?: string) => {
        if (!dateString) return 'Nunca';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('es-ES');
        } catch {
            return 'Fecha inválida';
        }
    };

    const formatResponseTime = (responseTime?: number) => {
        if (!responseTime) return 'N/A';
        return `${responseTime}ms`;
    };

    const overallStatus = sites.length > 0 ?
        sites.every(site => site.status === 'up') ? 'up' :
            sites.some(site => site.status === 'down') ? 'down' : 'unknown' : 'unknown';

    const generateUptimeData = (siteName: string) => {
        if (!config) return Array(30).fill('unknown'); // fallback mientras carga config

        // Calcular número de checks a mostrar basado en la configuración
        const checksPerDay = Math.max(1, Math.floor(1440 / (config.checkInterval / 60))); // checks por día
        const totalChecks = Math.min(90, Math.max(30, checksPerDay * timelineDays));

        const siteChecks = statusChecks
            .filter(check => check.siteName === siteName)
            .slice(0, totalChecks)
            .reverse();

        if (siteChecks.length === 0) {
            return Array(timelineDays).fill('unknown');
        }

        // Rellenar con datos disponibles
        const uptimeData = Array(timelineDays).fill('unknown');
        siteChecks.forEach((check, index) => {
            if (index < totalChecks) {
                uptimeData[totalChecks - 1 - index] = check.status;
            }
        });

        return uptimeData;
    };

    const calculateUptime = (siteName: string) => {
        const siteChecks = statusChecks.filter(check => check.siteName === siteName);
        if (siteChecks.length === 0) return 0;

        const upChecks = siteChecks.filter(check => check.status === 'up').length;
        return Math.round((upChecks / siteChecks.length) * 100);    };

    if (loading) {
        return (
            <div className="status-dashboard">
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Cargando datos del dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="status-dashboard">
            <div className="dashboard-header">
                <div className="overall-status" style={{ borderColor: getStatusColor(overallStatus) }}>
                    <span className="status-icon">{getStatusIcon(overallStatus)}</span>
                    <div className="status-info">
                        <h3>Estado General del Sistema</h3>
                        <p className={`status-text ${overallStatus}`}>
                            {overallStatus === 'up' ? 'Todos los sistemas operativos' :
                                overallStatus === 'down' ? 'Algunos sistemas experimentan problemas' :
                                    'Verificando estado de los sistemas'}
                        </p>
                    </div>
                </div>

                <div className="last-updated">
                    <span>Última actualización: {new Date().toLocaleString('es-ES')}</span>
                </div>
            </div>

            <div className="sites-status-list">
                {sites.map((site) => {
                    const uptimeData = generateUptimeData(site.name);
                    const uptimePercent = calculateUptime(site.name);

                    return (
                        <div key={site.name} className={`site-status-item ${site.status}`}>
                            <div className="site-status-header">
                                <div className="site-basic-info">
                                    <div className="status-indicator-container">
                                        <span
                                            className="status-indicator"
                                            style={{ backgroundColor: getStatusColor(site.status) }}
                                        ></span>
                                        <div className="site-info">
                                            <h4 className="site-name">{site.name}</h4>
                                            <p className="site-description">{site.url}</p>
                                        </div>
                                    </div>

                                    <div className="site-status-badge">
                                        <span className={`status-badge ${site.status}`}>
                                            {site.status === 'up' ? 'Operativo' :
                                                site.status === 'down' ? 'Caído' : 'Desconocido'}
                                        </span>
                                    </div>
                                </div>

                                <div className="site-metrics-row">
                                    <div className="metric-item">
                                        <span className="metric-label">Uptime</span>
                                        <span className="metric-value">{uptimePercent}%</span>
                                    </div>
                                    <div className="metric-item">
                                        <span className="metric-label">Respuesta</span>
                                        <span className="metric-value">{formatResponseTime(site.responseTime)}</span>
                                    </div>
                                    <div className="metric-item">
                                        <span className="metric-label">Último check</span>
                                        <span className="metric-value">{formatTime(site.lastChecked)}</span>
                                    </div>
                                </div>
                            </div>              <div className="uptime-timeline">
                                <div className="timeline-header">
                                    <span className="timeline-label">
                                        Últimos {uptimeData.length} checks ({timelineDays} días max)
                                    </span>
                                    <div className="timeline-legend">
                                        <span className="legend-item">
                                            <span className="legend-color up"></span>
                                            Operativo
                                        </span>
                                        <span className="legend-item">
                                            <span className="legend-color down"></span>
                                            Caído
                                        </span>
                                        <span className="legend-item">
                                            <span className="legend-color unknown"></span>
                                            Sin datos
                                        </span>
                                    </div>
                                </div>

                                <div className="timeline-bars">
                                    {uptimeData.map((status, index) => (
                                        <div
                                            key={index}
                                            className={`timeline-bar ${status}`}
                                            title={`Check ${index + 1}: ${status}`}
                                        ></div>
                                    ))}
                                </div>

                                <div className="timeline-labels">
                                    <span>{uptimeData.length} checks atrás</span>
                                    <span>Ahora</span>
                                </div>

                                {config && (
                                    <div className="timeline-info">
                                        <small>
                                            Intervalo: {config.checkInterval}s | Retención: {config.retentionDays} días
                                        </small>
                                    </div>
                                )}
                            </div>

                            {site.errorMessage && (
                                <div className="error-message">
                                    <span className="error-icon">⚠️</span>
                                    <span>{site.errorMessage}</span>
                                </div>
                            )}

                            <div className="site-actions">                                <button
                                    className="manual-check-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleManualCheck(site.name);
                                    }}
                                >
                                    � Verificar ahora
                                </button>

                                <button
                                    className="details-btn"
                                    onClick={() => setSelectedSite(selectedSite === site.name ? null : site.name)}
                                >
                                    {selectedSite === site.name ? '▼ Ocultar detalles' : '▶ Ver detalles'}
                                </button>
                            </div>

                            {selectedSite === site.name && (
                                <div className="site-details-expanded">
                                    <div className="details-grid">
                                        <div className="detail-section">
                                            <h6>Configuración</h6>
                                            <div className="detail-row">
                                                <span>Método HTTP:</span>
                                                <span>{site.method}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span>Timeout:</span>
                                                <span>{site.timeout}s</span>
                                            </div>
                                            <div className="detail-row">
                                                <span>Código de estado:</span>
                                                <span>{site.statusCode || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="detail-section">
                                            <h6>Historial Reciente</h6>
                                            <div className="recent-history">
                                                {statusChecks
                                                    .filter(check => check.siteName === site.name)
                                                    .slice(0, 5)
                                                    .map((check, index) => (
                                                        <div key={index} className={`history-item ${check.status}`}>
                                                            <span className="history-status">{getStatusIcon(check.status)}</span>
                                                            <span className="history-time">{formatTime(check.checkedAt)}</span>
                                                            <span className="history-response">{formatResponseTime(check.responseTime)}</span>
                                                            <span className="history-code">HTTP {check.statusCode}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {sites.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <h3>No hay sitios configurados</h3>
                    <p>Ve a la sección de Configuración para agregar sitios a monitorear.</p>
                </div>
            )}
        </div>
    );
};

export default StatusDashboard;
