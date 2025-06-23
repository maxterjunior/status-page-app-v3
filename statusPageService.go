package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"

	_ "modernc.org/sqlite"
)

type Config struct {
	CheckInterval int    `json:"checkInterval"` // intervalo en segundos
	RetentionDays int    `json:"retentionDays"` // días de retención de datos
	Sites         []Site `json:"sites"`
}

type Site struct {
	Name    string `json:"name"`
	URL     string `json:"url"`
	Method  string `json:"method"`
	Timeout int    `json:"timeout"`
}

type StatusCheck struct {
	ID           int       `json:"id"`
	SiteName     string    `json:"siteName"`
	SiteURL      string    `json:"siteUrl"`
	Status       string    `json:"status"` // "up", "down"
	StatusCode   int       `json:"statusCode"`
	ResponseTime int64     `json:"responseTime"` // en milisegundos
	CheckedAt    time.Time `json:"checkedAt"`
	ErrorMessage string    `json:"errorMessage,omitempty"`
}

type SiteDetail struct {
	Name         string    `json:"name"`
	URL          string    `json:"url"`
	Method       string    `json:"method"`
	Timeout      int       `json:"timeout"`
	Status       string    `json:"status,omitempty"`
	StatusCode   int       `json:"statusCode,omitempty"`
	ResponseTime int64     `json:"responseTime,omitempty"`
	LastChecked  time.Time `json:"lastChecked,omitempty"`
	ErrorMessage string    `json:"errorMessage,omitempty"`
	IsActive     bool      `json:"isActive"`
}

type SiteStats struct {
	SiteName        string  `json:"siteName"`
	TotalChecks     int     `json:"totalChecks"`
	UpChecks        int     `json:"upChecks"`
	DownChecks      int     `json:"downChecks"`
	UptimePercent   float64 `json:"uptimePercent"`
	AvgResponseTime float64 `json:"avgResponseTime"`
}

type StatusPageService struct {
	db     *sql.DB
	config Config
	ctx    context.Context
}

func NewStatusPageService() *StatusPageService {
	service := &StatusPageService{}

	// Cargar configuración
	if err := service.loadConfig(); err != nil {
		log.Fatal("Error cargando configuración:", err)
	}

	// Inicializar base de datos
	if err := service.initDB(); err != nil {
		log.Fatal("Error inicializando base de datos:", err)
	}

	return service
}

func (s *StatusPageService) Start(ctx context.Context) {
	s.ctx = ctx
	log.Println("Iniciando servicio de monitoreo...")

	// Iniciar monitoreo en background
	go s.startMonitoring()
}

func (s *StatusPageService) loadConfig() error {
	// Crear configuración por defecto si no existe
	defaultConfig := Config{
		CheckInterval: 30,
		RetentionDays: 7,
		Sites: []Site{
			{
				Name:    "Google",
				URL:     "https://google.com",
				Method:  "GET",
				Timeout: 10,
			},
			{
				Name:    "GitHub",
				URL:     "https://github.com",
				Method:  "GET",
				Timeout: 10,
			},
		},
	}

	file, err := os.Open("config.json")
	if err != nil {
		// Si no existe el archivo, crear uno por defecto
		log.Println("Archivo config.json no encontrado, creando configuración por defecto...")
		s.config = defaultConfig
		return s.saveConfig()
	}
	defer file.Close()

	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		return err
	}

	err = json.Unmarshal(bytes, &s.config)
	if err != nil {
		return err
	}

	// Validar configuración
	if s.config.CheckInterval <= 0 {
		s.config.CheckInterval = 30
		log.Println("CheckInterval inválido, usando valor por defecto: 30 segundos")
	}

	if s.config.RetentionDays < 0 {
		s.config.RetentionDays = 7
		log.Println("RetentionDays inválido, usando valor por defecto: 7 días")
	}

	// Validar timeout de sitios
	for i := range s.config.Sites {
		if s.config.Sites[i].Timeout <= 0 {
			s.config.Sites[i].Timeout = 10
		}
		if s.config.Sites[i].Method == "" {
			s.config.Sites[i].Method = "GET"
		}
	}

	return nil
}

