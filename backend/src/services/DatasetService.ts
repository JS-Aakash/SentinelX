import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset, IDataset, IValidationReport, ICleaningLog } from '../models/Dataset';
import { Machine } from '../models/Machine';
import { ApiError } from '../utils/ApiError';

export interface StandardDataRow {
  Timestamp: string;
  Temperature: number | null;
  Vibration: number | null;
  Current: number | null;
  Voltage: number | null;
  RPM: number | null;
  Sound: number | null;
}

export class DatasetService {
  public static REQUIRED_COLUMNS = [
    'Timestamp',
    'Temperature',
    'Vibration',
    'Current',
    'Voltage',
    'RPM',
    'Sound',
  ];

  /**
   * Parse uploaded CSV or Excel file into array of raw objects
   */
  public static async parseUploadedFile(filePath: string): Promise<Record<string, any>[]> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(filePath);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_json(worksheet, { raw: false });
    }

    // CSV Parsing
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    return (parseResult.data as Record<string, any>[]) || [];
  }

  /**
   * Validate dataset headers and row integrity
   */
  public static validateRawRows(rows: Record<string, any>[]): {
    isValid: boolean;
    report: IValidationReport;
    startDate: Date | null;
    endDate: Date | null;
    samplingInterval: string | null;
  } {
    if (!rows || rows.length === 0) {
      throw ApiError.badRequest('Dataset is empty. Please upload a file with data rows.');
    }

    // Check headers
    const sampleRow = rows[0];
    const presentKeys = Object.keys(sampleRow).map((k) => k.trim());
    const lowerKeys = presentKeys.map((k) => k.toLowerCase());

    const missingColumns: string[] = [];
    const keyMap: Record<string, string> = {};

    for (const reqCol of this.REQUIRED_COLUMNS) {
      const idx = lowerKeys.indexOf(reqCol.toLowerCase());
      if (idx === -1) {
        missingColumns.push(reqCol);
      } else {
        keyMap[reqCol] = presentKeys[idx];
      }
    }

    if (missingColumns.length > 0) {
      throw ApiError.badRequest(
        `Invalid dataset columns. Missing required column(s): ${missingColumns.join(', ')}. Expected columns: ${this.REQUIRED_COLUMNS.join(', ')}`
      );
    }

    let validRows = 0;
    let duplicateRows = 0;
    let missingValues = 0;
    let invalidValues = 0;
    let rejectedRows = 0;
    const errors: string[] = [];

    const timestampMap = new Map<string, number>();
    const validDates: Date[] = [];

    rows.forEach((row, i) => {
      const tsRaw = row[keyMap['Timestamp']];
      const tempRaw = row[keyMap['Temperature']];
      const vibRaw = row[keyMap['Vibration']];
      const curRaw = row[keyMap['Current']];
      const voltRaw = row[keyMap['Voltage']];
      const rpmRaw = row[keyMap['RPM']];
      const soundRaw = row[keyMap['Sound']];

      let rowValid = true;

      // Validate Timestamp
      if (!tsRaw) {
        missingValues++;
        rowValid = false;
      } else {
        const d = new Date(tsRaw);
        if (isNaN(d.getTime())) {
          invalidValues++;
          rowValid = false;
        } else {
          const iso = d.toISOString();
          if (timestampMap.has(iso)) {
            duplicateRows++;
          } else {
            timestampMap.set(iso, 1);
          }
          validDates.push(d);
        }
      }

      // Validate Numeric Sensors
      const checkNum = (val: any, fieldName: string, allowNegative = false) => {
        if (val === undefined || val === null || val === '') {
          missingValues++;
          return false;
        }
        const num = Number(val);
        if (isNaN(num) || !isFinite(num)) {
          invalidValues++;
          return false;
        }
        if (!allowNegative && num < 0) {
          invalidValues++;
          return false;
        }
        return true;
      };

      if (!checkNum(tempRaw, 'Temperature', true)) rowValid = false;
      if (!checkNum(vibRaw, 'Vibration', false)) rowValid = false;
      if (!checkNum(curRaw, 'Current', false)) rowValid = false;
      if (!checkNum(voltRaw, 'Voltage', false)) rowValid = false;
      if (!checkNum(rpmRaw, 'RPM', false)) rowValid = false; // Negative RPM invalid
      if (!checkNum(soundRaw, 'Sound', false)) rowValid = false;

      if (rowValid) {
        validRows++;
      } else {
        rejectedRows++;
      }
    });

    // Sort valid dates to get start/end date and estimate sampling interval
    validDates.sort((a, b) => a.getTime() - b.getTime());
    const startDate = validDates.length > 0 ? validDates[0] : null;
    const endDate = validDates.length > 0 ? validDates[validDates.length - 1] : null;

    let samplingInterval: string | null = null;
    if (validDates.length >= 2) {
      const diffMs = Math.abs(validDates[1].getTime() - validDates[0].getTime());
      const sec = Math.round(diffMs / 1000);
      if (sec < 60) samplingInterval = `${sec}s`;
      else samplingInterval = `${Math.round(sec / 60)}m`;
    }

    const report: IValidationReport = {
      totalRows: rows.length,
      validRows,
      duplicateRows,
      missingValues,
      invalidValues,
      rejectedRows,
      errors,
    };

    return {
      isValid: true,
      report,
      startDate,
      endDate,
      samplingInterval,
    };
  }

  /**
   * Clean raw dataset (Deduplicate, Interpolate, Sort, Save Cleaned CSV)
   */
  public static async cleanDataset(datasetId: string): Promise<IDataset> {
    const dataset = await Dataset.findById(datasetId).exec();
    if (!dataset) {
      throw ApiError.notFound('Dataset not found');
    }

    const rawRows = await this.parseUploadedFile(dataset.originalFilePath);
    if (!rawRows || rawRows.length === 0) {
      throw ApiError.badRequest('Original file has no data');
    }

    // Standardize key access
    const firstRow = rawRows[0];
    const presentKeys = Object.keys(firstRow).map((k) => k.trim());
    const lowerKeys = presentKeys.map((k) => k.toLowerCase());

    const keyMap: Record<string, string> = {};
    for (const col of this.REQUIRED_COLUMNS) {
      const idx = lowerKeys.indexOf(col.toLowerCase());
      if (idx !== -1) {
        keyMap[col] = presentKeys[idx];
      }
    }

    // 1. Convert to standardized row array
    const parsedRows: Array<{
      time: number;
      isoTime: string;
      temp: number | null;
      vib: number | null;
      cur: number | null;
      volt: number | null;
      rpm: number | null;
      sound: number | null;
    }> = [];

    let rejectedCount = 0;

    rawRows.forEach((r) => {
      const tsVal = r[keyMap['Timestamp']];
      if (!tsVal) {
        rejectedCount++;
        return;
      }
      const dateObj = new Date(tsVal);
      if (isNaN(dateObj.getTime())) {
        rejectedCount++;
        return;
      }

      const getVal = (raw: any, allowNeg = false) => {
        if (raw === undefined || raw === null || raw === '') return null;
        const num = Number(raw);
        if (isNaN(num) || !isFinite(num)) return null;
        if (!allowNeg && num < 0) return null;
        return num;
      };

      parsedRows.push({
        time: dateObj.getTime(),
        isoTime: dateObj.toISOString(),
        temp: getVal(r[keyMap['Temperature']], true),
        vib: getVal(r[keyMap['Vibration']]),
        cur: getVal(r[keyMap['Current']]),
        volt: getVal(r[keyMap['Voltage']]),
        rpm: getVal(r[keyMap['RPM']]),
        sound: getVal(r[keyMap['Sound']]),
      });
    });

    // 2. Sort chronologically by timestamp
    parsedRows.sort((a, b) => a.time - b.time);

    // 3. Remove duplicate timestamps (keep first)
    const seenTimes = new Set<string>();
    const uniqueRows: typeof parsedRows = [];
    let duplicateCount = 0;

    parsedRows.forEach((r) => {
      if (seenTimes.has(r.isoTime)) {
        duplicateCount++;
      } else {
        seenTimes.add(r.isoTime);
        uniqueRows.push(r);
      }
    });

    // 4. Interpolate missing values (Linear interpolation)
    let interpolatedCount = 0;
    const metrics: Array<'temp' | 'vib' | 'cur' | 'volt' | 'rpm' | 'sound'> = [
      'temp',
      'vib',
      'cur',
      'volt',
      'rpm',
      'sound',
    ];

    metrics.forEach((m) => {
      let lastVal: number | null = null;
      for (let i = 0; i < uniqueRows.length; i++) {
        if (uniqueRows[i][m] !== null) {
          lastVal = uniqueRows[i][m];
        } else if (lastVal !== null) {
          // Forward fill if missing
          uniqueRows[i][m] = lastVal;
          interpolatedCount++;
        } else {
          // Find next valid for backward fill
          let nextVal: number | null = null;
          for (let j = i + 1; j < uniqueRows.length; j++) {
            if (uniqueRows[j][m] !== null) {
              nextVal = uniqueRows[j][m];
              break;
            }
          }
          if (nextVal !== null) {
            uniqueRows[i][m] = nextVal;
            interpolatedCount++;
            lastVal = nextVal;
          } else {
            uniqueRows[i][m] = 0; // default safe fallback
          }
        }
      }
    });

    // 5. Build cleaned CSV content
    const cleanedCsvRows = uniqueRows.map((r) => ({
      Timestamp: r.isoTime,
      Temperature: Number(r.temp?.toFixed(2)),
      Vibration: Number(r.vib?.toFixed(3)),
      Current: Number(r.cur?.toFixed(2)),
      Voltage: Number(r.volt?.toFixed(1)),
      RPM: Number(r.rpm?.toFixed(0)),
      Sound: Number(r.sound?.toFixed(1)),
    }));

    const cleanedCsvString = Papa.unparse(cleanedCsvRows);

    const uploadsDir = path.dirname(dataset.originalFilePath);
    const cleanedFileName = `cleaned_${dataset._id.toString()}_${Date.now()}.csv`;
    const cleanedFilePath = path.join(uploadsDir, cleanedFileName);

    fs.writeFileSync(cleanedFilePath, cleanedCsvString, 'utf-8');

    // Update dataset record
    dataset.cleanedFilePath = cleanedFilePath;
    dataset.status = 'cleaned';
    dataset.rowCount = cleanedCsvRows.length;
    dataset.cleaningLog = {
      removedDuplicates: duplicateCount,
      interpolatedRows: interpolatedCount,
      rejectedRows: rejectedCount,
      notes: [
        `Removed ${duplicateCount} duplicate timestamps`,
        `Interpolated ${interpolatedCount} missing sensor readings`,
        `Rejected ${rejectedCount} unusable rows`,
        `Sorted dataset chronologically from ${dataset.startDate?.toISOString()} to ${dataset.endDate?.toISOString()}`,
      ],
      cleanedAt: new Date(),
    };

    await dataset.save();
    return dataset;
  }

  /**
   * Feature Engineering Engine (Lags, Rolling Stats, RoC, Interactions, Threshold Normalization)
   */
  public static async engineerFeatures(datasetId: string): Promise<IDataset> {
    const dataset = await Dataset.findById(datasetId).exec();
    if (!dataset) {
      throw ApiError.notFound('Dataset not found');
    }

    const sourcePath = dataset.cleanedFilePath || dataset.originalFilePath;
    const rawRows = await this.parseUploadedFile(sourcePath);
    if (!rawRows || rawRows.length === 0) {
      throw ApiError.badRequest('No data rows found to engineer features');
    }

    const machine = await Machine.findById(dataset.machineId).exec();
    const limits = machine?.operatingLimits || {};

    const maxTemp = limits.maxTemperature || 80;
    const maxVib = limits.maxVibration || 2.5;
    const maxCur = limits.maxCurrent || 15;
    const minRPM = limits.minRPM || 1000;

    const baseMetrics = ['Temperature', 'Vibration', 'Current', 'Voltage', 'RPM', 'Sound'];

    // Convert to float array
    const cleanData = rawRows.map((r) => ({
      Timestamp: r['Timestamp'] || r['timestamp'],
      Temperature: Number(r['Temperature'] || r['temperature'] || 0),
      Vibration: Number(r['Vibration'] || r['vibration'] || 0),
      Current: Number(r['Current'] || r['current'] || 0),
      Voltage: Number(r['Voltage'] || r['voltage'] || 0),
      RPM: Number(r['RPM'] || r['rpm'] || 0),
      Sound: Number(r['Sound'] || r['sound'] || 0),
    }));

    const engineeredRows: Record<string, any>[] = [];
    const featureNamesSet = new Set<string>();

    for (let i = 0; i < cleanData.length; i++) {
      const curr = cleanData[i];
      const prev = i > 0 ? cleanData[i - 1] : curr;

      const rowOut: Record<string, any> = {
        Timestamp: curr.Timestamp,
        Temperature: curr.Temperature,
        Vibration: curr.Vibration,
        Current: curr.Current,
        Voltage: curr.Voltage,
        RPM: curr.RPM,
        Sound: curr.Sound,
      };

      // 1. Lag Features (Lag 1, 2, 3)
      for (const m of baseMetrics) {
        const val1 = i >= 1 ? cleanData[i - 1][m as keyof typeof curr] : curr[m as keyof typeof curr];
        const val2 = i >= 2 ? cleanData[i - 2][m as keyof typeof curr] : val1;
        const val3 = i >= 3 ? cleanData[i - 3][m as keyof typeof curr] : val2;

        rowOut[`${m}_Lag1`] = val1;
        rowOut[`${m}_Lag2`] = val2;
        rowOut[`${m}_Lag3`] = val3;
        featureNamesSet.add(`${m}_Lag1`);
        featureNamesSet.add(`${m}_Lag2`);
        featureNamesSet.add(`${m}_Lag3`);
      }

      // 2. Rolling Mean & Std Dev (Windows 5, 10, 30)
      const windows = [5, 10, 30];
      for (const w of windows) {
        const slice = cleanData.slice(Math.max(0, i - w + 1), i + 1);
        for (const m of baseMetrics) {
          const vals = slice.map((s) => Number(s[m as keyof typeof curr]));
          const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
          const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
          const std = Math.sqrt(variance);

          rowOut[`${m}_RollMean_${w}`] = Number(mean.toFixed(2));
          rowOut[`${m}_RollStd_${w}`] = Number(std.toFixed(3));
          featureNamesSet.add(`${m}_RollMean_${w}`);
          featureNamesSet.add(`${m}_RollStd_${w}`);
        }
      }

      // 3. Rate of Change (Difference from previous)
      for (const m of baseMetrics) {
        const diff = Number(curr[m as keyof typeof curr]) - Number(prev[m as keyof typeof curr]);
        rowOut[`${m}_RoC`] = Number(diff.toFixed(3));
        featureNamesSet.add(`${m}_RoC`);
      }

      // 4. Sensor Interaction Features
      const temp = curr.Temperature;
      const cur = curr.Current;
      const rpm = curr.RPM > 0 ? curr.RPM : 1;
      const vib = curr.Vibration;

      rowOut['Interaction_Temp_x_Current'] = Number((temp * cur).toFixed(2));
      rowOut['Interaction_Current_div_RPM'] = Number((cur / rpm).toFixed(5));
      rowOut['Interaction_Vib_x_RPM'] = Number((vib * rpm).toFixed(2));
      rowOut['Interaction_Temp_x_Vib'] = Number((temp * vib).toFixed(3));

      featureNamesSet.add('Interaction_Temp_x_Current');
      featureNamesSet.add('Interaction_Current_div_RPM');
      featureNamesSet.add('Interaction_Vib_x_RPM');
      featureNamesSet.add('Interaction_Temp_x_Vib');

      // 5. Distance to Configured Operating Limits
      rowOut['LimitDist_MaxTemp'] = Number((maxTemp - temp).toFixed(2));
      rowOut['LimitDist_MaxVib'] = Number((maxVib - vib).toFixed(3));
      rowOut['LimitDist_MaxCurrent'] = Number((maxCur - cur).toFixed(2));
      rowOut['LimitDist_MinRPM'] = Number((rpm - minRPM).toFixed(0));

      featureNamesSet.add('LimitDist_MaxTemp');
      featureNamesSet.add('LimitDist_MaxVib');
      featureNamesSet.add('LimitDist_MaxCurrent');
      featureNamesSet.add('LimitDist_MinRPM');

      engineeredRows.push(rowOut);
    }

    const csvString = Papa.unparse(engineeredRows);
    const uploadsDir = path.dirname(sourcePath);
    const engFileName = `engineered_${dataset._id.toString()}_${Date.now()}.csv`;
    const engineeredFilePath = path.join(uploadsDir, engFileName);

    fs.writeFileSync(engineeredFilePath, csvString, 'utf-8');

    dataset.engineeredFilePath = engineeredFilePath;
    dataset.status = 'ready_for_training';
    dataset.engineeredFeatures = Array.from(featureNamesSet);
    await dataset.save();

    return dataset;
  }

  /**
   * Generate downloadable sample CSV template with standard headers
   */
  public static generateSampleCSV(): string {
    const headers = this.REQUIRED_COLUMNS.join(',');
    const sampleRows = [
      headers,
      '2026-07-18T00:00:00.000Z,42.5,0.12,3.4,230.1,1480,62.0',
      '2026-07-18T00:00:05.000Z,42.8,0.14,3.5,229.8,1485,62.5',
      '2026-07-18T00:00:10.000Z,43.1,0.13,3.4,230.2,1482,63.0',
    ];
    return sampleRows.join('\n');
  }

  /**
   * Get target file path for live recorded dataset CSV
   */
  public static getLiveDatasetFilePath(machineId: string): string {
    const dir = path.join(process.cwd(), 'uploads', 'live_datasets');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, `live_dataset_${machineId}.csv`);
  }

  /**
   * Append a single live sensor reading to machine's recorded dataset CSV
   */
  public static appendLiveSensorReading(
    machineId: string,
    reading: {
      timestamp: Date;
      temperature: number;
      vibration: number;
      current: number;
      voltage: number;
      rpm: number;
      sound: number;
    }
  ): void {
    const filePath = this.getLiveDatasetFilePath(machineId);
    const fileExists = fs.existsSync(filePath);

    if (!fileExists) {
      const header = this.REQUIRED_COLUMNS.join(',') + '\n';
      fs.writeFileSync(filePath, header, 'utf-8');
    }

    const isoDate = reading.timestamp.toISOString();
    const line = `${isoDate},${reading.temperature},${reading.vibration},${reading.current},${reading.voltage},${reading.rpm},${reading.sound}\n`;
    fs.appendFileSync(filePath, line, 'utf-8');
  }

  /**
   * Clear recorded live dataset file for machine
   */
  public static clearLiveDatasetFile(machineId: string): void {
    const filePath = this.getLiveDatasetFilePath(machineId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Create or update a Dataset document from live recorded dataset CSV for AI Training
   */
  public static async registerDatasetFromLiveRecording(machineId: string, userId: string): Promise<IDataset> {
    const machine = await Machine.findById(machineId).exec();
    if (!machine) {
      throw ApiError.notFound('Machine not found');
    }

    const filePath = this.getLiveDatasetFilePath(machineId);
    if (!fs.existsSync(filePath)) {
      throw ApiError.badRequest('No live recorded dataset exists for this machine');
    }

    const rawRows = await this.parseUploadedFile(filePath);
    if (!rawRows || rawRows.length < 5) {
      throw ApiError.badRequest('Recorded dataset has insufficient rows (minimum 5 required)');
    }

    const { report, startDate, endDate, samplingInterval } = this.validateRawRows(rawRows);

    // Deactivate previous active datasets
    await Dataset.updateMany({ machineId: machine._id }, { isActive: false });

    const latest = await Dataset.findOne({ machineId: machine._id }).sort({ version: -1 }).exec();
    const newVersion = latest ? latest.version + 1 : 1;

    const dataset = await Dataset.create({
      machineId: machine._id,
      companyId: machine.companyId,
      name: `Live Telemetry Dataset v${newVersion} (${machine.name})`,
      originalFileName: `live_dataset_${machine.machineCode}.csv`,
      originalFilePath: filePath,
      fileSizeBytes: fs.statSync(filePath).size,
      rowCount: rawRows.length,
      columnCount: this.REQUIRED_COLUMNS.length,
      columns: this.REQUIRED_COLUMNS,
      startDate,
      endDate,
      samplingInterval: samplingInterval || '5s',
      status: 'raw',
      validationReport: report,
      isActive: true,
      version: newVersion,
      createdBy: userId,
    });

    // Clean & engineer features immediately
    const cleaned = await this.cleanDataset(dataset._id.toString());
    const engineered = await this.engineerFeatures(cleaned._id.toString());
    return engineered;
  }
}

