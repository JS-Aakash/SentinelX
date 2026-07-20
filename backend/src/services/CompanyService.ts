import { companyRepository } from '../repositories/CompanyRepository';
import { ApiError } from '../utils/ApiError';
import { ICompany } from '../models/Company';

export class CompanyService {
  async getCompany(companyId: string): Promise<ICompany> {
    const company = await companyRepository.findById(companyId);
    if (!company) {
      throw ApiError.notFound('Company not found');
    }
    return company;
  }

  async updateCompany(companyId: string, data: Partial<ICompany>): Promise<ICompany> {
    // If updating email, check for conflicts
    if (data.email) {
      const existing = await companyRepository.findByEmail(data.email);
      if (existing && existing._id.toString() !== companyId) {
        throw ApiError.conflict('A company with this email already exists');
      }
    }

    const company = await companyRepository.update(companyId, data);
    if (!company) {
      throw ApiError.notFound('Company not found');
    }
    return company;
  }

  async updateLogo(companyId: string, logoPath: string): Promise<ICompany> {
    const company = await companyRepository.updateLogo(companyId, logoPath);
    if (!company) {
      throw ApiError.notFound('Company not found');
    }
    return company;
  }
}

export const companyService = new CompanyService();
