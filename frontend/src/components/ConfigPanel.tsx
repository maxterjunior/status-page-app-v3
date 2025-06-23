import React, { useState, useEffect } from 'react';
import { StatusPageService } from '../../bindings/changeme';
import './ConfigPanel.css';

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

interface Props {
  onConfigUpdate: () => void;
}

const ConfigPanel: React.FC<Props> = ({ onConfigUpdate }) => {
  const [config, setConfig] = useState<Config>({
    checkInterval: 30,
    retentionDays: 7,
    sites: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSite, setNewSite] = useState<Site>({
    name: '',
    url: '',
    method: 'GET',
    timeout: 10
  });

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
  };

  const handleUpdateConfig = async () => {
    try {
      setSaving(true);
      await StatusPageService.UpdateConfig(config.checkInterval, config.retentionDays);
      onConfigUpdate();
      alert('Configuración actualizada correctamente');
    } catch (error) {
      console.error('Error updating config:', error);
      alert('Error al actualizar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSite = async () => {
    if (!newSite.name || !newSite.url) {
      alert('Por favor, completa el nombre y URL del sitio');
      return;
    }

    try {
      await StatusPageService.AddSite(newSite.name, newSite.url, newSite.method, newSite.timeout);
      setNewSite({ name: '', url: '', method: 'GET', timeout: 10 });
      setShowAddSite(false);
      loadConfig();
      onConfigUpdate();
      alert('Sitio agregado correctamente');
    } catch (error) {
      console.error('Error adding site:', error);
      alert('Error al agregar el sitio');
    }
  };

  const handleRemoveSite = async (siteName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el sitio "${siteName}"?`)) {
      return;
    }

    try {
      await StatusPageService.RemoveSite(siteName);
      loadConfig();
      onConfigUpdate();
      alert('Sitio eliminado correctamente');
    } catch (error) {
      console.error('Error removing site:', error);
      alert('Error al eliminar el sitio');
    }
  };

  if (loading) {
    return (
      <div className="config-loading">
        <div className="loading-spinner"></div>
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="config-panel">
      <div className="config-section">
        <h2>Configuración General</h2>
        <div className="config-form">
          <div className="form-group">
            <label htmlFor="checkInterval">Intervalo de verificación (segundos):</label>
            <input
              type="number"
              id="checkInterval"
              min="10"
              value={config.checkInterval}
              onChange={(e) => setConfig({ ...config, checkInterval: parseInt(e.target.value) || 30 })}
            />
            <small>Tiempo entre verificaciones automáticas (mínimo 10 segundos)</small>
          </div>

          <div className="form-group">
            <label htmlFor="retentionDays">Días de retención de datos:</label>
            <input
              type="number"
              id="retentionDays"
              min="1"
              value={config.retentionDays}
              onChange={(e) => setConfig({ ...config, retentionDays: parseInt(e.target.value) || 7 })}
            />
            <small>Cuántos días mantener el historial de verificaciones</small>
          </div>

          <button 
            className="save-config-btn"
            onClick={handleUpdateConfig}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>

      <div className="config-section">
        <div className="section-header">
          <h2>Sitios Monitoreados</h2>
          <button 
            className="add-site-btn"
            onClick={() => setShowAddSite(true)}
          >
            ➕ Agregar Sitio
          </button>
        </div>

        {showAddSite && (
          <div className="add-site-form">
            <h3>Nuevo Sitio</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="siteName">Nombre:</label>
                <input
                  type="text"
                  id="siteName"
                  placeholder="Ej: Mi Sitio Web"
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="siteUrl">URL:</label>
                <input
                  type="url"
                  id="siteUrl"
                  placeholder="https://ejemplo.com"
                  value={newSite.url}
                  onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="siteMethod">Método HTTP:</label>
                <select
                  id="siteMethod"
                  value={newSite.method}
                  onChange={(e) => setNewSite({ ...newSite, method: e.target.value })}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="HEAD">HEAD</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="siteTimeout">Timeout (segundos):</label>
                <input
                  type="number"
                  id="siteTimeout"
                  min="1"
                  max="300"
                  value={newSite.timeout}
                  onChange={(e) => setNewSite({ ...newSite, timeout: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowAddSite(false)}>
                Cancelar
              </button>
              <button className="add-btn" onClick={handleAddSite}>
                Agregar Sitio
              </button>
            </div>
          </div>
        )}

        <div className="sites-list">
          {config.sites.map((site, index) => (
            <div key={index} className="site-item">
              <div className="site-info">
                <h4>{site.name}</h4>
                <p className="site-url">{site.url}</p>
                <div className="site-details">
                  <span className="method-badge">{site.method}</span>
                  <span className="timeout-info">Timeout: {site.timeout}s</span>
                </div>
              </div>
              <button 
                className="remove-site-btn"
                onClick={() => handleRemoveSite(site.name)}
                title="Eliminar sitio"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {config.sites.length === 0 && (
          <div className="empty-sites">
            <div className="empty-icon">🌐</div>
            <p>No hay sitios configurados</p>
            <p>Agrega un sitio para comenzar el monitoreo</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;
