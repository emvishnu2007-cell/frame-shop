'use strict';
const { makeUploader, verifySavedImage } = require('../middleware/upload');

const customerPhotoUpload = makeUploader('photos');
const frameImageUpload = makeUploader('frames');
const brandingUpload = makeUploader('branding');

function runUpload(uploader, subdir) {
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err) return next(err);
      try {
        verifySavedImage(req.file);
      } catch (e) {
        return next(e);
      }
      res.status(201).json({
        path: `/uploads/${subdir}/${req.file.filename}`,
        size: req.file.size,
        message: 'Image uploaded.',
      });
    });
  };
}

module.exports = {
  customerPhoto: runUpload(customerPhotoUpload, 'photos'),
  frameImage: runUpload(frameImageUpload, 'frames'),
  branding: runUpload(brandingUpload, 'branding'),
};
