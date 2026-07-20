import { Company, ICompany } from '../models/Company';
import mongoose from 'mongoose';

export class CompanyRepository {
  async create(data: Partial<ICompany>): Promise<ICompany> {
    const company = new Company(data);
    return company.save();
  }

  async findById(id: string | mongoose.Types.ObjectId): Promise<ICompany | null> {
    return Company.findById(id);
  }

  async findByEmail(email: string): Promise<ICompany | null> {
    return Company.findOne({ email: email.toLowerCase() });
  }

  async update(
    id: string | mongoose.Types.ObjectId,
    data: Partial<ICompany>
  ): Promise<ICompany | null> {
    return Company.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async updateLogo(
    id: string | mongoose.Types.ObjectId,
    logoPath: string
  ): Promise<ICompany | null> {
    return Company.findByIdAndUpdate(id, { $set: { logo: logoPath } }, { new: true });
  }
}

export const companyRepository = new CompanyRepository();
