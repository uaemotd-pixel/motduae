import * as images from "../../../public/images/ImageIndex";

// Centralized fabric data store
// This can be imported and used across the app for consistency
// In a real app, this would likely come from an API or database

export const fabrics = [
    { id: 1, name: "Royal Gold Damask", price: 1200, category: "silk", color: "gold", material: "Silk Brocade", inStock: true, image: images.fab1.src, description: "Exquisite gold damask silk brocade handcrafted by master artisans", origin: "Dubai, UAE" },
    { id: 2, name: "Midnight Floral", price: 950, category: "velvet", color: "black", material: "Premium Velvet", inStock: true, image: images.fab2.src, description: "Deep midnight floral velvet with subtle shimmer", origin: "Abu Dhabi, UAE" },
    { id: 3, name: "Diamond Geometric", price: 680, category: "cotton", color: "ivory", material: "Washable Cotton", inStock: true, image: images.fab3.src, description: "Contemporary geometric pattern on breathable cotton", origin: "Sharjah, UAE" },
    { id: 4, name: "Golden Peony", price: 1450, category: "embroidered", color: "gold", material: "Embroidered Tulle", inStock: true, image: images.fab4.src, description: "Hand-embroidered peony motifs on fine tulle", origin: "Dubai, UAE" },
    { id: 5, name: "Pearl Lattice", price: 1100, category: "silk", color: "ivory", material: "Silk Jacquard", inStock: true, image: images.fab5.src, description: "Pearlescent lattice pattern on premium silk jacquard", origin: "Ras Al Khaimah, UAE" },
    { id: 6, name: "Charcoal Shadow", price: 980, category: "velvet", color: "black", material: "Luxury Velvet", inStock: true, image: images.fab6.src, description: "Subtle charcoal shadow effect on luxury velvet", origin: "Ajman, UAE" },
    { id: 7, name: "Pristine Twill", price: 550, category: "cotton", color: "ivory", material: "Egyptian Cotton", inStock: true, image: images.fab1.src, description: "Premium Egyptian cotton twill, breathable and refined", origin: "Umm Al Quwain, UAE" },
    { id: 8, name: "Vintage Rose", price: 1320, category: "embroidered", color: "gold", material: "Embroidered Silk", inStock: true, image: images.fab2.src, description: "Romantic vintage rose embroidery on pure silk", origin: "Fujairah, UAE" },
    { id: 9, name: "Opal Damask", price: 1250, category: "silk", color: "ivory", material: "Premium Silk", inStock: true, image: images.fab3.src, description: "Iridescent opal damask pattern on premium silk", origin: "Dubai, UAE" },
    { id: 10, name: "Obsidian Floral", price: 1020, category: "velvet", color: "black", material: "Embossed Velvet", inStock: true, image: images.fab4.src, description: "Dark obsidian floral embossed pattern on velvet", origin: "Abu Dhabi, UAE" },
    { id: 11, name: "Alabaster Maze", price: 620, category: "cotton", color: "ivory", material: "Fine Cotton", inStock: true, image: images.fab4.src, description: "Intricate maze pattern on fine alabaster cotton", origin: "Sharjah, UAE" },
    { id: 12, name: "Gilded Flora", price: 1580, category: "embroidered", color: "gold", material: "Hand-Stitched Silk", inStock: true, image: images.fab6.src, description: "Luxurious hand-stitched gilded floral motifs", origin: "Dubai, UAE" },
    { id: 13, name: "Crimson Velvet", price: 890, category: "velvet", color: "red", material: "Premium Velvet", inStock: true, image: images.fab1.src, description: "Rich crimson velvet for luxurious draping", origin: "Dubai, UAE" },
    { id: 14, name: "Sapphire Silk", price: 1350, category: "silk", color: "blue", material: "Pure Silk", inStock: true, image: images.fab2.src, description: "Deep sapphire blue silk with subtle sheen", origin: "Abu Dhabi, UAE" },
    { id: 15, name: "Emerald Linen", price: 720, category: "linen", color: "green", material: "Pure Linen", inStock: true, image: images.fab3.src, description: "Natural emerald green linen for summer", origin: "Sharjah, UAE" },
    { id: 16, name: "Amber Brocade", price: 1480, category: "embroidered", color: "gold", material: "Silk Brocade", inStock: true, image: images.fab4.src, description: "Amber and gold brocade with intricate patterns", origin: "Dubai, UAE" },
    { id: 17, name: "Platinum Jacquard", price: 1650, category: "silk", color: "silver", material: "Silk Jacquard", inStock: true, image: images.fab5.src, description: "Platinum silver jacquard with geometric patterns", origin: "Dubai, UAE" },
    { id: 18, name: "Rose Gold Chiffon", price: 980, category: "chiffon", color: "pink", material: "Silk Chiffon", inStock: true, image: images.fab6.src, description: "Delicate rose gold chiffon for evening wear", origin: "Abu Dhabi, UAE" },
    { id: 19, name: "Midnight Tweed", price: 850, category: "wool", color: "black", material: "Wool Tweed", inStock: true, image: images.fab1.src, description: "Classic midnight tweed for tailoring", origin: "Dubai, UAE" },
    { id: 20, name: "Pearl Satin", price: 1120, category: "silk", color: "ivory", material: "Silk Satin", inStock: true, image: images.fab2.src, description: "Lustrous pearl satin for bridal wear", origin: "Sharjah, UAE" },
    { id: 21, name: "Copper Organza", price: 780, category: "organza", color: "copper", material: "Silk Organza", inStock: true, image: images.fab3.src, description: "Crisp copper organza for structural designs", origin: "Ajman, UAE" },
    { id: 22, name: "Slate Crepe", price: 920, category: "crepe", color: "gray", material: "Silk Crepe", inStock: true, image: images.fab4.src, description: "Fluid slate crepe for elegant draping", origin: "Dubai, UAE" },
    { id: 23, name: "Ivory Lace", price: 1750, category: "lace", color: "ivory", material: "French Lace", inStock: true, image: images.fab5.src, description: "Exquisite French lace with floral motifs", origin: "Dubai, UAE" },
    { id: 24, name: "Charcoal Flannel", price: 690, category: "wool", color: "gray", material: "Wool Flannel", inStock: true, image: images.fab6.src, description: "Soft charcoal flannel for suiting", origin: "Ras Al Khaimah, UAE" },
]