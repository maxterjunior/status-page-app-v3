import React, { useState, useEffect } from 'react';
import { StatusPageService } from '../../bindings/changeme';
import { Card, Statistic, Table, Button, Typography, Row, Col, Progress, Tag, Spin, Space } from 'antd';
import { ReloadOutlined, DatabaseOutlined, ClockCircleOutlined, FolderOutlined, LineChartOutlined, ArrowUpOutlined } from '@ant-design/icons';
import './StatsPanel.antd.css';

const { Title, Text } = Typography;

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
    }; if (loading) {
        return (
            <div className="stats-loading">
                <Spin size="large" />
                <Text style={{ marginTop: 16, color: 'white' }}>Cargando estadísticas...</Text>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="stats-error">
                <Title level={3} style={{ color: 'white' }}>Error al cargar estadísticas</Title>
                <Button type="primary" onClick={loadStats} icon={<ReloadOutlined />}>
                    Reintentar
                </Button>
            </div>
        );
    } return (
        <div className="stats-panel">
            <div className="stats-header">
                <Title level={2} style={{ color: 'white', margin: 0 }}>
                    Estadísticas del Sistema
                </Title>
                <Button
                    type="primary"
                    onClick={loadStats}
                    icon={<ReloadOutlined />}
                    loading={loading}
                >
                    Actualizar Estadísticas
                </Button>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Total de Verificaciones"
                            value={stats.totalRecords}
                            prefix={<DatabaseOutlined />}
                            valueStyle={{ color: 'white' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Intervalo de Verificación"
                            value={stats.checkInterval}
                            suffix="s"
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: 'white' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Retención de Datos"
                            value={stats.retentionDays}
                            suffix="días"
                            prefix={<FolderOutlined />}
                            valueStyle={{ color: 'white' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="Sitios Monitoreados"
                            value={stats.siteStats.length}
                            prefix={<LineChartOutlined />}
                            valueStyle={{ color: 'white' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card className="time-range-card" style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                        <Text strong style={{ color: 'white' }}>Primer registro: </Text>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {formatDate(stats.oldestRecord)}
                        </Text>
                    </Col>
                    <Col xs={24} md={8}>
                        <Text strong style={{ color: 'white' }}>Último registro: </Text>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {formatDate(stats.newestRecord)}
                        </Text>
                    </Col>
                    <Col xs={24} md={8}>
                        <Text strong style={{ color: 'white' }}>Generado: </Text>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {formatDate(stats.generatedAt)}
                        </Text>
                    </Col>
                </Row>
            </Card>

            <Card className="sites-stats-card">
                <Title level={3} style={{ color: 'white', marginBottom: 16 }}>
                    Estadísticas por Sitio
                </Title>

                {stats.siteStats.length === 0 ? (
                    <div className="no-stats">
                        <div className="empty-icon">📊</div>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            No hay estadísticas disponibles
                        </Text>
                        <br />
                        <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            Espera a que se recopilen más datos
                        </Text>
                    </div>
                ) : (
                    <Table
                        dataSource={stats.siteStats}
                        rowKey="siteName"
                        pagination={false}
                        className="stats-table"
                        columns={[
                            {
                                title: 'Sitio',
                                dataIndex: 'siteName',
                                key: 'siteName',
                                render: (text) => (
                                    <Text strong style={{ color: 'white' }}>{text}</Text>
                                )
                            },
                            {
                                title: 'Uptime',
                                dataIndex: 'uptimePercent',
                                key: 'uptimePercent',
                                render: (uptime) => (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Progress
                                            percent={uptime}
                                            size="small"
                                            strokeColor={getUptimeColor(uptime)}
                                            style={{ width: 80 }}
                                        />
                                        <Text style={{ color: getUptimeColor(uptime), minWidth: 50 }}>
                                            {formatPercentage(uptime)}
                                        </Text>
                                    </div>
                                )
                            }, {
                                title: 'Verificaciones',
                                key: 'checks',
                                render: (_, record: SiteStats) => (
                                    // <div>
                                    //     <Text strong style={{ color: 'white' }}>
                                    //         {record.totalChecks.toLocaleString()}
                                    //     </Text>
                                    //     <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                    //         <Text style={{ color: '#10b981' }}>
                                    //             ↑ {record.upChecks}
                                    //         </Text>
                                    //         {' '}
                                    //         <Text style={{ color: '#ef4444' }}>
                                    //             ↓ {record.downChecks}
                                    //         </Text>
                                    //     </div>
                                    // </div>
                                    <Space>
                                        <Tag color="#10b981" icon={<ArrowUpOutlined />}>
                                            {record.upChecks.toLocaleString()}
                                        </Tag>
                                        <Tag color="#ef4444" icon={<ArrowUpOutlined />}>
                                            {record.downChecks.toLocaleString()}
                                        </Tag>
                                        <Tag color="#6366f1" icon={<DatabaseOutlined />}>
                                            {record.totalChecks.toLocaleString()}
                                        </Tag>
                                    </Space>
                                )
                            },
                            {
                                title: 'Tiempo de Respuesta',
                                dataIndex: 'avgResponseTime',
                                key: 'avgResponseTime',
                                render: (time) => (
                                    <Text style={{ color: 'white' }}>
                                        {formatResponseTime(time)}
                                    </Text>
                                )
                            }, {
                                title: 'Estado',
                                key: 'status',
                                render: (_, record: SiteStats) => {
                                    const uptime = record.uptimePercent;
                                    let status, color;
                                    if (uptime >= 99) {
                                        status = 'Excelente';
                                        color = 'success';
                                    } else if (uptime >= 95) {
                                        status = 'Bueno';
                                        color = 'warning';
                                    } else {
                                        status = 'Deficiente';
                                        color = 'error';
                                    }
                                    return <Tag color={color}>{status}</Tag>;
                                }
                            }
                        ]}
                    />
                )}
            </Card>

            <Card className="stats-summary-card">
                <Title level={3} style={{ color: 'white', marginBottom: 16 }}>
                    Resumen General
                </Title>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                        <Statistic
                            title="Uptime Promedio"
                            value={stats.siteStats.length > 0
                                ? stats.siteStats.reduce((acc, site) => acc + site.uptimePercent, 0) / stats.siteStats.length
                                : 0
                            }
                            precision={2}
                            suffix="%"
                            valueStyle={{ color: 'white' }}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Statistic
                            title="Respuesta Promedio"
                            value={stats.siteStats.length > 0
                                ? stats.siteStats.reduce((acc, site) => acc + site.avgResponseTime, 0) / stats.siteStats.length
                                : 0
                            }
                            precision={0}
                            suffix="ms"
                            valueStyle={{ color: 'white' }}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Statistic
                            title="Verificaciones Exitosas"
                            value={stats.siteStats.reduce((acc, site) => acc + site.upChecks, 0)}
                            valueStyle={{ color: '#10b981' }}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Statistic
                            title="Verificaciones Fallidas"
                            value={stats.siteStats.reduce((acc, site) => acc + site.downChecks, 0)}
                            valueStyle={{ color: '#ef4444' }}
                        />
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default StatsPanel;
