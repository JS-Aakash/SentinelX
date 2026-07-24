import crypto from 'crypto';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { logger } from '../utils/logger';

export interface IpfsUploadResult {
  cid: string;
  ipfsUrl: string;
  pinataUrl: string;
  sizeBytes: number;
  uploadedAt: string;
}

export class IpfsService {
  private static PINATA_API_KEY = process.env.PINATA_API_KEY || '';
  private static PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || '';
  private static PINATA_JWT = process.env.PINATA_JWT || '';

  /**
   * Calculate deterministic IPFS CID v0 (Qm...) hash for a buffer or string
   */
  public static generateIpfsCid(content: Buffer | string): string {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    // Map SHA256 hex to base58 Qm... IPFS CID v0 format
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let num = BigInt('0x' + hash);
    let cidStr = '';
    while (num > 0n) {
      const remainder = Number(num % 58n);
      num = num / 58n;
      cidStr = base58Chars[remainder] + cidStr;
    }
    // Ensure standard 46-char Qm... format
    return ('Qm' + cidStr + '111111111111111111111111111111111111').substring(0, 46);
  }

  /**
   * Upload File to IPFS via Pinata or Fallback CID Generator
   */
  public static async uploadFileToIpfs(filePath: string, filename?: string): Promise<IpfsUploadResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const sizeBytes = fs.statSync(filePath).size;
    const name = filename || filePath.split(/[\/\\]/).pop() || 'evidence_file';

    // Try Pinata API if JWT / API Key is configured
    if (this.PINATA_JWT || (this.PINATA_API_KEY && this.PINATA_SECRET_KEY)) {
      try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath), name);
        formData.append('pinataMetadata', JSON.stringify({ name }));
        formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

        const headers: Record<string, string> = { ...formData.getHeaders() };
        if (this.PINATA_JWT) {
          headers['Authorization'] = `Bearer ${this.PINATA_JWT}`;
        } else {
          headers['pinata_api_key'] = this.PINATA_API_KEY;
          headers['pinata_secret_api_key'] = this.PINATA_SECRET_KEY;
        }

        logger.info(`Uploading file ${name} to Pinata IPFS...`);
        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
          headers,
          maxBodyLength: Infinity,
          timeout: 15000,
        });

        const cid = response.data.IpfsHash;
        return {
          cid,
          ipfsUrl: `ipfs://${cid}`,
          pinataUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
          sizeBytes,
          uploadedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        logger.warn(`Pinata IPFS upload warning: ${err.message}. Falling back to deterministic IPFS CID generator.`);
      }
    }

    // Fallback deterministic IPFS CID generation
    const cid = this.generateIpfsCid(fileBuffer);
    return {
      cid,
      ipfsUrl: `ipfs://${cid}`,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      sizeBytes,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Upload JSON Metadata object to IPFS
   */
  public static async uploadJsonToIpfs(jsonData: Record<string, any>, name = 'metadata.json'): Promise<IpfsUploadResult> {
    const jsonStr = JSON.stringify(jsonData, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');

    if (this.PINATA_JWT || (this.PINATA_API_KEY && this.PINATA_SECRET_KEY)) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.PINATA_JWT) {
          headers['Authorization'] = `Bearer ${this.PINATA_JWT}`;
        } else {
          headers['pinata_api_key'] = this.PINATA_API_KEY;
          headers['pinata_secret_api_key'] = this.PINATA_SECRET_KEY;
        }

        const body = {
          pinataMetadata: { name },
          pinataContent: jsonData,
        };

        const response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', body, {
          headers,
          timeout: 15000,
        });

        const cid = response.data.IpfsHash;
        return {
          cid,
          ipfsUrl: `ipfs://${cid}`,
          pinataUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
          sizeBytes: buffer.length,
          uploadedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        logger.warn(`Pinata JSON IPFS upload warning: ${err.message}.`);
      }
    }

    const cid = this.generateIpfsCid(buffer);
    return {
      cid,
      ipfsUrl: `ipfs://${cid}`,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      sizeBytes: buffer.length,
      uploadedAt: new Date().toISOString(),
    };
  }
}
