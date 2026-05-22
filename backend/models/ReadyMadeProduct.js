import mongoose from 'mongoose';

const READY_MADE_STYLES = ['kandura', 'abaya', 'bisht', 'mukhawar', 'jalabiya', 'kaftan'];

const RETURN_REASONS = ['size_issue'];

const CONDITIONS = ['like_new', 'excellent', 'good'];

const readyMadeProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: '', trim: true },
    descriptionAr: { type: String, default: '', trim: true },
    images: {
      type: [String],
      default: [],
      validate: {
        validator(images) {
          return images.length > 0;
        },
        message: 'At least one image is required',
      },
    },
    price: { type: Number, required: true, min: 0 },
    size: { type: String, required: true, trim: true },
    style: {
      type: String,
      enum: READY_MADE_STYLES,
      required: true,
    },
    city: { type: String, default: '', trim: true },
    tag: { type: String, default: '', trim: true },
    tagColor: { type: String, default: '', trim: true },
    returnReason: {
      type: String,
      enum: RETURN_REASONS,
      default: 'size_issue',
      required: true,
    },
    sourceCustomOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomOrder',
      default: null,
    },
    condition: {
      type: String,
      enum: CONDITIONS,
      default: 'excellent',
      required: true,
    },
    countInStock: {
      type: Number,
      default: 1,
      min: 0,
      required: true,
    },
    isActive: { type: Boolean, default: true, required: true },
  },
  {
    timestamps: true,
  }
);

readyMadeProductSchema.index({ isActive: 1, style: 1 });
readyMadeProductSchema.index({ size: 1 });
readyMadeProductSchema.index(
  { sourceCustomOrderId: 1 },
  { unique: true, sparse: true }
);

const ReadyMadeProduct = mongoose.model('ReadyMadeProduct', readyMadeProductSchema);

export default ReadyMadeProduct;
export { READY_MADE_STYLES, RETURN_REASONS, CONDITIONS };
