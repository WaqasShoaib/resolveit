import { Request, Response } from 'express';
import { Case, ICase } from '../models';
import path from 'path';

// ENHANCED DEBUG VERSION - Replace your createCase function with this
export const createCase = async (req: Request, res: Response) => {
  try {
    console.log('=== ENHANCED CASE CREATION DEBUG ===');
    console.log('User:', (req.user as any)?._id);
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Request method:', req.method);
    console.log('Request headers:', {
      'content-type': req.get('Content-Type'),
      'content-length': req.get('Content-Length'),
      'authorization': req.get('Authorization') ? 'Bearer ***' : 'None'
    });
    
    // Log raw request body
    console.log('Raw request body keys:', Object.keys(req.body));
    console.log('Raw request body:', req.body);
    console.log('Request files:', req.files);
    
    const userId = (req.user as any)?._id?.toString();
    
    // Check if user is authenticated
    if (!userId) {
      console.log('❌ User not authenticated');
      return res.status(401).json({
        status: 'error',
        message: 'User not authenticated'
      });
    }
    
    console.log('✅ User authenticated:', userId);
    
    // ENHANCED: Log each field extraction step
    console.log('=== EXTRACTING FIELDS ===');
    
    const extractedData = {
      title: req.body.title,
      description: req.body.description,
      caseType: req.body.caseType,
      isInCourt: req.body.isInCourt,
      priority: req.body.priority || 'medium',
      notes: req.body.notes || '',
    };
    
    console.log('Basic fields:', extractedData);
    
    // Extract opposite party details
    const oppositeParty = {
      name: req.body['oppositeParty[name]'] || req.body.oppositeParty?.name,
      email: req.body['oppositeParty[email]'] || req.body.oppositeParty?.email || '',
      phone: req.body['oppositeParty[phone]'] || req.body.oppositeParty?.phone || '',
      address: {
        street: req.body['oppositeParty[address][street]'] || req.body.oppositeParty?.address?.street || '',
        city: req.body['oppositeParty[address][city]'] || req.body.oppositeParty?.address?.city || '',
        zipCode: req.body['oppositeParty[address][zipCode]'] || req.body.oppositeParty?.address?.zipCode || '',
      }
    };
    
    console.log('Opposite party data:', oppositeParty);
    
    // Extract court details if case is in court
    let courtDetails = undefined;
    const isInCourtBool = req.body.isInCourt === 'true' || req.body.isInCourt === true;
    
    if (isInCourtBool) {
      courtDetails = {
        caseNumber: req.body['courtDetails[caseNumber]'] || req.body.courtDetails?.caseNumber || '',
        courtName: req.body['courtDetails[courtName]'] || req.body.courtDetails?.courtName || '',
        firNumber: req.body['courtDetails[firNumber]'] || req.body.courtDetails?.firNumber || '',
        policeStation: req.body['courtDetails[policeStation]'] || req.body.courtDetails?.policeStation || '',
      };
      
      console.log('Court details:', courtDetails);
    }
    
    // ENHANCED VALIDATION with detailed error reporting
    console.log('=== VALIDATION ===');
    const validationErrors = [];
    
    if (!extractedData.title || typeof extractedData.title !== 'string' || extractedData.title.trim().length < 5) {
      validationErrors.push({ 
        field: 'title', 
        message: 'Title must be at least 5 characters long',
        received: extractedData.title,
        type: typeof extractedData.title
      });
    }

    if (!extractedData.description || typeof extractedData.description !== 'string' || extractedData.description.trim().length < 20) {
      validationErrors.push({ 
        field: 'description', 
        message: 'Description must be at least 20 characters long',
        received: extractedData.description,
        type: typeof extractedData.description
      });
    }

    if (!oppositeParty.name || typeof oppositeParty.name !== 'string' || oppositeParty.name.trim().length === 0) {
      validationErrors.push({ 
        field: 'oppositeParty.name', 
        message: 'Opposite party name is required',
        received: oppositeParty.name,
        type: typeof oppositeParty.name
      });
    }

    // Validate court details if case is in court
    if (isInCourtBool && courtDetails) {
      if (!courtDetails.caseNumber || courtDetails.caseNumber.trim().length === 0) {
        validationErrors.push({ 
          field: 'courtDetails.caseNumber', 
          message: 'Court case number is required when case is in court',
          received: courtDetails.caseNumber
        });
      }
      
      if (!courtDetails.courtName || courtDetails.courtName.trim().length === 0) {
        validationErrors.push({ 
          field: 'courtDetails.courtName', 
          message: 'Court name is required when case is in court',
          received: courtDetails.courtName
        });
      }
    }

    if (validationErrors.length > 0) {
      console.log('❌ VALIDATION ERRORS:', validationErrors);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    console.log('✅ Validation passed');

    // Process uploaded files
    console.log('=== PROCESSING FILES ===');
    const documents: any[] = [];
    
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      console.log('Files object keys:', Object.keys(files));
      
      Object.keys(files).forEach(fieldname => {
        console.log(`Processing field: ${fieldname}, files:`, files[fieldname].length);
        files[fieldname].forEach((file, index) => {
          console.log(`  File ${index}:`, {
            originalname: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size
          });
          
          documents.push({
            fileName: file.filename,
            originalName: file.originalname,
            fileType: getFileType(file.mimetype),
            fileSize: file.size,
            uploadedAt: new Date(),
            uploadedBy: userId
          });
        });
      });
    }
    
    console.log('Processed documents:', documents);

    // Create final case object
    const caseToSave = {
      title: extractedData.title.trim(),
      description: extractedData.description.trim(),
      caseType: extractedData.caseType,
      isInCourt: isInCourtBool,
      courtDetails: courtDetails,
      priority: extractedData.priority,
      notes: extractedData.notes.trim(),
      oppositeParty: {
        name: oppositeParty.name.trim(),
        email: oppositeParty.email?.trim().toLowerCase(),
        phone: oppositeParty.phone?.trim(),
        address: oppositeParty.address
      },
      complainant: userId,
      documents: documents,
      status: 'registered'
    };
    
    console.log('=== FINAL CASE OBJECT ===');
    console.log(JSON.stringify(caseToSave, null, 2));

    // Save to database
    console.log('=== SAVING TO DATABASE ===');
    const newCase = new Case(caseToSave);
    console.log('Case object created, attempting to save...');
    
    const savedCase = await newCase.save();
    console.log('✅ Case saved successfully with ID:', savedCase._id);
    
    await savedCase.populate('complainant', 'name email phone');

    res.status(201).json({
      status: 'success',
      message: 'Case registered successfully',
      data: {
        case: savedCase
      }
    });
    
  } catch (error: any) {
    console.error('❌ CASE CREATION ERROR:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      console.log('❌ Mongoose validation errors:', error.errors);
      const validationErrors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value,
        kind: err.kind
      }));
      
      return res.status(400).json({
        status: 'error',
        message: 'Database validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      console.log('❌ Duplicate key error:', error.keyValue);
      return res.status(400).json({
        status: 'error',
        message: 'A case with this information already exists',
        error: error.message
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create case',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};


// Get all cases for a user
export const getUserCases = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id.toString();
    const { status, caseType, page = 1, limit = 10 } = req.query;

    // Build filter object
    const filter: any = { complainant: userId };
    
    if (status) filter.status = status;
    if (caseType) filter.caseType = caseType;

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get cases with pagination
    const cases = await Case.find(filter)
      .populate('complainant', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalCases = await Case.countDocuments(filter);
    const totalPages = Math.ceil(totalCases / Number(limit));

    res.status(200).json({
      status: 'success',
      data: {
        cases,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCases,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
        }
      }
    });
  } catch (error: any) {
    console.error('Get user cases error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch cases',
      error: error.message
    });
  }
};

// Get single case by ID
export const getCaseById = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const userId = (req.user as any)._id.toString();

    const caseDoc = await Case.findById(caseId)
      .populate('complainant', 'name email phone address')
      .populate('witnesses.user', 'name email phone')
      .populate('panelMembers.user', 'name email phone role');

    if (!caseDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Case not found'
      });
    }

    // Check if user has access to this case
    if (caseDoc.complainant._id.toString() !== userId && (req.user as any).role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        case: caseDoc
      }
    });
  } catch (error: any) {
    console.error('Get case by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch case',
      error: error.message
    });
  }
};

