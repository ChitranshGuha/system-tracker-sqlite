export const IS_PRODUCTION = false;

export const DOMAIN_TYPE = IS_PRODUCTION ? 'production' : 'test';

export const BASE_URL = `https://webtracker${IS_PRODUCTION ? 'prod' : ''}.infoware.xyz`;

export const API_BASE_URL = `${BASE_URL}/api`;

export const TRACKER_VERSION = '1.0.6';
