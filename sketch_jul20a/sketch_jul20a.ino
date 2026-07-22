#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
#include <DHT.h>

#define DHTPIN 4          // D4
#define DHTTYPE DHT22

#define SOUND_PIN 34      // D34
#define CURRENT_PIN 35    // D35
#define VOLTAGE_PIN 32    // D32
#define RPM_PIN 27        // D27

DHT dht(DHTPIN, DHTTYPE);
Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);

// ---------- RPM ----------
volatile unsigned long pulses = 0;
unsigned long lastRPMTime = 0;
float rpm = 0;

// ---------- Voltage ----------
float voltage = 0;

// ---------- Current ----------
float current = 0;

// ---------- Sound ----------
int soundValue = 0;

// ---------- DHT ----------
float temperature = 0;
float humidity = 0;

// ---------- ADXL345 ----------
float ax = 0;
float ay = 0;
float az = 0;

void IRAM_ATTR countPulse()
{
    pulses++;
}

// ---------- Helper Functions ----------

// Average the current sensor readings
float readCurrent()
{
    long sum = 0;

    for (int i = 0; i < 100; i++)
    {
        sum += analogRead(CURRENT_PIN);
        delay(2);
    }

    float adc = sum / 100.0;

    float sensorVoltage = adc * (3.3 / 4095.0);

    // Initial calibration (adjust if needed)
    float current = (sensorVoltage - 2.5) / 0.100;

    if (current < 0.05 && current > -0.05)
        current = 0;

    return current;
}

// Average voltage readings
float readVoltage()
{
    long sum = 0;

    for (int i = 0; i < 20; i++)
    {
        sum += analogRead(VOLTAGE_PIN);
        delay(2);
    }

    float adc = sum / 20.0;

    float sensorVoltage = adc * (3.3 / 4095.0);

    // Common 0-25V module
    return sensorVoltage * 5.0;
}

void setup()
{
    Serial.begin(115200);

    dht.begin();

    Wire.begin(21, 22);   // SDA=D21, SCL=D22

    if (!accel.begin())
    {
        Serial.println("ADXL345 NOT FOUND!");
        while (1);
    }

    accel.setRange(ADXL345_RANGE_16_G);

    pinMode(SOUND_PIN, INPUT);
    pinMode(CURRENT_PIN, INPUT);
    pinMode(VOLTAGE_PIN, INPUT);

    pinMode(RPM_PIN, INPUT_PULLUP);

    attachInterrupt(
        digitalPinToInterrupt(RPM_PIN),
        countPulse,
        FALLING
    );

    lastRPMTime = millis();

    Serial.println();
    Serial.println("==============================");
    Serial.println(" SentinelX Started ");
    Serial.println("==============================");
}

void loop()
{
    // ---------- DHT22 ----------
    temperature = dht.readTemperature();
    humidity = dht.readHumidity();

    // ---------- ADXL345 ----------
    sensors_event_t event;
    accel.getEvent(&event);

    ax = event.acceleration.x / 9.81;
    ay = event.acceleration.y / 9.81;
    az = event.acceleration.z / 9.81;

    // ---------- Sound ----------
    soundValue = analogRead(SOUND_PIN);

    // ---------- Current & Voltage (averaged) ----------
    current = readCurrent();
    voltage = readVoltage();

    // ---------- RPM ----------
    if (millis() - lastRPMTime >= 5000)
    {
        noInterrupts();
        unsigned long count = pulses;
        pulses = 0;
        interrupts();

        rpm = (count * 60.0) / 5.0;
        lastRPMTime += 5000;
    }

    // ---------- Serial Output ----------
    Serial.println();
    Serial.println("=========== SentinelX ===========");

    Serial.print("Temperature : ");
    Serial.print(temperature);
    Serial.println(" C");

    Serial.print("Humidity    : ");
    Serial.print(humidity);
    Serial.println(" %");

    Serial.println();

    Serial.println("Acceleration (g)");

    Serial.print("X : ");
    Serial.println(ax, 2);

    Serial.print("Y : ");
    Serial.println(ay, 2);

    Serial.print("Z : ");
    Serial.println(az, 2);

    Serial.println();

    Serial.print("RPM         : ");
    Serial.println(rpm);

    Serial.print("Voltage     : ");
    Serial.print(voltage, 2);
    Serial.println(" V");

    Serial.print("Current     : ");
    Serial.print(current, 2);
    Serial.println(" A");

    Serial.print("Sound ADC   : ");
    Serial.println(soundValue);

    Serial.println("===============================");

    delay(1000);
}