// Update case status
export const updateCaseStatus = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const { status, notes } = req.body;
    const userId = (req.user as any)._id.toString();

    const caseDoc = await Case.findById(caseId);

    if (!caseDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Case not found'
      });
    }

    // Check permissions
    if (caseDoc.complainant.toString() !== userId && (req.user as any).role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Update case
    caseDoc.status = status;
    if (notes) caseDoc.notes = notes;

    await caseDoc.save();

    res.status(200).json({
      status: 'success',
      message: 'Case status updated successfully',
      data: {
        case: caseDoc
      }
    });
  } catch (error: any) {
    console.error('Update case status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update case status',
      error: error.message
    });
  }
};

// Add documents to case
export const addDocumentToCase = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const userId = (req.user as any)._id.toString();

    const caseDoc = await Case.findById(caseId);

    if (!caseDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Case not found'
      });
    }

    // Check permissions
    if (caseDoc.complainant.toString() !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Process uploaded files (MULTIPLE FILES SUPPORT)
    const documents: any[] = [];
    
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Process each type of file
      Object.keys(files).forEach(fieldname => {
        files[fieldname].forEach(file => {
          documents.push({
            fileName: file.filename,
            originalName: file.originalname,
            fileType: getFileType(file.mimetype),
            fileSize: file.size,
            uploadedAt: new Date(),
            uploadedBy: userId
          });
        });
      });
    }

    // Check if any files were uploaded
    if (documents.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }

    // Add documents to case
    caseDoc.documents.push(...documents);
    await caseDoc.save();

    // Populate complainant details for response
    await caseDoc.populate('complainant', 'name email phone');

    res.status(200).json({
      status: 'success',
      message: `${documents.length} document(s) added successfully`,
      data: {
        case: caseDoc,
        addedDocuments: documents
      }
    });
  } catch (error: any) {
    console.error('Add documents error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add documents',
      error: error.message
    });
  }
};