func (s *StatusPageService) saveConfig() error {
	bytes, err := json.MarshalIndent(s.config, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile("config.json", bytes, 0644)
}

func (s *StatusPageService) initDB() error {
	var err error
	s.db, err = sql.Open("sqlite", "./status.db")
	if err != nil {
		return err
	}

	createTableSQL := `
	CREATE TABLE IF NOT EXISTS status_checks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		site_name TEXT NOT NULL,
		site_url TEXT NOT NULL,
		status TEXT NOT NULL,
		status_code INTEGER,
		response_time INTEGER,
		checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		error_message TEXT
	);
	
	CREATE INDEX IF NOT EXISTS idx_site_name ON status_checks(site_name);
	CREATE INDEX IF NOT EXISTS idx_checked_at ON status_checks(checked_at);
	`

	_, err = s.db.Exec(createTableSQL)
	return err
}

func (s *StatusPageService) startMonitoring() {
	log.Printf("Iniciando monitoreo cada %d segundos", s.config.CheckInterval)
	log.Printf("Retención de datos: %d días", s.config.RetentionDays)

	// Hacer check inicial
	s.checkAllSites()

	// Hacer limpieza inicial
	s.cleanupOldData()

	// Configurar ticker para checks periódicos
	ticker := time.NewTicker(time.Duration(s.config.CheckInterval) * time.Second)
	defer ticker.Stop()

	// Configurar ticker para limpieza diaria
	cleanupTicker := time.NewTicker(24 * time.Hour)
	defer cleanupTicker.Stop()

	for {
		select {
		case <-ticker.C:
			s.checkAllSites()
		case <-cleanupTicker.C:
			s.cleanupOldData()
		case <-s.ctx.Done():
			return
		}
	}
}

func (s *StatusPageService) checkAllSites() {
	for _, site := range s.config.Sites {
		go s.checkSite(site)
	}
}

func (s *StatusPageService) checkSite(site Site) {
	start := time.Now()

	client := &http.Client{
		Timeout: time.Duration(site.Timeout) * time.Second,
	}

	req, err := http.NewRequest(site.Method, site.URL, nil)
	if err != nil {
		s.saveStatusCheck(site, "down", 0, 0, err.Error())
		return
	}

	resp, err := client.Do(req)
	responseTime := time.Since(start).Milliseconds()

	if err != nil {
		s.saveStatusCheck(site, "down", 0, responseTime, err.Error())
		return
	}
	defer resp.Body.Close()

	status := "up"
	if resp.StatusCode >= 400 {
		status = "down"
	}

	s.saveStatusCheck(site, status, resp.StatusCode, responseTime, "")

	// log.Printf("Checked %s: %s (%d) - %dms", site.Name, status, resp.StatusCode, responseTime)
}

func (s *StatusPageService) saveStatusCheck(site Site, status string, statusCode int, responseTime int64, errorMsg string) {
	insertSQL := `
	INSERT INTO status_checks (site_name, site_url, status, status_code, response_time, error_message)
	VALUES (?, ?, ?, ?, ?, ?)
	`

	_, err := s.db.Exec(insertSQL, site.Name, site.URL, status, statusCode, responseTime, errorMsg)
	if err != nil {
		log.Printf("Error guardando status check: %v", err)
	}
}

func (s *StatusPageService) cleanupOldData() {
	if s.config.RetentionDays <= 0 {
		log.Println("Limpieza deshabilitada (retentionDays <= 0)")
		return
	}

	cutoffDate := time.Now().AddDate(0, 0, -s.config.RetentionDays)

	deleteSQL := `DELETE FROM status_checks WHERE checked_at < ?`

	result, err := s.db.Exec(deleteSQL, cutoffDate)
	if err != nil {
		log.Printf("Error durante limpieza de datos antiguos: %v", err)
		return
	}

	rowsDeleted, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error obteniendo filas afectadas durante limpieza: %v", err)
		return
	}

	if rowsDeleted > 0 {
		log.Printf("Limpieza completada: %d registros eliminados (más antiguos que %d días)",
			rowsDeleted, s.config.RetentionDays)
	}
}

// Métodos expuestos al frontend
func (s *StatusPageService) GetAllStatus() ([]StatusCheck, error) {
	query := `
	SELECT DISTINCT sc1.site_name, sc1.site_url, sc1.status, sc1.status_code, 
		   sc1.response_time, sc1.checked_at, sc1.error_message
	FROM status_checks sc1
	INNER JOIN (
		SELECT site_name, MAX(checked_at) as max_checked_at
		FROM status_checks
		GROUP BY site_name
	) sc2 ON sc1.site_name = sc2.site_name AND sc1.checked_at = sc2.max_checked_at
	ORDER BY sc1.site_name
	`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var checks []StatusCheck
	for rows.Next() {
		var check StatusCheck
		err := rows.Scan(&check.SiteName, &check.SiteURL, &check.Status,
			&check.StatusCode, &check.ResponseTime, &check.CheckedAt,
			&check.ErrorMessage)
		if err != nil {
			return nil, err
		}
		checks = append(checks, check)
	}

	return checks, nil
}

