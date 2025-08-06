import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Generic validation middleware for JSON data
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

// NEW: Validation middleware for FormData (multipart/form-data)
export const validateFormData = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log('=== FORM DATA VALIDATION ===');
    console.log('Raw body:', req.body);
    
    // Convert FormData structure to nested object for validation
    const dataToValidate = parseFormData(req.body);
    console.log('Parsed data for validation:', dataToValidate);
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true // Allow unknown fields for FormData
    });

    if (error) {
      console.log('❌ Validation errors:', error.details);
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

    console.log('✅ Validation passed');
    next();
  };
};

// Helper function to parse FormData into nested object
const parseFormData = (body: any) => {
  const result: any = {};
  
  for (const key in body) {
    const value = body[key];
    
    if (key.includes('[') && key.includes(']')) {
      // Handle nested objects like 'oppositeParty[name]' or 'oppositeParty[address][city]'
      const keys = key.split(/[\[\]]+/).filter(k => k);
      setNestedValue(result, keys, value);
    } else {
      // Handle simple fields
      result[key] = value;
    }
  }
  
  // Convert string booleans
  if (result.isInCourt === 'true') result.isInCourt = true;
  if (result.isInCourt === 'false') result.isInCourt = false;
  
  return result;
};

// Helper function to set nested values
const setNestedValue = (obj: any, keys: string[], value: any) => {
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
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