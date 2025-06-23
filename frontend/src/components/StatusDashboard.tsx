import React, { useState, useEffect } from 'react';
import { StatusPageService } from '../../bindings/changeme';
import { StatusCheck, SiteDetail } from '../types';
import {
    Card,
    Typography,
    Button,
    Space,
    Tag,
    Spin,
    Empty,
    Progress,
    Tooltip,
    Row,
    Col,
    Statistic,
    Collapse,
    Divider
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    QuestionCircleOutlined,
    ReloadOutlined,
    EyeOutlined,
    EyeInvisibleOutlined
} from '@ant-design/icons';
import './StatusDashboard.css';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface Props { }

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
                </Card>

                <Row gutter={[16, 16]}>
                    {sites.map((site) => {
                        const uptimeData = generateUptimeData(site.name);
                        const uptimePercent = calculateUptime(site.name);

                        return (
                            <Col xs={24} lg={12} xl={8} key={site.name}>
                                <Card
                                    className="site-status-card"
                                    title={
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <div
                                                style={{
                                                    width: 12,
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
                                    extra={getStatusTag(site.status)}
                                    size="small"
                                >
                                    <Space direction="vertical" style={{ width: '100%' }} size="small">

                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text style={{ fontSize: '12px' }}>
                                                    Últimos {uptimeData.length} checks
                                                </Text>
                                                <Text style={{ fontSize: '11px' }}>
                                                    {formatTime(site.lastChecked)}
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

                                        <div style={{ marginTop: 12 }}>
                                            <Space>
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    icon={<ReloadOutlined />}
                                                    onClick={() => handleManualCheck(site.name)}
                                                >
                                                    Verificar
                                                </Button>
                                                <Button
                                                    size="small"
                                                    icon={selectedSite === site.name ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                                    onClick={() => setSelectedSite(selectedSite === site.name ? null : site.name)}
                                                >
                                                    {selectedSite === site.name ? 'Ocultar' : 'Detalles'}
                                                </Button>
                                            </Space>
                                        </div>
                                    </Space>
                                </Card>

                                {selectedSite === site.name && (
                                    <Card
                                        className="site-details-card"
                                        style={{ marginTop: 8 }}
                                        size="small"
                                    >
                                        <Collapse ghost>
                                            <Panel header="Configuración" key="config">
                                                <Row gutter={[16, 8]}>
                                                    <Col span={8}>
                                                        <Text >Método:</Text>
                                                    </Col>
                                                    <Col span={16}>
                                                        <Tag color="blue">{site.method}</Tag>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text >Timeout:</Text>
                                                    </Col>
                                                    <Col span={16}>
                                                        <Text >{site.timeout}s</Text>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text >Estado HTTP:</Text>
                                                    </Col>
                                                    <Col span={16}>
                                                        <Text >{site.statusCode || 'N/A'}</Text>
                                                    </Col>
                                                </Row>
                                            </Panel>
                                            <Panel header="Historial Reciente" key="history">
                                                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                                    {statusChecks
                                                        .filter(check => check.siteName === site.name)
                                                        .slice(0, 10)
                                                        .map((check, index) => (
                                                            <div
                                                                key={index}
                                                                style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    padding: '4px 0',
                                                                    borderBottom: index < 9 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    {getStatusTag(check.status)}
                                                                    <Text style={{ fontSize: '12px' }}>
                                                                        HTTP {check.statusCode}
                                                                    </Text>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <Text style={{ fontSize: '11px' }}>
                                                                        {formatResponseTime(check.responseTime)}
                                                                    </Text>
                                                                    <br />
                                                                    <Text style={{ fontSize: '10px' }}>
                                                                        {formatTime(check.checkedAt)}
                                                                    </Text>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </Panel>
                                        </Collapse>
                                    </Card>
                                )}
                            </Col>
                        );
                    })}
                </Row>

                {sites.length === 0 && (
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

            </Spin>
        </div>
    );
};

export default StatusDashboard;
