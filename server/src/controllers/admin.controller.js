
const { z } = require('zod');
const { sendSuccess, sendError, sendValidationError } = require('../utils/apiResponse');

const prisma = require('../utils/prisma');

const getStats = async (req, res, next) => {
  try {
    const [farmers, buyers, products, orders] = await Promise.all([
      prisma.user.count({ where: { role: 'FARMER' } }).catch(() => 0),
      prisma.user.count({ where: { role: 'BUYER' } }).catch(() => 0),
      prisma.product.count({ where: { isActive: true } }).catch(() => 0),
      prisma.order.count().catch(() => 0),
    ]);
    return sendSuccess(res, { farmers, buyers, products, orders, states: 28, districts: 100 });
  } catch (err) {
    return sendSuccess(res, { farmers: 0, buyers: 0, products: 0, orders: 0, states: 28, districts: 100 });
  }
};

const getFarmers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [farmers, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'FARMER' },
        select: { id: true, name: true, email: true, phone: true, district: true, state: true, isVerified: true, createdAt: true },
        skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: { role: 'FARMER' } }),
    ]);
    return sendSuccess(res, { farmers, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    next(err);
  }
};

const getBuyers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [buyers, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'BUYER' },
        select: { id: true, name: true, email: true, phone: true, district: true, isVerified: true, createdAt: true },
        skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: { role: 'BUYER' } }),
    ]);
    return sendSuccess(res, { buyers, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    next(err);
  }
};

const getAdminOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = status ? { status } : {};
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          buyer: { select: { name: true, email: true } },
          items: { include: { product: { select: { name: true } } } },
          payment: { select: { status: true, method: true } },
        },
        skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);
    return sendSuccess(res, { orders, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    next(err);
  }
};

const verifyUser = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isVerified: true },
      select: { id: true, name: true, isVerified: true },
    });
    return sendSuccess(res, user, 200, 'User verified');
  } catch (err) {
    next(err);
  }
};

const suspendUser = async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isVerified: false },
    });
    return sendSuccess(res, null, 200, 'User suspended');
  } catch (err) {
    next(err);
  }
};

const manageColdStorages = async (req, res, next) => {
  try {
    const storages = await prisma.coldStorage.findMany({ orderBy: { createdAt: 'desc' } });
    return sendSuccess(res, storages);
  } catch (err) {
    next(err);
  }
};

const updateColdStorage = async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      address: z.string().min(5).optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      storageType: z.enum(['COLD', 'NORMAL']).optional(),
      capacityTons: z.number().positive().optional(),
      supportedCrops: z.array(z.string()).optional(),
      minTemp: z.number().optional(),
      maxTemp: z.number().optional(),
      rentPerDay: z.number().positive().optional(),
      phone: z.string().min(10).optional(),
      operatingHours: z.string().min(3).optional(),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) return sendValidationError(res, result.error.flatten().fieldErrors);

    const storage = await prisma.coldStorage.update({ where: { id: req.params.id }, data: result.data });
    return sendSuccess(res, storage, 200, 'Cold storage updated');
  } catch (err) {
    next(err);
  }
};

const deleteColdStorage = async (req, res, next) => {
  try {
    await prisma.coldStorage.delete({ where: { id: req.params.id } });
    return sendSuccess(res, null, 200, 'Cold storage deleted');
  } catch (err) {
    next(err);
  }
};

const createAdminColdStorage = async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      address: z.string().min(5),
      latitude: z.number(),
      longitude: z.number(),
      storageType: z.enum(['COLD', 'NORMAL']).default('COLD'),
      capacityTons: z.number().positive(),
      supportedCrops: z.array(z.string()).min(1),
      minTemp: z.number(),
      maxTemp: z.number(),
      rentPerDay: z.number().positive(),
      phone: z.string().min(10),
      operatingHours: z.string().min(3),
    });

    const result = schema.safeParse(req.body);
    if (!result.success) return sendValidationError(res, result.error.flatten().fieldErrors);

    if (result.data.minTemp >= result.data.maxTemp) {
      return sendError(res, 'Min temperature must be less than Max temperature', 400);
    }

    const storage = await prisma.coldStorage.create({ data: result.data });
    return sendSuccess(res, storage, 201, 'Storage created successfully');
  } catch (err) {
    next(err);
  }
};

// ---- Solar Drying Plants ----

const getSolarDryingPlants = async (req, res, next) => {
  try {
    const plants = await prisma.solarDryingPlant.findMany({ orderBy: { createdAt: 'desc' } });
    return sendSuccess(res, plants);
  } catch (err) { next(err); }
};

const createSolarDryingPlant = async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      address: z.string().min(5),
      latitude: z.number(),
      longitude: z.number(),
      capacityKgPerDay: z.number().positive(),
      supportedProducts: z.array(z.string()).min(1),
      dryingMethod: z.string().default('Solar'),
      phone: z.string().min(10),
      operatingHours: z.string().min(3),
      rentPerDay: z.number().positive(),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) return sendValidationError(res, result.error.flatten().fieldErrors);
    const plant = await prisma.solarDryingPlant.create({ data: result.data });
    return sendSuccess(res, plant, 201, 'Solar drying plant created successfully');
  } catch (err) { next(err); }
};

const deleteSolarDryingPlant = async (req, res, next) => {
  try {
    await prisma.solarDryingPlant.delete({ where: { id: req.params.id } });
    return sendSuccess(res, null, 200, 'Solar drying plant deleted');
  } catch (err) { next(err); }
};

const getReports = async (req, res, next) => {
  try {
    const [totalRevenue, aiUsage, userGrowth] = await Promise.all([
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
      prisma.pricePrediction.count(),
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
    ]);
    return sendSuccess(res, {
      totalRevenue: totalRevenue._sum.amount || 0,
      aiPredictions: aiUsage,
      usersByRole: userGrowth,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getFarmers, getBuyers, getAdminOrders, verifyUser, suspendUser, manageColdStorages, getReports, updateColdStorage, deleteColdStorage, createAdminColdStorage, getSolarDryingPlants, createSolarDryingPlant, deleteSolarDryingPlant };
