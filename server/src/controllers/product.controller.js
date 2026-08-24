const { z } = require('zod');
const { sendSuccess, sendError, sendValidationError } = require('../utils/apiResponse');
const cloudinaryService = require('../services/cloudinary.service');
const logger = require('../utils/logger');
const prisma = require('../utils/prisma');

const productSchema = z.object({
  name: z.string().min(2).max(200),
  categoryId: z.string().uuid('Invalid category ID'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.string().min(1).max(20),
  expectedPrice: z.coerce.number().positive('Price must be positive'),
  harvestDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
  ),
  subDistrict: z.string().max(100).optional(),
  village: z.string().max(100).transform((v) => v?.trim() || 'N/A'),
  district: z.string().min(1).max(100),
  state: z.string().max(100).transform((v) => v?.trim() || 'Tamil Nadu'),
  description: z.string().max(2000).optional(),
  isActive: z.preprocess((val) => val === 'true' || val === true || val === 1 || val === '1', z.boolean()).optional(),
});

// ─── GET /products ─────────────────────────────────────────────────────────────
const getProducts = async (req, res, next) => {
  try {
    const {
      category,
      district,
      minPrice,
      maxPrice,
      sort = 'latest',
      page = '1',
      limit = '12',
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const where = { isActive: true, isDeleted: false };
    if (category) where.categoryId = category;
    if (district) where.district = { contains: district, mode: 'insensitive' };
    if (minPrice || maxPrice) {
      where.expectedPrice = {};
      if (minPrice) where.expectedPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.expectedPrice.lte = parseFloat(maxPrice);
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy =
      sort === 'price_asc' ? { expectedPrice: 'asc' }
      : sort === 'price_desc' ? { expectedPrice: 'desc' }
      : { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          farmer: { select: { id: true, name: true, district: true, avatarUrl: true } },
          category: { select: { id: true, name: true } },
          reviews: { select: { rating: true } },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ]);

    const productsWithRating = products.map((p) => ({
      ...p,
      avgRating: p.reviews.length
        ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length
        : 0,
      reviewCount: p.reviews.length,
    }));

    return sendSuccess(res, {
      products: productsWithRating,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /products/my ─────────────────────────────────────────────────────────
const getMyProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { farmerId: req.user.id, isDeleted: false },
      include: {
        category: true,
        orderItems: { select: { quantity: true, price: true } },
        reviews: { select: { rating: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, products);
  } catch (err) {
    next(err);
  }
};

// ─── GET /products/categories ─────────────────────────────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    return sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
};

// ─── GET /products/:id ────────────────────────────────────────────────────────
const getProductById = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        farmer: { select: { id: true, name: true, district: true, avatarUrl: true, phone: true } },
        category: true,
        reviews: {
          include: { user: { select: { name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!product || product.isDeleted) {
      return sendError(res, 'Product not found.', 404);
    }
    if (!product.isActive) {
      const isOwner = req.user && req.user.id === product.farmerId;
      const isAdmin = req.user && req.user.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        return sendError(res, 'Product not found.', 404);
      }
    }
    return sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
};

// ─── POST /products ───────────────────────────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    const result = productSchema.safeParse(req.body);
    if (!result.success) {
      return sendValidationError(res, result.error.flatten().fieldErrors);
    }

    let imageUrl = 'https://images.unsplash.com/photo-1595761387015-8cf49d20e6fc?w=400';
    if (req.file) {
      try {
        const uploaded = await cloudinaryService.uploadImage(req.file.buffer, 'products');
        imageUrl = uploaded.secure_url;
      } catch (err) {
        logger.warn('Cloudinary product upload failed, using fallback:', err.message);
        const base64 = req.file.buffer.toString('base64');
        imageUrl = `data:${req.file.mimetype};base64,${base64}`;
      }
    }

    const product = await prisma.product.create({
      data: {
        ...result.data,
        farmerId: req.user.id,
        imageUrl,
        harvestDate: new Date(result.data.harvestDate),
      },
      include: { category: true },
    });

    return sendSuccess(res, product, 201, 'Product created successfully');
  } catch (err) {
    next(err);
  }
};

// ─── PUT /products/:id ────────────────────────────────────────────────────────
const updateProduct = async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.isDeleted) return sendError(res, 'Product not found.', 404);
    if (existing.farmerId !== req.user.id) return sendError(res, 'Not authorized to edit this product.', 403);

    const result = productSchema.partial().safeParse(req.body);
    if (!result.success) {
      return sendValidationError(res, result.error.flatten().fieldErrors);
    }

    const updateData = { ...result.data };
    if (req.file) {
      try {
        const uploaded = await cloudinaryService.uploadImage(req.file.buffer, 'products');
        updateData.imageUrl = uploaded.secure_url;
      } catch (err) {
        logger.warn('Cloudinary product update upload failed:', err.message);
        const base64 = req.file.buffer.toString('base64');
        updateData.imageUrl = `data:${req.file.mimetype};base64,${base64}`;
      }
    }
    if (result.data.harvestDate) {
      updateData.harvestDate = new Date(result.data.harvestDate);
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: updateData,
      include: { category: true },
    });

    return sendSuccess(res, product, 200, 'Product updated successfully');
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /products/:id ─────────────────────────────────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.isDeleted) return sendError(res, 'Product not found.', 404);
    if (existing.farmerId !== req.user.id) return sendError(res, 'Not authorized to delete this product.', 403);

    // Soft delete by setting isDeleted to true
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isDeleted: true },
    });

    return sendSuccess(res, null, 200, 'Product deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProducts,
  getMyProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
};
