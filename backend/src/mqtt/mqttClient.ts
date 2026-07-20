import mqtt, { MqttClient } from 'mqtt';
import { env } from '../config/env';
import { IngestionService } from '../services/IngestionService';
import { logger } from '../utils/logger';

let client: MqttClient | null = null;

export function initMQTTClient(): MqttClient {
  if (client) return client;

  logger.info(`🔌 Connecting to MQTT Broker: ${env.MQTT_URL}...`);

  client = mqtt.connect(env.MQTT_URL, {
    clientId: `${env.MQTT_CLIENT_ID}_${Math.random().toString(16).substring(2, 8)}`,
    clean: true,
    reconnectPeriod: 5000, // Auto-reconnect every 5 seconds on disconnect
    connectTimeout: 10000,
    rejectUnauthorized: false,
  });

  client.on('connect', () => {
    logger.info(`✅ Connected to MQTT Broker at ${env.MQTT_URL}`);

    // Subscribe to all company/device telemetry topics: company/{companyId}/device/{deviceId}
    const topicFilter = 'company/+/device/+';
    client?.subscribe(topicFilter, { qos: 1 }, (err) => {
      if (err) {
        logger.error(`Failed to subscribe to MQTT topic pattern ${topicFilter}:`, err);
      } else {
        logger.info(`📡 Subscribed to MQTT topic pattern: ${topicFilter}`);
      }
    });
  });

  client.on('message', (topic: string, message: Buffer) => {
    IngestionService.processMQTTMessage(topic, message).catch((err) => {
      logger.error(`Error processing MQTT message on topic ${topic}:`, err);
    });
  });

  client.on('reconnect', () => {
    logger.warn('🔄 Reconnecting to MQTT Broker...');
  });

  client.on('offline', () => {
    logger.warn('⚠️ MQTT Broker is offline');
  });

  client.on('error', (err) => {
    logger.error('❌ MQTT Client Error:', err.message || err);
  });

  return client;
}

export function getMQTTClient(): MqttClient | null {
  return client;
}
