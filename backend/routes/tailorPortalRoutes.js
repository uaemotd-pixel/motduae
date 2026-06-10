import express from 'express';
import expressAsyncHandler from 'express-async-handler';

const tailorPortalRouter = express.Router();

// Confirms isAuth + isApprovedTailor chain; B-27/B-28 add shop/design routes here
tailorPortalRouter.get(
  '/status',
  expressAsyncHandler(async (req, res) => {
    res.json({
      success: true,
      tailor: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        approvalStatus: req.user.approvalStatus,
      },
    });
  })
);

export default tailorPortalRouter;
