import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    MoreOutlined,
    QuestionCircleOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import {
    Button,
    Card,
    Col,
    Divider,
    Dropdown,
    Empty,
    Modal,
    Row,
    Space,
    Spin,
    Statistic,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { StatusPageService } from '../../bindings/changeme';
import { SiteDetail, SiteStatusDetail } from '../types';
import './StatusDashboard.css';

const { Title, Text } = Typography;

interface Props { }

const StatusDashboard: React.FC<Props> = () => {
    const [selectedSite, setSelectedSite] = useState<string | null>(null);
    const [config, setConfig] = useState<any>(null);
    const [timelineDays, setTimelineDays] = useState(7); const [sites, setSites] = useState<SiteDetail[]>([]);
    const [siteStatusDetails, setSiteStatusDetails] = useState<SiteStatusDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingCards, setLoadingCards] = useState<Set<string>>(new Set());
    const [modalOpen, setModalOpen] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const [sitesData, statusData] = await Promise.all([
                StatusPageService.GetAllSites(),
                StatusPageService.GetAllStatus()
            ]);
            setSites(sitesData);
            setSiteStatusDetails(statusData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }; const handleManualCheck = async (siteName: string) => {
        try {
            // Agregar sitio al set de loading
            setLoadingCards(prev => new Set(prev).add(siteName));

            await StatusPageService.ManualCheck(siteName);
            // Esperar un poco y recargar datos
            setTimeout(() => {
                loadData();
                // Remover sitio del set de loading
                setLoadingCards(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(siteName);
                    return newSet;
                });
            }, 2000);
        } catch (error) {
            console.error('Error en check manual:', error);
            // Remover sitio del set de loading en caso de error
            setLoadingCards(prev => {
                const newSet = new Set(prev);
                newSet.delete(siteName);
                return newSet;
            });
        }
    };

    const handleShowDetails = (siteName: string) => {
        setSelectedSite(siteName);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedSite(null);
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
            setTimelineDays(configData.retentionDays);
        } catch (error) {
            console.error('Error loading config:', error);
            setTimelineDays(7); // valor por defecto
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'up':
                return '#10b981';
            case 'down':
                return '#ef4444';
            case 'partial':
                return '#f59e0b';
            case 'unknown':
                return '#6b7280';
            default:
                return '#d1d5db';
        }
    };

    const overallStatus = sites.length > 0 ?
        sites.every(site => site.status === 'up') ? 'up' :
            sites.some(site => site.status === 'down') ? 'down' : 'unknown' : 'unknown';

    const calculateUptime = (siteName: string) => {
        const siteStatus = siteStatusDetails.find(status => status.siteName === siteName);
        if (!siteStatus || !siteStatus.totalStats) return 0;

        return Math.round(siteStatus.totalStats.uptimePercent);
    };

    const generateUptimeData = (siteName: string): {
        status: string;
        up: number;
        down: number;
        total: number;
        date: string;
    }[] => {
        if (!config) return Array(30).fill(0).map(() => ({ status: 'unknown', up: 0, down: 0, total: 0, date: '' }));

        const siteStatus = siteStatusDetails.find(status => status.siteName === siteName);
        if (!siteStatus || !siteStatus.dailyStats) {
            return Array(timelineDays).fill(0).map(() => ({ status: 'unknown', up: 0, down: 0, total: 0, date: '' }));
        }

        const nowDay = dayjs();
        const dailyStats = siteStatus.dailyStats.slice(0, timelineDays);

        // Generar datos de uptime basados en las estadísticas diarias
        const uptimeData = Array(timelineDays).fill(0).map((_, index) => {
            const dayDate = nowDay.subtract(timelineDays - 1 - index, 'day').format('YYYY-MM-DD');
            return { status: 'unknown', up: 0, down: 0, total: 0, date: dayDate };
        });

        // Llenar con datos reales donde estén disponibles
        dailyStats.forEach((stat) => {
            const statDate = dayjs(stat.date, 'YYYY-MM-DD');
            const dayIndex = timelineDays - 1 - nowDay.diff(statDate, 'day');

            if (dayIndex >= 0 && dayIndex < timelineDays) {
                const uptimePercent = stat.uptimePercent;
                uptimeData[dayIndex] = {
                    up: stat.upChecks,
                    down: stat.downChecks,
                    total: stat.totalChecks,
                    status: uptimePercent >= 80 ? 'up' : uptimePercent < 50 ? 'down' : 'partial',
                    date: stat.date
                };
            }
        });

        return uptimeData;
    };

    const getStatusTag = (status?: string) => {
        switch (status) {
            case 'up':
                return <Tag color="success" icon={<CheckCircleOutlined />}>Operativo</Tag>;
            case 'down':
                return <Tag color="error" icon={<CloseCircleOutlined />}>Caído</Tag>;
            case 'unknown':
                return <Tag color="default" icon={<QuestionCircleOutlined />}>Desconocido</Tag>;
            default:
                return <Tag color="default">Sin estado</Tag>;
        }
    };

    const getOverallStatusMessage = (status: string) => {
        switch (status) {
            case 'up':
                return 'Todos los sistemas operativos';
            case 'down':
                return 'Algunos sistemas experimentan problemas';
            default:
                return 'Verificando estado de los sistemas';
        }
    };

    return (
        <div className="status-dashboard">
            <Spin size="large" spinning={loading} tip="Cargando datos...">
                <Card className="overall-status-card" style={{ marginBottom: 24 }}>
                    <Row align="middle" gutter={16}>
                        <Col>
                            <div className="status-icon-large">
                                {overallStatus === 'up' ?
                                    <CheckCircleOutlined style={{ fontSize: 48, color: '#10b981' }} /> :
                                    overallStatus === 'down' ?
                                        <CloseCircleOutlined style={{ fontSize: 48, color: '#ef4444' }} /> :
                                        <QuestionCircleOutlined style={{ fontSize: 48, color: '#6b7280' }} />
                                }
                            </div>
                        </Col>
                        <Col flex="auto">
                            <Title level={3} style={{ margin: 0, color: getStatusColor(overallStatus), }}>
                                {getOverallStatusMessage(overallStatus)}
                            </Title>

                            <Text style={{ fontSize: '12px' }}>
                                Última actualización: {new Date().toLocaleString('es-ES')}
                            </Text>
                        </Col>
                        <Col>
                            <Button
                                type="primary"
                                icon={<ReloadOutlined />}
                                onClick={loadData}
                                loading={loading}
                            >
                                Actualizar
                            </Button>
                        </Col>
                    </Row>
                </Card>                <Row gutter={[16, 16]}>
                    {sites.map((site) => {
                        const uptimeData = generateUptimeData(site.name);
                        const uptimePercent = calculateUptime(site.name);
                        const isCardLoading = loadingCards.has(site.name);

                        return (
                            <Col xs={24} lg={12} xl={8} key={site.name}>
                                <Card
                                    loading={isCardLoading}
                                    className="site-status-card"
                                    title={
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <div
                                                style={{
                                                    minWidth: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                    marginRight: 5,
                                                    backgroundColor: getStatusColor(site.status)
                                                }}
                                            />
                                            <Text strong >{site.name}</Text>
                                            <Divider type="vertical" />
                                            <Text style={{ fontSize: '10px' }}>
                                                {site.url}
                                            </Text>
                                            <Divider type="vertical" />
                                            <Statistic
                                                value={uptimePercent}
                                                suffix="%"
                                                valueStyle={{ fontSize: '14px' }}
                                                style={{ marginBottom: 0 }}
                                            />
                                            <Divider type="vertical" />
                                            <Statistic
                                                value={site.responseTime || 0}
                                                suffix="ms"
                                                valueStyle={{ fontSize: '14px' }}
                                            />
                                            <Divider type="vertical" />
                                            <Statistic
                                                value={site.statusCode || 'N/A'}
                                                valueStyle={{ fontSize: '14px' }}
                                                prefix={<Text style={{ fontSize: '12px' }}>HTTP</Text>}
                                            />

                                        </div>
                                    }
                                    extra={<div style={{ display: 'flex', alignItems: 'center' }}>
                                        <Dropdown
                                            menu={{
                                                items: [
                                                    {
                                                        key: 'manualCheck',
                                                        label: 'Verificar ahora',
                                                        onClick: () => handleManualCheck(site.name),
                                                        disabled: isCardLoading
                                                    },
                                                    {
                                                        key: 'showDetails',
                                                        label: 'Ver detalles',
                                                        onClick: () => handleShowDetails(site.name)
                                                    }
                                                ]
                                            }}
                                        >
                                            <Button type="link" icon={<MoreOutlined />} />
                                        </Dropdown>
                                        {getStatusTag(site.status)}
                                    </div>}
                                    size="small"                                >
                                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text style={{ fontSize: '12px' }}>
                                                    Últimos {uptimeData.length} checks
                                                </Text>
                                                <Text style={{ fontSize: '11px' }}>
                                                    {dayjs(site.lastChecked).format('DD/MM/YYYY')}
                                                </Text>
                                            </div>
                                            <div style={{ display: 'flex', gap: 1, height: 20 }}>
                                                {uptimeData.map((status, index) => (
                                                    <Tooltip
                                                        key={index}
                                                        title={
                                                            <div style={{ padding: '8px 4px', minWidth: '200px' }}>
                                                                <div style={{
                                                                    fontWeight: 'bold',
                                                                    marginBottom: '8px',
                                                                    fontSize: '13px',
                                                                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                                                                    paddingBottom: '4px'
                                                                }}>
                                                                    {status.date ?
                                                                        dayjs(status.date).format('dddd DD') :
                                                                        `${dayjs().subtract(timelineDays - 1 - index, 'day').format('DD/MM/YYYY dddd')}`
                                                                    }
                                                                </div>
                                                                {status.total > 0 ? (
                                                                    <div>
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            marginBottom: '6px'
                                                                        }}>
                                                                            <span style={{ fontSize: '12px' }}>Total de checks:</span>
                                                                            <strong style={{ fontSize: '12px' }}>{status.total}</strong>
                                                                        </div>
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            marginBottom: '6px'
                                                                        }}>
                                                                            <span style={{ fontSize: '12px', color: '#52C41A' }}>✓ Exitosos:</span>
                                                                            <strong style={{ fontSize: '12px', color: '#52C41A' }}>{status.up}</strong>
                                                                        </div>
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            marginBottom: '8px'
                                                                        }}>
                                                                            <span style={{ fontSize: '12px', color: '#FF4D4F' }}>✗ Fallidos:</span>
                                                                            <strong style={{ fontSize: '12px', color: '#FF4D4F' }}>{status.down}</strong>
                                                                        </div>

                                                                        {/* Barra de progreso visual */}
                                                                        <div style={{ marginBottom: '8px' }}>
                                                                            <div style={{
                                                                                fontSize: '11px',
                                                                                marginBottom: '2px',
                                                                                color: 'rgba(255,255,255,0.8)'
                                                                            }}>
                                                                                Distribución diaria:
                                                                            </div>
                                                                            <div style={{
                                                                                display: 'flex',
                                                                                height: '8px',
                                                                                borderRadius: '4px',
                                                                                overflow: 'hidden',
                                                                                backgroundColor: 'rgba(255,255,255,0.2)'
                                                                            }}>
                                                                                <div style={{
                                                                                    width: `${(status.up / status.total) * 100}%`,
                                                                                    backgroundColor: '#52C41A'
                                                                                }} />
                                                                                <div style={{
                                                                                    width: `${(status.down / status.total) * 100}%`,
                                                                                    backgroundColor: '#FF4D4F'
                                                                                }} />
                                                                            </div>
                                                                        </div>

                                                                        <div style={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            borderTop: '1px solid rgba(255,255,255,0.2)',
                                                                            paddingTop: '6px'
                                                                        }}>
                                                                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Uptime:</span>
                                                                            <strong style={{
                                                                                fontSize: '13px',
                                                                                color: status.up / status.total >= 0.8 ? '#52C41A' :
                                                                                    status.up / status.total < 0.5 ? '#FF4D4F' : '#FA8C16'
                                                                            }}>
                                                                                {((status.up / status.total) * 100).toFixed(1)}%
                                                                            </strong>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div style={{
                                                                        fontSize: '12px',
                                                                        color: 'rgba(255,255,255,0.6)',
                                                                        textAlign: 'center',
                                                                        padding: '8px 0'
                                                                    }}>
                                                                        Sin datos disponibles para este día
                                                                    </div>
                                                                )}
                                                            </div>
                                                        }
                                                        placement="top"
                                                        overlayStyle={{
                                                            maxWidth: '250px'
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                flex: 1,
                                                                backgroundColor: getStatusColor(status.status),
                                                                borderRadius: 2,
                                                                opacity: status.status === 'unknown' ? 0.3 : 1,
                                                                cursor: 'pointer',
                                                                minHeight: '20px'
                                                            }}
                                                        />
                                                    </Tooltip>
                                                ))}
                                            </div>
                                        </div>

                                        {site.errorMessage && (
                                            <div style={{
                                                padding: 8,
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderRadius: 4,
                                                marginTop: 8
                                            }}>
                                                <Text style={{ color: '#fca5a5', fontSize: '12px' }}>
                                                    ⚠️ {site.errorMessage}
                                                </Text>
                                            </div>
                                        )}
                                    </Space>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>                {sites.length === 0 && (
                    <Card>
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div>
                                    <Text>
                                        No hay sitios configurados
                                    </Text>
                                    <br />
                                    <Text>
                                        Ve a la sección de Configuración para agregar sitios a monitorear
                                    </Text>
                                </div>
                            }
                        />
                    </Card>
                )}

                {/* Modal para mostrar detalles del sitio */}
                <Modal
                    title={
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div
                                style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    marginRight: 8,
                                    backgroundColor: selectedSite ? getStatusColor(sites.find(s => s.name === selectedSite)?.status) : '#d1d5db'
                                }}
                            />
                            Detalles de {selectedSite}
                        </div>
                    }
                    open={modalOpen}
                    onCancel={handleCloseModal}
                    footer={[
                        <Button key="close" onClick={handleCloseModal}>
                            Cerrar
                        </Button>,
                        <Button
                            key="check"
                            type="primary"
                            icon={<ReloadOutlined />}
                            loading={selectedSite ? loadingCards.has(selectedSite) : false}
                            onClick={() => selectedSite && handleManualCheck(selectedSite)}
                        >
                            Verificar ahora
                        </Button>
                    ]}
                    width={800}
                >
                    {selectedSite && (() => {
                        const site = sites.find(s => s.name === selectedSite);
                        if (!site) return null;

                        return (
                            <div>
                                {/* Sección de Configuración */}
                                <Title level={4} style={{ marginTop: 0 }}>Configuración</Title>
                                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                                    <Col span={12}>
                                        <Card size="small">
                                            <Statistic
                                                title="URL"
                                                value={site.url}
                                                valueStyle={{ fontSize: '14px', wordBreak: 'break-all' }}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={6}>
                                        <Card size="small">
                                            <Statistic
                                                title="Método"
                                                value={site.method}
                                                formatter={(value) => <Tag color="blue">{value}</Tag>}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={6}>
                                        <Card size="small">
                                            <Statistic
                                                title="Timeout"
                                                value={site.timeout}
                                                suffix="s"
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card size="small">
                                            <Statistic
                                                title="Estado HTTP"
                                                value={site.statusCode || 'N/A'}
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card size="small">
                                            <Statistic
                                                title="Tiempo de Respuesta"
                                                value={site.responseTime || 0}
                                                suffix="ms"
                                            />
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card size="small">
                                            <Statistic
                                                title="Uptime"
                                                value={calculateUptime(selectedSite)}
                                                suffix="%"
                                                valueStyle={{
                                                    color: calculateUptime(selectedSite) >= 95 ? '#10b981' : '#ef4444'
                                                }}
                                            />
                                        </Card>
                                    </Col>
                                </Row>

                                {site.errorMessage && (
                                    <div style={{
                                        marginBottom: 24,
                                        padding: 12,
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: 6
                                    }}>
                                        <Title level={5} style={{ color: '#fca5a5', margin: 0 }}>
                                            ⚠️ Error Actual
                                        </Title>
                                        <Text style={{ color: '#fca5a5' }}>
                                            {site.errorMessage}
                                        </Text>
                                    </div>
                                )}

                                {/* Sección de Estadísticas Diarias */}
                                <Title level={4}>Estadísticas Diarias (Últimos {timelineDays} días)</Title>
                                <div style={{ maxHeight: 400, }}>
                                    <Row gutter={[8, 8]}>
                                        {(() => {
                                            const siteStatus = siteStatusDetails.find(status => status.siteName === selectedSite);
                                            if (!siteStatus || !siteStatus.dailyStats || siteStatus.dailyStats.length === 0) {
                                                return (
                                                    <Col span={24}>
                                                        <Empty
                                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                            description="No hay datos de estadísticas disponibles"
                                                        />
                                                    </Col>
                                                );
                                            }

                                            return siteStatus.dailyStats.map((stat, index) => (
                                                <Col span={24} key={index}>
                                                    <Card
                                                        size="small"
                                                        style={{
                                                            borderLeft: `4px solid ${stat.uptimePercent >= 80 ? '#10b981' : stat.uptimePercent < 50 ? '#ef4444' : '#f59e0b'}`,
                                                        }}
                                                    >
                                                        <Row align="middle" justify="space-between">
                                                            <Col flex="auto">
                                                                <Space direction="vertical" size="small">
                                                                    <Space>
                                                                        <Text strong style={{ fontSize: '13px' }}>
                                                                            {new Date(stat.date).toLocaleDateString('es-ES', {
                                                                                weekday: 'long',
                                                                                year: 'numeric',
                                                                                month: 'long',
                                                                                day: 'numeric'
                                                                            })}
                                                                        </Text>
                                                                        <Tag color={stat.uptimePercent >= 95 ? 'success' : stat.uptimePercent >= 80 ? 'warning' : 'error'}>
                                                                            {stat.uptimePercent.toFixed(1)}% Uptime
                                                                        </Tag>
                                                                    </Space>
                                                                    <Space>
                                                                        <Text style={{ fontSize: '12px' }}>
                                                                            Total: {stat.totalChecks} checks
                                                                        </Text>
                                                                        <Text style={{ fontSize: '12px', color: '#10b981' }}>
                                                                            ✓ {stat.upChecks}
                                                                        </Text>
                                                                        <Text style={{ fontSize: '12px', color: '#ef4444' }}>
                                                                            ✗ {stat.downChecks}
                                                                        </Text>
                                                                    </Space>
                                                                </Space>
                                                            </Col>
                                                        </Row>
                                                    </Card>
                                                </Col>
                                            ));
                                        })()}
                                    </Row>
                                </div>
                            </div>
                        );
                    })()}
                </Modal>

            </Spin>
        </div>
    );
};

export default StatusDashboard;
