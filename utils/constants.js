export const IS_PRODUCTION = false;

export const DOMAIN_TYPE = IS_PRODUCTION ? 'production' : 'test';

export const BASE_URL = `https://webtracker${IS_PRODUCTION ? 'prod' : ''}.infoware.xyz`;

export const API_BASE_URL = `${BASE_URL}/api`;

export const TRACKER_VERSION = '1.1.6';

export const DEFAULT_SCREENSHOT_TYPE = 'SCREENSHOT';

// Reload time spans

export const UPDATE_CHECKER_TIME = 30 * 60 * 1000;
export const REFRESH_CALL_TIME = 30 * 60 * 1000;
export const APP_OFFLINE_SWITCH_INTERVAL = 15 * 60 * 1000;
