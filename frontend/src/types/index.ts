export interface StatusCheck {
    id: number;
    siteName: string;
    siteUrl: string;
    status: string;
    statusCode: number;
    responseTime: number;
    checkedAt: string;
    errorMessage?: string;
}

export interface DailyStats {
    date: string;
    totalChecks: number;
    upChecks: number;
    downChecks: number;
    uptimePercent: number;
}

export interface SiteStatusDetail {
    siteName: string;
    siteUrl: string;
    lastStatus: string;
    lastStatusCode: number;
    lastResponseTime: number;
    lastChecked: string;
    lastErrorMessage?: string;
    dailyStats: DailyStats[];
    totalStats: DailyStats;
}

export interface SiteDetail {
    name: string;
    url: string;
    method: string;
    timeout: number;
    status?: string;
    statusCode?: number;
    responseTime?: number;
    lastChecked?: string;
    errorMessage?: string;
    isActive: boolean;
}

export interface Config {
    checkInterval: number;
    retentionDays: number;
    sites: Site[];
}

export interface Site {
    name: string;
    url: string;
    method: string;
    timeout: number;
}