// Get case statistics (for admin dashboard)
export const getCaseStatistics = async (req: Request, res: Response) => {
  try {
    const stats = await Case.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const caseTypeStats = await Case.aggregate([
      {
        $group: {
          _id: '$caseType',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCases = await Case.countDocuments();
    const activeCases = await Case.countDocuments({ 
      status: { $in: ['registered', 'under_review', 'awaiting_response', 'accepted', 'mediation_in_progress'] }
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalCases,
        activeCases,
        statusBreakdown: stats,
        typeBreakdown: caseTypeStats
      }
    });
  } catch (error: any) {
    console.error('Get case statistics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};   

// Update case details
export const updateCase = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const userId = (req.user as any)._id.toString();
    const {
      title,
      description,
      caseType,
      priority,
      notes,
      oppositeParty
    } = req.body;

    // Find the case
    const caseDoc = await Case.findById(caseId);
    
    if (!caseDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Case not found'
      });
    }

    // Check if user is authorized to update this case
    if (caseDoc.complainant.toString() !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to update this case'
      });
    }

    // Update case fields
    if (title) caseDoc.title = title.trim();
    if (description) caseDoc.description = description.trim();
    if (caseType) caseDoc.caseType = caseType;
    if (priority) caseDoc.priority = priority;
    if (notes !== undefined) caseDoc.notes = notes.trim();

    // Update opposite party information if provided
    if (oppositeParty) {
      if (oppositeParty.name) caseDoc.oppositeParty.name = oppositeParty.name.trim();
      if (oppositeParty.email) caseDoc.oppositeParty.email = oppositeParty.email.trim().toLowerCase();
      if (oppositeParty.phone) caseDoc.oppositeParty.phone = oppositeParty.phone.trim();
      
      if (oppositeParty.address) {
        if (!caseDoc.oppositeParty.address) {
          caseDoc.oppositeParty.address = {
            street: '',
            city: '',
            zipCode: ''
          };
        }
        if (oppositeParty.address.street) caseDoc.oppositeParty.address.street = oppositeParty.address.street.trim();
        if (oppositeParty.address.city) caseDoc.oppositeParty.address.city = oppositeParty.address.city.trim();
        if (oppositeParty.address.zipCode) caseDoc.oppositeParty.address.zipCode = oppositeParty.address.zipCode.trim();
      }
    }

    // Save the updated case
    const updatedCase = await caseDoc.save();
    
    // Populate complainant details for response
    await updatedCase.populate('complainant', 'name email phone');

    res.status(200).json({
      status: 'success',
      message: 'Case updated successfully',
      data: {
        case: updatedCase
      }
    });

  } catch (error: any) {
    console.error('Update case error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update case',
      error: error.message
    });
  }
};

// Helper function to determine file type
const getFileType = (mimetype: string): 'image' | 'video' | 'audio' | 'document' => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
};