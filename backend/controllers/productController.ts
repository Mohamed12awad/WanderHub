import { Request, Response } from "express";
import Product from "../models/productModel";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { page, limit: limitRaw, q } = req.query as Record<string, string>;
    if (!page) {
      const products = await Product.find({}).sort({ createdAt: -1 });
      return res.status(200).json(products);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const filter = q ? { $or: [{ name: new RegExp(q, "i") }, { type: new RegExp(q, "i") }] } : {};
    const [data, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip((p - 1) * limit).limit(limit),
      Product.countDocuments(filter),
    ]);
    res.status(200).json({ data, total, page: p, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
