import React, { useState, useEffect } from 'react';
import { StatusPageService } from '../../bindings/changeme';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Typography,
  Row,
  Col,
  Table,
  Space,
  Modal,
  Select,
  message,
  Spin,
  Empty,
  Popconfirm,
  Tag
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  SettingOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import './ConfigPanel.antd.css';

const { Title, Text } = Typography;
const { Option } = Select;

interface Config {
  checkInterval: number;
  retentionDays: number;
  sites: Site[];
}

interface Site {
  name: string;
  url: string;
  method: string;
  timeout: number;
}

interface Props { }

const ConfigPanel: React.FC<Props> = () => {
  const [config, setConfig] = useState<Config>({
    checkInterval: 30,
    retentionDays: 7,
    sites: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);
  const [form] = Form.useForm();
  const [configForm] = Form.useForm();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const configData = await StatusPageService.GetConfig();
      setConfig(configData);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  }; const handleUpdateConfig = async (values: any) => {
    try {
      setSaving(true);
      await StatusPageService.UpdateConfig(values.checkInterval, values.retentionDays);
      setConfig(prev => ({
        ...prev,
        checkInterval: values.checkInterval,
        retentionDays: values.retentionDays
      }));
      message.success('Configuración actualizada correctamente');
    } catch (error) {
      console.error('Error updating config:', error);
      message.error('Error al actualizar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSite = async (values: Site) => {
    try {
      await StatusPageService.AddSite(values.name, values.url, values.method, values.timeout);
      form.resetFields();
      setShowAddSite(false);
      loadConfig();
      message.success('Sitio agregado correctamente');
    } catch (error) {
      console.error('Error adding site:', error);
      message.error('Error al agregar el sitio');
    }
  };

  const handleRemoveSite = async (siteName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el sitio "${siteName}"?`)) {
      return;
    } try {
      await StatusPageService.RemoveSite(siteName);
      loadConfig();
      alert('Sitio eliminado correctamente');
    } catch (error) {
      console.error('Error removing site:', error);
      alert('Error al eliminar el sitio');
    }
  };
  if (loading) {
    return (
      <div className="config-loading">
        <Spin size="large" />
        <Text style={{ marginTop: 16, color: 'white' }}>Cargando configuración...</Text>
      </div>
    );
  }

  const columns = [
    {
      title: 'Sitio',
      key: 'site',
      render: (_, record: Site) => (
        <div>
          <Text strong style={{ color: 'white' }}>{record.name}</Text>
          <br />
          <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
            {record.url}
          </Text>
        </div>
      )
    },
    {
      title: 'Método',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => (
        <Tag color="blue">{method}</Tag>
      )
    },
    {
      title: 'Timeout',
      dataIndex: 'timeout',
      key: 'timeout',
      render: (timeout: number) => (
        <Text style={{ color: 'white' }}>{timeout}s</Text>
      )
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record: Site) => (
        <Popconfirm
          title="¿Estás seguro de eliminar este sitio?"
          description="Se eliminarán todos los datos históricos del sitio."
          onConfirm={() => handleRemoveSite(record.name)}
          okText="Sí"
          cancelText="No"
        >
          <Button type='primary' danger icon={<DeleteOutlined />} size="small">
            Eliminar
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <div className="config-panel">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={
              <Title level={3} style={{ color: 'white', margin: 0 }}>
                <SettingOutlined /> Configuración General
              </Title>
            }
            className="config-card"
          >
            <Form
              form={configForm}
              layout="vertical"
              initialValues={{
                checkInterval: config.checkInterval,
                retentionDays: config.retentionDays
              }}
              onFinish={handleUpdateConfig}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={<Text style={{ color: 'white' }}>Intervalo de verificación (segundos)</Text>}
                    name="checkInterval"
                    rules={[
                      { required: true, message: 'El intervalo es requerido' },
                      { type: 'number', min: 10, message: 'Mínimo 10 segundos' }
                    ]}
                  >
                    <InputNumber
                      min={10}
                      placeholder="30"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
                    Tiempo entre verificaciones automáticas (mínimo 10 segundos)
                  </Text>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={<Text style={{ color: 'white' }}>Días de retención de datos</Text>}
                    name="retentionDays"
                    rules={[
                      { required: true, message: 'Los días de retención son requeridos' },
                      { type: 'number', min: 1, message: 'Mínimo 1 día' }
                    ]}
                  >
                    <InputNumber
                      min={1}
                      placeholder="7"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
                    Cuántos días mantener el historial de verificaciones
                  </Text>
                </Col>
              </Row>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                  icon={<SaveOutlined />}
                >
                  Guardar Configuración
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col span={24}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={3} style={{ color: 'white', margin: 0 }}>
                  <GlobalOutlined /> Sitios Monitoreados
                </Title>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setShowAddSite(true)}
                >
                  Agregar Sitio
                </Button>
              </div>
            }
            className="sites-card"
          >
            {config.sites.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      No hay sitios configurados
                    </Text>
                    <br />
                    <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Agrega un sitio para comenzar el monitoreo
                    </Text>
                  </div>
                }
              />
            ) : (
              <Table
                dataSource={config.sites}
                columns={columns}
                rowKey="name"
                pagination={false}
                className="sites-table"
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="Agregar Nuevo Sitio"
        open={showAddSite}
        onCancel={() => {
          setShowAddSite(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddSite}
          initialValues={{
            method: 'GET',
            timeout: 10
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Nombre del sitio"
                name="name"
                rules={[{ required: true, message: 'El nombre es requerido' }]}
              >
                <Input placeholder="Ej: Mi Sitio Web" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="URL"
                name="url"
                rules={[
                  { required: true, message: 'La URL es requerida' },
                  { type: 'url', message: 'Ingresa una URL válida' }
                ]}
              >
                <Input placeholder="https://ejemplo.com" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Método HTTP"
                name="method"
                rules={[{ required: true, message: 'El método es requerido' }]}
              >
                <Select>
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="HEAD">HEAD</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Timeout (segundos)"
                name="timeout"
                rules={[
                  { required: true, message: 'El timeout es requerido' },
                  { type: 'number', min: 1, max: 300, message: 'Entre 1 y 300 segundos' }
                ]}
              >
                <InputNumber min={1} max={300} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setShowAddSite(false);
                  form.resetFields();
                }}
              >
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                Agregar Sitio
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ConfigPanel;
