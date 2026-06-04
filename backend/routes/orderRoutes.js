import express from "express";
import mongoose from "mongoose";
import RetailOrder from "../models/RetailOrder.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import { isAuth } from "../middleware/auth.js";

const orderRoutes = express.Router();

orderRoutes.post("/retail", isAuth, async (req, res) => {
    try {
        const {
            orderItems,
            shippingAddress,
        } = req.body;

        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No order items provided",
            });
        }

        if (!shippingAddress) {
            return res.status(400).json({
                success: false,
                message: "Shipping address is required",
            });
        }

        let itemsPrice = 0;
        const finalOrderItems = [];

        for (const item of orderItems) {

            const product = await ReadyMadeProduct.findOne({
                _id: item.productId,
                isActive: true,
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product not found: ${item.productId}`,
                });
            }

            const quantity = item.quantity || 1;

            if (product.countInStock < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} is out of stock`,
                });
            }

            finalOrderItems.push({
                productId: product._id,
                name: product.name,
                nameAr: product.nameAr,
                slug: product.slug,
                image: product.images?.[0] || "",
                size: product.size,
                price: product.price,
                quantity,
            });

            itemsPrice += product.price * quantity;
        }

        const shippingPrice = 0;

        const vatRate = 0.05;

        const vatAmount = Number(
            (itemsPrice * vatRate).toFixed(2)
        );

        const totalPrice =
            itemsPrice +
            shippingPrice +
            vatAmount;

        const order = await RetailOrder.create({
            userId: req.user._id,
            orderItems: finalOrderItems,
            shippingAddress,
            paymentMethod: "cod",
            itemsPrice,
            shippingPrice,
            vatRate,
            vatAmount,
            totalPrice,
            status: "pending",
        });

        // Update stock
        for (const item of orderItems) {

            const product = await ReadyMadeProduct.findById(
                item.productId
            );

            const quantity = item.quantity || 1;

            product.countInStock -= quantity;

            if (product.countInStock <= 0) {
                product.countInStock = 0;
                product.isActive = false;
            }

            await product.save();
        }

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            orderId: order._id,
            order,
        });

    } catch (error) {

        console.error(
            "POST /api/orders/retail error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to create order",
        });
    }
});


// This route is for getting only my orders means the logged-in user orders
orderRoutes.get("/retail/mine", isAuth, async (req, res) => {
    try {
        const orders = await RetailOrder.find({
            userId: req.user._id,
        })
            .sort({ createdAt: -1 })
            .select("_id createdAt status totalPrice currency orderItems userId");

        const formatted = orders.map((order) => ({
            id: order._id,
            date: order.createdAt,
            status: order.status,
            totalPrice: order.totalPrice,
            currency: order.currency,
            userId: order.userId,

            // lightweight preview for UI
            firstItem: order.orderItems?.[0]
                ? {
                    name: order.orderItems[0].name,
                    image: order.orderItems[0].image,
                    size: order.orderItems[0].size,
                }
                : null,
        }));

        res.json({
            success: true,
            orders: formatted,
        });
    } catch (error) {
        console.error("GET /retail/mine error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user orders",
        });
    }
})


// This Endpoint will be used to get the single order detail based on id
orderRoutes.get("/retail/:id", isAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // validate id
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Invalid Order ID"
            })
        }

        const order = await RetailOrder.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // check the order ownership
        if (order.userId.toString() !== req.user._id && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view this order",
            });
        }

        res.json({
            success: true,
            order,
        });

    } catch (error) {
        console.error("GET /retail/:id error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch order",
        });
    }
})

export default orderRoutes;