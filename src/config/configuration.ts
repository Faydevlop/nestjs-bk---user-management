import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

// Preload .env
dotenv.config({ path: resolve(process.cwd(), '.env') });

const configFilePath = resolve(process.cwd(), 'config.json');
const configFileData = readFileSync(configFilePath, 'utf8') || '{}';
const configFileJSON = JSON.parse(configFileData) as Record<string, any>;

export interface Config {
  ENVIRONMENT: string;
  PORT: number;
  MONGODB_URI: string;
  DEMO_MONGODB_URI: string;
  SWAGGER_URLS: string;
  CORS_URLS: string;
  ACCESS_TOKEN_EXPIRY: number;
  REFRESH_TOKEN_EXPIRY: number;
  REDIS_URL: string;
  JWT_SECRET: string;
  MAIL_HOST: string;
  MAIL_PORT: number;
  MAIL_USER: string;
  MAIL_PASS: string;
  MAIL_FROM: string;
  TALLY_URL: string;
  ZOHO_CLIENT_ID: string;
  ZOHO_CLIENT_SECRET: string;
  ZOHO_REFRESH_TOKEN: string;
  ZOHO_INVENTORY_REFRESH_TOKEN: string;
  UPLOAD_METHOD: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_ENDPOINT: string;
  AWS_REGION: string;
  S3_BUCKET: string;
}

function getEnvVariable(key: string, mandatory = true): string {
  const value = process.env[key];
  if (!value && mandatory) {
    throw new Error(`Environment variable ${key} is missing.`);
  }
  return value as string;
}

function getConfigVariable(key: string, mandatory = true): string {
  const env = process.env.ENVIRONMENT || 'development';
  const config = (configFileJSON[env] ||
    configFileJSON['development']) as Record<string, string>;
  const value = config[key];
  if (!value && mandatory) {
    throw new Error(
      `Config variable ${key} for environment ${env} is missing.`,
    );
  }
  return value;
}

export default () => {
  const configData: Config = {
    ENVIRONMENT: getEnvVariable('ENVIRONMENT', false) || 'development',
    PORT:
      Number(getEnvVariable('PORT', false)) ||
      Number(getConfigVariable('PORT', true)),
    MONGODB_URI:
      getEnvVariable('MONGODB_URI', false) ||
      getEnvVariable('MONGO_URI', false) ||
      getConfigVariable('MONGODB_URI', true),
    DEMO_MONGODB_URI:
      getEnvVariable('DEMO_MONGODB_URI', false) ||
      getConfigVariable('DEMO_MONGODB_URI', false),
    SWAGGER_URLS: getConfigVariable('SWAGGER_URLS', true),
    CORS_URLS:
      getEnvVariable('CORS_URLS', false) ||
      getConfigVariable('CORS_URLS', false) ||
      '',
    ACCESS_TOKEN_EXPIRY:
      parseInt(getConfigVariable('ACCESS_TOKEN_EXPIRY', false)) || 15,
    REFRESH_TOKEN_EXPIRY:
      parseInt(getConfigVariable('REFRESH_TOKEN_EXPIRY', false)) || 365,
    REDIS_URL: getEnvVariable('REDIS_URL', true),
    JWT_SECRET: getEnvVariable('JWT_SECRET', true),
    MAIL_HOST: getEnvVariable('MAIL_HOST', false) || 'smtp.gmail.com',
    MAIL_PORT: Number(getEnvVariable('MAIL_PORT', false)) || 587,
    MAIL_USER: getEnvVariable('MAIL_USER', true),
    MAIL_PASS: getEnvVariable('MAIL_PASS', true),
    MAIL_FROM: getEnvVariable('MAIL_FROM', true),
    TALLY_URL: getEnvVariable('TALLY_URL', true),
    ZOHO_CLIENT_ID: getEnvVariable('ZOHO_CLIENT_ID', true),
    ZOHO_CLIENT_SECRET: getEnvVariable('ZOHO_CLIENT_SECRET', true),
    ZOHO_REFRESH_TOKEN: getEnvVariable('ZOHO_REFRESH_TOKEN', true),
    ZOHO_INVENTORY_REFRESH_TOKEN: getEnvVariable(
      'ZOHO_INVENTORY_REFRESH_TOKEN',
      true,
    ),
    UPLOAD_METHOD: getEnvVariable('UPLOAD_METHOD', false) || 'env',
    AWS_ACCESS_KEY_ID: getEnvVariable('AWS_ACCESS_KEY_ID', false) || '',
    AWS_SECRET_ACCESS_KEY: getEnvVariable('AWS_SECRET_ACCESS_KEY', false) || '',
    AWS_ENDPOINT: getEnvVariable('AWS_ENDPOINT', true),
    AWS_REGION: getEnvVariable('AWS_REGION', true),
    S3_BUCKET: getEnvVariable('S3_BUCKET', true),
  };

  return configData;
};
