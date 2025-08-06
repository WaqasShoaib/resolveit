import Joi from 'joi';

// Case registration validation schema
export const caseRegistrationSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required'
    }),
    
  description: Joi.string()
    .min(20)
    .max(2000)
    .required()
    .trim()
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 20 characters long',
      'string.max': 'Description cannot exceed 2000 characters',
      'any.required': 'Description is required'
    }),
    
  caseType: Joi.string()
    .valid('family', 'business', 'criminal', 'civil', 'other')
    .required()
    .messages({
      'any.only': 'Case type must be one of: family, business, criminal, civil, other',
      'any.required': 'Case type is required'
    }),
    
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium'),
    
  notes: Joi.string()
    .max(1000)
    .allow('')
    .default(''),
    
  isInCourt: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Court status is required'
    }),
    
  oppositeParty: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .trim()
      .messages({
        'string.empty': 'Opposite party name is required',
        'string.min': 'Opposite party name must be at least 2 characters long',
        'any.required': 'Opposite party name is required'
      }),
      
    email: Joi.string()
      .email()
      .allow('')
      .lowercase()
      .messages({
        'string.email': 'Please enter a valid email address'
      }),
      
    phone: Joi.string()
      .pattern(/^[+]?[\d\s\-\(\)]{10,}$/)
      .allow('')
      .messages({
        'string.pattern.base': 'Please enter a valid phone number'
      }),
      
    address: Joi.object({
      street: Joi.string().allow('').default(''),
      city: Joi.string().allow('').default(''),
      zipCode: Joi.string().allow('').default('')
    }).default({})
  }).required(),
  
  courtDetails: Joi.when('isInCourt', {
    is: true,
    then: Joi.object({
      caseNumber: Joi.string()
        .min(1)
        .required()
        .trim()
        .messages({
          'string.empty': 'Court case number is required when case is in court',
          'any.required': 'Court case number is required when case is in court'
        }),
        
      courtName: Joi.string()
        .min(1)
        .required()
        .trim()
        .messages({
          'string.empty': 'Court name is required when case is in court',
          'any.required': 'Court name is required when case is in court'
        }),
        
      firNumber: Joi.string().allow('').default(''),
      policeStation: Joi.string().allow('').default('')
    }).required(),
    otherwise: Joi.forbidden()
  })
}).options({ abortEarly: false });

// Case update validation schema (for PUT requests)
export const caseUpdateSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(200)
    .trim()
    .messages({
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 200 characters'
    }),
    
  description: Joi.string()
    .min(20)
    .max(2000)
    .trim()
    .messages({
      'string.min': 'Description must be at least 20 characters long',
      'string.max': 'Description cannot exceed 2000 characters'
    }),
    
  caseType: Joi.string()
    .valid('family', 'business', 'criminal', 'civil', 'other')
    .messages({
      'any.only': 'Case type must be one of: family, business, criminal, civil, other'
    }),
    
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent'),
    
  notes: Joi.string()
    .max(1000)
    .allow(''),
    
  oppositeParty: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .trim()
      .messages({
        'string.min': 'Opposite party name must be at least 2 characters long'
      }),
      
    email: Joi.string()
      .email()
      .allow('')
      .lowercase()
      .messages({
        'string.email': 'Please enter a valid email address'
      }),
      
    phone: Joi.string()
      .pattern(/^[+]?[\d\s\-\(\)]{10,}$/)
      .allow('')
      .messages({
        'string.pattern.base': 'Please enter a valid phone number'
      }),
      
    address: Joi.object({
      street: Joi.string().allow(''),
      city: Joi.string().allow(''),
      zipCode: Joi.string().allow('')
    })
  })
}).options({ abortEarly: false });

// User registration validation schema
export const userRegistrationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'any.required': 'Name is required'
    }),
    
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required'
    }),
    
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
    
  phone: Joi.string()
    .pattern(/^[+]?[\d\s\-\(\)]{10,}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please enter a valid phone number',
      'any.required': 'Phone number is required'
    }),
    
  age: Joi.number()
    .integer()
    .min(18)
    .max(120)
    .messages({
      'number.min': 'Age must be at least 18',
      'number.max': 'Age cannot exceed 120'
    }),
    
  gender: Joi.string()
    .valid('male', 'female', 'other'),
    
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    zipCode: Joi.string().required()
  }).required()
}).options({ abortEarly: false });

// User login validation schema
export const userLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required'
    }),
    
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
}).options({ abortEarly: false });