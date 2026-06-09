import express from 'express';

const adminRouter = express.Router();

// Define admin routes here (e.g. C-02 to C-10)
adminRouter.get('/health', (req, res) => {
  res.send({ message: 'Admin API is healthy' });
});

export default adminRouter;