func (s *StatusPageService) GetSiteStatus(siteName string) ([]StatusCheck, error) {
	query := `
	SELECT site_name, site_url, status, status_code, response_time, checked_at, error_message
	FROM status_checks
	WHERE site_name = ?
	ORDER BY checked_at DESC
	LIMIT 50
	`

	rows, err := s.db.Query(query, siteName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var checks []StatusCheck
	for rows.Next() {
		var check StatusCheck
		err := rows.Scan(&check.SiteName, &check.SiteURL, &check.Status,
			&check.StatusCode, &check.ResponseTime, &check.CheckedAt,
			&check.ErrorMessage)
		if err != nil {
			return nil, err
		}
		checks = append(checks, check)
	}

	return checks, nil
}

func (s *StatusPageService) GetAllSites() ([]SiteDetail, error) {
	var sites []SiteDetail

	for _, site := range s.config.Sites {
		detail := SiteDetail{
			Name:     site.Name,
			URL:      site.URL,
			Method:   site.Method,
			Timeout:  site.Timeout,
			IsActive: true,
		}

		query := `
		SELECT status, status_code, response_time, checked_at, error_message
		FROM status_checks
		WHERE site_name = ?
		ORDER BY checked_at DESC
		LIMIT 1
		`

		var checkedAtStr sql.NullString
		err := s.db.QueryRow(query, site.Name).Scan(
			&detail.Status, &detail.StatusCode, &detail.ResponseTime,
			&checkedAtStr, &detail.ErrorMessage)

		if err != nil && err != sql.ErrNoRows {
			log.Printf("Error obteniendo último status para %s: %v", site.Name, err)
		} else if err == sql.ErrNoRows {
			detail.Status = "unknown"
		} else {
			if checkedAtStr.Valid {
				detail.LastChecked, _ = time.Parse("2006-01-02 15:04:05", checkedAtStr.String)
			}
		}

		sites = append(sites, detail)
	}

	return sites, nil
}

func (s *StatusPageService) GetStats() (map[string]interface{}, error) {
	var totalRecords int
	var oldestRecord, newestRecord time.Time

	err := s.db.QueryRow("SELECT COUNT(*) FROM status_checks").Scan(&totalRecords)
	if err != nil {
		return nil, err
	}

	var oldestStr, newestStr sql.NullString
	err = s.db.QueryRow("SELECT MIN(checked_at), MAX(checked_at) FROM status_checks").Scan(&oldestStr, &newestStr)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	if oldestStr.Valid {
		oldestRecord, _ = time.Parse("2006-01-02 15:04:05", oldestStr.String)
	}
	if newestStr.Valid {
		newestRecord, _ = time.Parse("2006-01-02 15:04:05", newestStr.String)
	}

	siteStatsQuery := `
	SELECT site_name, COUNT(*) as total_checks,
		   SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_checks,
		   SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) as down_checks,
		   AVG(response_time) as avg_response_time
	FROM status_checks
	GROUP BY site_name
	ORDER BY site_name
	`

	rows, err := s.db.Query(siteStatsQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var siteStats []SiteStats
	for rows.Next() {
		var stats SiteStats
		err := rows.Scan(&stats.SiteName, &stats.TotalChecks, &stats.UpChecks,
			&stats.DownChecks, &stats.AvgResponseTime)
		if err != nil {
			return nil, err
		}

		if stats.TotalChecks > 0 {
			stats.UptimePercent = float64(stats.UpChecks) / float64(stats.TotalChecks) * 100
		}

		siteStats = append(siteStats, stats)
	}

	response := map[string]interface{}{
		"totalRecords":  totalRecords,
		"oldestRecord":  oldestRecord,
		"newestRecord":  newestRecord,
		"retentionDays": s.config.RetentionDays,
		"checkInterval": s.config.CheckInterval,
		"siteStats":     siteStats,
		"generatedAt":   time.Now(),
	}

	return response, nil
}

func (s *StatusPageService) GetConfig() Config {
	return s.config
}

func (s *StatusPageService) AddSite(name, url, method string, timeout int) error {
	newSite := Site{
		Name:    name,
		URL:     url,
		Method:  method,
		Timeout: timeout,
	}

	s.config.Sites = append(s.config.Sites, newSite)
	return s.saveConfig()
}

func (s *StatusPageService) RemoveSite(name string) error {
	for i, site := range s.config.Sites {
		if site.Name == name {
			s.config.Sites = append(s.config.Sites[:i], s.config.Sites[i+1:]...)
			return s.saveConfig()
		}
	}
	return nil
}

func (s *StatusPageService) UpdateConfig(checkInterval, retentionDays int) error {
	s.config.CheckInterval = checkInterval
	s.config.RetentionDays = retentionDays
	return s.saveConfig()
}

func (s *StatusPageService) ManualCheck(siteName string) error {
	for _, site := range s.config.Sites {
		if site.Name == siteName {
			go s.checkSite(site)
			return nil
		}
	}
	return nil
}
