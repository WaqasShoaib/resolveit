import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Generic validation middleware
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }

    // Replace req.body with validated data
    req.body = value;
    next();
  };
};

// File upload validation middleware
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!req.file && !req.files) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  // Handle both single file and multiple files
  let filesToValidate: Express.Multer.File[] = [];
  
  if (req.file) {
    filesToValidate.push(req.file);
  }
  
  if (req.files) {
    if (Array.isArray(req.files)) {
      filesToValidate.push(...req.files);
    } else {
      // req.files is an object with field names as keys
      Object.values(req.files).forEach(fileArray => {
        if (Array.isArray(fileArray)) {
          filesToValidate.push(...fileArray);
        }
      });
    }
  }
  
  for (const file of filesToValidate) {
    if (file) {
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          status: 'error',
          message: `File type ${file.mimetype} is not allowed`
        });
      }

      if (file.size > maxSize) {
        return res.status(400).json({
          status: 'error',
          message: 'File size exceeds 10MB limit'
        });
      }
    }
  }

  next();
};