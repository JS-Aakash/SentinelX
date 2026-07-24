import { Router, Request, Response } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { isEngineer } from '../../middlewares/role.middleware';
import { componentService, inspectionService } from '../../services/lifecycle.service';

const router = Router();
router.use(authenticate);

// ─── Component Replacements ──────────────────────────────────────────────────

router.get('/components', async (req: Request, res: Response) => {
  try {
    const machineId = req.query.machineId as string | undefined;
    const companyId = (req as any).user.companyId as string;
    const data = machineId
      ? await componentService.getReplacementsByMachine(machineId)
      : await componentService.getReplacementsByCompany(companyId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/components/stats', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId as string;
    const data = await componentService.getComponentStats(companyId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/components', isEngineer, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const data = await componentService.createReplacement(req.body, user.companyId as string, user.userId as string);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/components/:id/verify', isEngineer, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const data = await componentService.verifyReplacement(req.params.id as string, user.userId as string);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Inspections ─────────────────────────────────────────────────────────────

router.get('/inspections', async (req: Request, res: Response) => {
  try {
    const machineId = req.query.machineId as string | undefined;
    const companyId = (req as any).user.companyId as string;
    const data = machineId
      ? await inspectionService.getInspectionsByMachine(machineId)
      : await inspectionService.getInspectionsByCompany(companyId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/inspections', isEngineer, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const data = await inspectionService.createInspection(req.body, user.companyId as string, user.userId as string);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/inspections/:id/complete', isEngineer, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const data = await inspectionService.completeInspection(req.params.id as string, req.body, user.userId as string);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
