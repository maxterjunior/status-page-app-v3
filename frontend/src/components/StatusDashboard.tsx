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
import { SiteDetail, StatusCheck } from '../types';
import './StatusDashboard.css';

const { Title, Text } = Typography;

interface Props { }

const StatusDashboard: React.FC<Props> = () => {
    const [selectedSite, setSelectedSite] = useState<string | null>(null);
    const [config, setConfig] = useState<any>(null);
    const [timelineDays, setTimelineDays] = useState(7); const [sites, setSites] = useState<SiteDetail[]>([]);
    const [statusChecks, setStatusChecks] = useState<StatusCheck[]>([]);
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
            setStatusChecks(statusData);
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
            // Asumiendo ~48 checks por día (cada 30 minutos), pero mínimo 30 y máximo 90
            const checksPerDay = Math.max(1, Math.floor(1440 / (configData.checkInterval / 60))); // checks por día
            const totalChecks = Math.min(90, Math.max(30, checksPerDay * Math.min(configData.retentionDays, 7)));
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
            sites.some(site => site.status === 'down') ? 'down' : 'unknown' : 'unknown'; const calculateUptime = (siteName: string) => {
                const siteChecks = statusChecks.filter(check => check.siteName === siteName);
                if (siteChecks.length === 0) return 0;

                const upChecks = siteChecks.filter(check => check.status === 'up').length;
                return Math.round((upChecks / siteChecks.length) * 100);
            };

    const generateUptimeData = (siteName: string) => {
        if (!config) return Array(30).fill('unknown'); // fallback mientras carga config

        const siteChecks = statusChecks
            .filter(check => check.siteName === siteName)
            .reverse();

        if (siteChecks.length === 0) {
            return Array(timelineDays).fill('unknown');
        }

        // Rellenar con datos disponibles
        const uptimeData = Array(timelineDays).fill('unknown');
        siteChecks.forEach((check, index) => {
            uptimeData[timelineDays - 1 - index] = check.status;
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
                                                    <Tooltip key={index} title={`Check ${index + 1}: ${status}`}>
                                                        <div
                                                            style={{
                                                                flex: 1,
                                                                backgroundColor: getStatusColor(status),
                                                                borderRadius: 2,
                                                                opacity: status === 'unknown' ? 0.3 : 1,
                                                                cursor: 'pointer'
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

                                {/* Sección de Historial */}
                                <Title level={4}>Historial Reciente</Title>
                                <div style={{ maxHeight: 400 }}>
                                    <Row gutter={[8, 8]}>
                                        {statusChecks
                                            .filter(check => check.siteName === selectedSite)
                                            .slice(0, 20)
                                            .map((check, index) => (
                                                <Col span={24} key={index}>
                                                    <Card
                                                        size="small"
                                                        style={{
                                                            borderLeft: `4px solid ${getStatusColor(check.status)}`,
                                                        }}
                                                    >
                                                        <Row align="middle" justify="space-between">
                                                            <Col>
                                                                <Space>
                                                                    {getStatusTag(check.status)}
                                                                    <Text style={{ fontSize: '12px' }}>
                                                                        HTTP {check.statusCode}
                                                                    </Text>
                                                                    <Text style={{ fontSize: '12px' }}>
                                                                        {formatResponseTime(check.responseTime)}
                                                                    </Text>
                                                                </Space>
                                                            </Col>
                                                            <Col>
                                                                <Text style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>
                                                                    {formatTime(check.checkedAt)}
                                                                </Text>
                                                            </Col>
                                                        </Row>
                                                    </Card>
                                                </Col>
                                            ))}
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
