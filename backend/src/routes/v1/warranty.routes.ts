import { Router, Request, Response } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { isEngineer } from '../../middlewares/role.middleware';
import { warrantyService } from '../../services/warranty.service';
import { ClaimStatus } from '../../models/WarrantyClaim';

const router = Router();
router.use(authenticate);

// ─── Warranties ─────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const machineId = req.query.machineId as string | undefined;
    const companyId = (req as any).user.companyId as string;
    const data = machineId
      ? await warrantyService.getWarrantiesByMachine(machineId)
      : await warrantyService.getWarrantiesByCompany(companyId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId as string;
    const data = await warrantyService.getWarrantySummary(companyId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/eligibility/:machineId', async (req: Request, res: Response) => {
  try {
    const data = await warrantyService.checkWarrantyEligibility(req.params.machineId as string);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', isEngineer, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const data = await warrantyService.createWarranty(req.body, user.companyId as string, user.userId as string);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Warranty Claims ─────────────────────────────────────────────────────────

router.get('/claims', async (req: Request, res: Response) => {
  try {
    const machineId = req.query.machineId as string | undefined;
    const companyId = (req as any).user.companyId as string;
    const data = machineId
      ? await warrantyService.getClaimsByMachine(machineId)
      : await warrantyService.getClaimsByCompany(companyId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/claims', isEngineer, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const data = await warrantyService.createClaim(req.body, user.companyId as string, user.userId as string);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/claims/:id/status', isEngineer, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, ...reviewData } = req.body;
    const data = await warrantyService.updateClaimStatus(
      req.params.id as string,
      status as ClaimStatus,
      reviewData,
      user.userId as string
    );
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
