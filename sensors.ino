#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
#include <DHT.h>

#define DHTPIN 4          // D4
#define DHTTYPE DHT22

#define SOUND_PIN 34      // D34
#define CURRENT_PIN 35    // D35 (ACS712 OUT)
#define VOLTAGE_PIN 32    // D32
#define RPM_PIN 27        // D27

DHT dht(DHTPIN, DHTTYPE);
Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);

// ---------- RPM ----------
volatile unsigned long pulses = 0;
unsigned long lastRPMTime = 0;
float rpm = 0;

#define PULSES_PER_REV 1

// ---------- Voltage ----------
float voltage = 0;

// ---------- Current (RMS + Auto-Calibrated) ----------
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

#define ACS712_SENS_MV_PER_A   66.0f   // 66 mV/A for 30A model (use 100.0f for 20A, 185.0f for 5A)

// Calibration Constants
float zeroADC = 2048.0f;
float zeroMilliVolts = 1650.0f;
float currentFiltered = 0.0f;

float readRawADC()
{
    uint32_t acc = 0;
    for (int i = 0; i < 64; i++)
    {
        acc += analogRead(CURRENT_PIN);
    }
    return (float)acc / 64.0f;
}

void calibrateZeroAndNoise()
{
    Serial.println();
    Serial.println("==========================================");
    Serial.println(" 🔧 Calibrating Current Sensor (ACS712)... ");
    Serial.println(" ⚠️ Ensure load/motor is OFF during boot ");
    Serial.println("==========================================");

    double accADC = 0;
    const int SAMPLES = 1000;

    for (int i = 0; i < SAMPLES; i++)
    {
        accADC += readRawADC();
        if (i % 250 == 0)
        {
            Serial.printf(" Calibrating... %d%%\n", (i * 100) / SAMPLES);
        }
        delay(2);
    }

    zeroADC = (float)(accADC / SAMPLES);
    zeroMilliVolts = (zeroADC / 4095.0f) * 3300.0f;
    currentFiltered = 0.0f;

    Serial.println("==========================================");
    Serial.printf(" ✅ Calibration Complete!\n");
    Serial.printf("   Zero Baseline ADC : %.2f / 4095\n", zeroADC);
    Serial.printf("   Zero Baseline mV  : %.2f mV\n", zeroMilliVolts);
    Serial.println("==========================================\n");
}

float updateCurrentReading()
{
    // Sample ACS712 over an 80ms window (~4-5 full 50Hz/60Hz AC cycles or DC RMS)
    unsigned long start = millis();
    double sumSqDiffMv = 0;
    int samples = 0;

    while (millis() - start < 80)
    {
        float currentADC = readRawADC();
        float currentMv = (currentADC / 4095.0f) * 3300.0f;
        float diffMv = currentMv - zeroMilliVolts;

        sumSqDiffMv += (diffMv * diffMv);
        samples++;
        delayMicroseconds(300);
    }

    if (samples == 0) return currentFiltered;

    float rmsMv = sqrt(sumSqDiffMv / samples);
    float rawCurrentA = rmsMv / ACS712_SENS_MV_PER_A;

    // Filter small noise under 15 mA (0.015 A)
    if (rawCurrentA < 0.015f)
    {
        rawCurrentA = 0.0f;
    }

    // Smooth output using responsive Alpha Filter (25% new, 75% old)
    currentFiltered = (0.75f * currentFiltered) + (0.25f * rawCurrentA);

    if (currentFiltered < 0.01f)
    {
        currentFiltered = 0.0f;
    }

    return currentFiltered;
}

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

    // Common 0-25V module (5:1 divider)
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

    analogReadResolution(12);
    analogSetPinAttenuation(CURRENT_PIN, ADC_11db);

    pinMode(RPM_PIN, INPUT_PULLUP);

    attachInterrupt(
        digitalPinToInterrupt(RPM_PIN),
        countPulse,
        FALLING
    );

    lastRPMTime = millis();

    delay(1000);
    calibrateZeroAndNoise();

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

    // ADXL345 16G Non-Full-Res scale normalization
    if (fabsf(ay) > 16.0f) ay = ay / 32.0f;
    if (fabsf(ax) > 16.0f) ax = ax / 32.0f;
    if (fabsf(az) > 16.0f) az = az / 32.0f;

    // ---------- Sound ----------
    soundValue = analogRead(SOUND_PIN);

    // ---------- Current (RMS) & Voltage ----------
    current = updateCurrentReading();
    voltage = readVoltage();

    // ---------- RPM ----------
    if (millis() - lastRPMTime >= 5000)
    {
        noInterrupts();
        unsigned long count = pulses;
        pulses = 0;
        interrupts();

        rpm = (count / (float)PULSES_PER_REV) * (60.0 / 5.0);
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
    Serial.print(current, 3);
    Serial.println(" A");

    Serial.print("Zero MV     : ");
    Serial.print(zeroMilliVolts, 1);
    Serial.println(" mV");

    Serial.print("Sound ADC   : ");
    Serial.println(soundValue);

    Serial.println("===============================");

    delay(1000);
}
