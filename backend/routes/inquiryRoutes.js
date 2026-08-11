const express = require('express');
const router = express.Router();
const { submitInquiry, getInquiries } = require('../controllers/inquiryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router
  .route('/')
  .post(submitInquiry)
  .get(protect, authorize('admin'), getInquiries);

module.exports = router;
