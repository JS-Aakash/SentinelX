import { Router, Request, Response } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { isEngineer } from '../../middlewares/role.middleware';
import { inventoryService, vendorService } from '../../services/inventory.service';

const router = Router();
router.use(authenticate);

// ─── Spare Parts ─────────────────────────────────────────────────────────────

router.get('/spare-parts', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId as string;
    const data = await inventoryService.getSparePartsByCompany(companyId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/spare-parts/summary', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId as string;
    const data = await inventoryService.getInventorySummary(companyId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/spare-parts/alerts', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId as string;
    const data = await inventoryService.getLowStockAlerts(companyId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/spare-parts', isEngineer, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const data = await inventoryService.createSparePart(req.body, user.companyId as string, user.userId as string);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/spare-parts/:id', isEngineer, async (req: Request, res: Response) => {
  try {
    const data = await inventoryService.updateSparePart(req.params.id as string, req.body);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/spare-parts/:id/stock', isEngineer, async (req: Request, res: Response) => {
  try {
    const { adjustment, reason } = req.body;
    const data = await inventoryService.adjustStock(req.params.id as string, adjustment as number, reason as string);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/spare-parts/:id', isEngineer, async (req: Request, res: Response) => {
  try {
    await inventoryService.deleteSparePart(req.params.id as string);
    res.json({ success: true, message: 'Spare part deleted' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Vendors ─────────────────────────────────────────────────────────────────

router.get('/vendors', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.companyId as string;
    const data = await vendorService.getVendorsByCompany(companyId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/vendors/:id', async (req: Request, res: Response) => {
  try {
    const data = await vendorService.getVendorById(req.params.id as string);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/vendors', isEngineer, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const data = await vendorService.createVendor(req.body, user.companyId as string, user.userId as string);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/vendors/:id', isEngineer, async (req: Request, res: Response) => {
  try {
    const data = await vendorService.updateVendor(req.params.id as string, req.body);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/vendors/:id', isEngineer, async (req: Request, res: Response) => {
  try {
    const data = await vendorService.deleteVendor(req.params.id as string);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
