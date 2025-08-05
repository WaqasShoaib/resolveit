import Joi from 'joi';

// User registration validation schema
export const userRegistrationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
  
  age: Joi.number()
    .integer()
    .min(18)
    .max(120)
    .required()
    .messages({
      'number.min': 'Must be at least 18 years old',
      'number.max': 'Age cannot exceed 120',
      'any.required': 'Age is required'
    }),
  
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .required()
    .messages({
      'any.only': 'Gender must be male, female, or other',
      'any.required': 'Gender is required'
    }),
  
  address: Joi.object({
    street: Joi.string().required().messages({
      'any.required': 'Street address is required'
    }),
    city: Joi.string().required().messages({
      'any.required': 'City is required'
    }),
    zipCode: Joi.string().required().messages({
      'any.required': 'Zip code is required'
    })
  }).required(),
  
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[\d\s\-\(\)]{10,}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please enter a valid phone number',
      'any.required': 'Phone number is required'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Password is required'
    })
});

// User login validation schema
export const userLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Case registration validation schema
export const caseRegistrationSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Case title is required'
    }),
  
  description: Joi.string()
    .min(20)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Description must be at least 20 characters long',
      'string.max': 'Description cannot exceed 2000 characters',
      'any.required': 'Case description is required'
    }),
  
  caseType: Joi.string()
    .valid('family', 'business', 'criminal', 'civil', 'other')
    .required()
    .messages({
      'any.only': 'Case type must be family, business, criminal, civil, or other',
      'any.required': 'Case type is required'
    }),
  
  oppositeParty: Joi.object({
    name: Joi.string().required().messages({
      'any.required': 'Opposite party name is required'
    }),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{10,}$/).optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      zipCode: Joi.string().optional()
    }).optional()
  }).required(),
  
  isInCourt: Joi.boolean().default(false),
  
  courtDetails: Joi.when('isInCourt', {
    is: true,
    then: Joi.object({
      caseNumber: Joi.string().required(),
      courtName: Joi.string().required(),
      firNumber: Joi.string().optional(),
      policeStation: Joi.string().optional()
    }).required(),
    otherwise: Joi.optional()
  }),
  
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium'),
  
  tags: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().max(1000).optional()
});



export const caseUpdateSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Case title is required',
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 200 characters'
    }),

  description: Joi.string()
    .trim()
    .min(20)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Case description is required',
      'string.min': 'Description must be at least 20 characters long',
      'string.max': 'Description cannot exceed 2000 characters'
    }),

  caseType: Joi.string()
    .valid('family', 'business', 'criminal', 'civil', 'other')
    .required()
    .messages({
      'any.only': 'Invalid case type',
      'any.required': 'Case type is required'
    }),

  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .required()
    .messages({
      'any.only': 'Invalid priority level',
      'any.required': 'Priority is required'
    }),

  notes: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    }),

  oppositeParty: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Opposite party name is required',
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters'
      }),

    email: Joi.string()
      .email()
      .optional()
      .allow('')
      .messages({
        'string.email': 'Invalid email format'
      }),

    phone: Joi.string()
      .pattern(/^[+]?[\d\s\-\(\)]{10,}$/)
      .optional()
      .allow('')
      .messages({
        'string.pattern.base': 'Invalid phone number format'
      }),

    address: Joi.object({
      street: Joi.string()
        .trim()
        .min(5)
        .max(200)
        .optional()
        .allow('')
        .messages({
          'string.min': 'Street address must be at least 5 characters long',
          'string.max': 'Street address cannot exceed 200 characters'
        }),

      city: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .optional()
        .allow('')
        .messages({
          'string.min': 'City must be at least 2 characters long',
          'string.max': 'City cannot exceed 100 characters'
        }),

      zipCode: Joi.string()
        .trim()
        .min(3)
        .max(20)
        .optional()
        .allow('')
        .messages({
          'string.min': 'Zip code must be at least 3 characters long',
          'string.max': 'Zip code cannot exceed 20 characters'
        })
    }).optional()
  }).required()
});