#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
#include <DHT.h>

#define DHTPIN 4          // D4
#define DHTTYPE DHT22

#define SOUND_PIN 34      // D34
#define CURRENT_PIN 35    // D35 (ACS712-30A OUT)
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

// ---------- Current (Kalman, drift-compensated) ----------
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

#define ACS712_SENS_MV_PER_A   66.0f   
#define OVERSAMPLE_N            64
#define MEDIAN_WINDOW            7
#define MAD_K                    4.0f
#define MAD_FLOOR_MV             0.5f

float Q_current = 0.00090f;      // process noise: real current (A^2) - large, moves fast
float Q_bias     = 0.0000004f;   // process noise: bias (A^2) - tiny, moves slowly
float R_meas     = 0.0009f;      // measurement noise (A^2), auto-estimated at boot

const float MAX_BIAS_DRIFT_RATE_A_PER_S = 0.00030f; // ~0.018 A/min max creep

float zeroOffsetMv = 2500.0f; // Calibrated zero-current voltage in mV
float x_current = 0.0f;     // Kalman state: estimated true current (A)
float x_bias    = 0.0f;     // Reserved
float P[2][2]   = {{0.01f, 0}, {0, 0.0001f}};

float medianBuf[MEDIAN_WINDOW];
int   medianIdx = 0;
bool  medianFull = false;

unsigned long lastKalmanTime = 0;

float readOversampledMilliVolts()
{
    uint32_t acc = 0;
    for (int i = 0; i < OVERSAMPLE_N; i++)
    {
        acc += analogReadMilliVolts(CURRENT_PIN);
    }
    return (float)acc / OVERSAMPLE_N;
}

float getMedian(float *buf, int n)
{
    float tmp[MEDIAN_WINDOW];
    memcpy(tmp, buf, n * sizeof(float));
    for (int i = 1; i < n; i++)
    {
        float key = tmp[i];
        int j = i - 1;
        while (j >= 0 && tmp[j] > key) { tmp[j + 1] = tmp[j]; j--; }
        tmp[j + 1] = key;
    }
    return tmp[n / 2];
}

float getMAD(float *buf, int n, float median)
{
    float dev[MEDIAN_WINDOW];
    for (int i = 0; i < n; i++) dev[i] = fabsf(buf[i] - median);
    return getMedian(dev, n);
}

float filterOutlier(float rawMv)
{
    medianBuf[medianIdx] = rawMv;
    medianIdx = (medianIdx + 1) % MEDIAN_WINDOW;
    if (medianIdx == 0) medianFull = true;

    int n = medianFull ? MEDIAN_WINDOW : medianIdx;
    if (n < 3) return rawMv;

    float med = getMedian(medianBuf, n);
    float mad = getMAD(medianBuf, n, med);
    if (mad < MAD_FLOOR_MV) mad = MAD_FLOOR_MV;

    if (fabsf(rawMv - med) > MAD_K * mad) return med;
    return rawMv;
}

void kalmanUpdate(float z_measured_current, float dt)
{
    float P00 = P[0][0] + Q_current;
    float y = z_measured_current - x_current;
    float S = P00 + R_meas;
    if (S < 1e-9f) S = 1e-9f;

    float K0 = P00 / S;
    x_current += K0 * y;
    P[0][0] = (1.0f - K0) * P00;
}

void calibrateZeroAndNoise()
{
    Serial.println("Calibrating current sensor zero offset (ensure motor is OFF)...");
    const int N = 500;
    float sumMv = 0;
    float samplesMv[N];

    for (int i = 0; i < N; i++)
    {
        float mv = readOversampledMilliVolts();
        samplesMv[i] = mv;
        sumMv += mv;
        delay(2);
    }

    float meanMv = sumMv / N;
    zeroOffsetMv = meanMv; // Store exact zero-current baseline voltage (mV)

    float varAcc = 0;
    for (int i = 0; i < N; i++)
    {
        float d_A = (samplesMv[i] - meanMv) / ACS712_SENS_MV_PER_A;
        varAcc += d_A * d_A;
    }
    float variance = varAcc / N;

    x_current = 0.0f;
    x_bias = 0.0f;
    R_meas = max(variance, 0.00005f);

    Serial.printf("Calibrated Zero Offset: %.2f mV | Noise Var: %.6f A^2\n", zeroOffsetMv, R_meas);
}

float updateCurrentReading()
{
    unsigned long now = millis();
    float dt = (now - lastKalmanTime) / 1000.0f;
    if (dt <= 0) dt = 0.01f;
    lastKalmanTime = now;

    float rawMv = readOversampledMilliVolts();
    float cleanMv = filterOutlier(rawMv);
    
    // Subtract calibrated zero-current voltage
    float rawCurrent = (cleanMv - zeroOffsetMv) / ACS712_SENS_MV_PER_A;

    // Small deadband to clear idle micro noise
    if (fabsf(rawCurrent) < 0.08f)
    {
        rawCurrent = 0.0f;
    }

    kalmanUpdate(rawCurrent, dt);

    // Current magnitude cannot be negative for AC/DC load monitoring
    if (x_current < 0.0f) x_current = 0.0f;

    return x_current;
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
    lastKalmanTime = millis();

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

    // ADXL345 16G Non-Full-Res scale normalization
    if (fabsf(ay) > 16.0f) ay = ay / 32.0f;
    if (fabsf(ax) > 16.0f) ax = ax / 32.0f;
    if (fabsf(az) > 16.0f) az = az / 32.0f;

    // ---------- Sound ----------
    soundValue = analogRead(SOUND_PIN);

    // ---------- Current (drift-compensated) & Voltage ----------
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

    Serial.print("Bias(diag)  : ");
    Serial.print(x_bias, 4);
    Serial.println(" A");

    Serial.print("Sound ADC   : ");
    Serial.println(soundValue);

    Serial.println("===============================");

    delay(1000);
}
