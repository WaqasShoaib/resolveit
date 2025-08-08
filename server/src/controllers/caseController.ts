import { Request, Response } from 'express';
import { Case, ICase } from '../models';
import path from 'path';

// Create new case
export const createCase = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id.toString();
    
    // Extract case data from request body
    const caseData = {
      title: req.body.title,
      description: req.body.description,
      caseType: req.body.caseType,
      isInCourt: req.body.isInCourt === 'true',
      courtDetails: req.body.courtDetails,
      priority: req.body.priority,
      notes: req.body.notes,
      oppositeParty: {
        name: req.body['oppositeParty[name]'],
        email: req.body['oppositeParty[email]'],
        phone: req.body['oppositeParty[phone]'],
        address: {
          street: req.body['oppositeParty[address][street]'],
          city: req.body['oppositeParty[address][city]'],
          zipCode: req.body['oppositeParty[address][zipCode]'],
        }
      }
    };

    // Process uploaded files
    const documents: any[] = [];
    
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
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

    // Create case object
    const newCase = new Case({
      ...caseData,
      complainant: userId,
      documents: documents,
      status: 'registered'
    });

    const savedCase = await newCase.save();
    await savedCase.populate('complainant', 'name email phone');

    res.status(201).json({
      status: 'success',
      message: 'Case registered successfully',
      data: {
        case: savedCase
      }
    });
  } catch (error: any) {
    console.error('Case creation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create case',
      error: error.message
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
    const userId = (req.user as any)._id;

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

    // FIXED: More robust authorization check
    const userIdStr = userId?.toString();
    const complainantIdStr = caseDoc.complainant._id?.toString();
    const isAdmin = (req.user as any).role === 'admin';

    // Check if user has access to this case
    if (!userIdStr || (!isAdmin && complainantIdStr !== userIdStr)) {
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
    if (caseDoc.complainant.toString() !== userId && req.user.role !== 'admin') {
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
    const userId = (req.user as any)._id;
    const {
      title,
      description,
      caseType,
      priority,
      notes,
      oppositeParty
    } = req.body;

    // DEBUG: Log the IDs for comparison
    console.log('🔍 UPDATE CASE DEBUG:');
    console.log('User ID from request:', userId);
    console.log('User ID type:', typeof userId);
    console.log('User ID toString():', userId?.toString());

    // Find the case
    const caseDoc = await Case.findById(caseId);
    
    if (!caseDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Case not found'
      });
    }

    console.log('Case complainant:', caseDoc.complainant);
    console.log('Case complainant type:', typeof caseDoc.complainant);
    console.log('Case complainant toString():', caseDoc.complainant?.toString());

    // FIXED: More robust authorization check
    const userIdStr = userId?.toString();
    const complainantIdStr = caseDoc.complainant?.toString();
    const isAdmin = (req.user as any).role === 'admin';

    console.log('Comparing:', { userIdStr, complainantIdStr, isAdmin });
    console.log('Are equal?', userIdStr === complainantIdStr);

    // Check if user is authorized to update this case
    if (!userIdStr || (!isAdmin && complainantIdStr !== userIdStr)) {
      console.log('❌ Authorization failed');
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to edit this case.'
      });
    }

    console.log('✅ Authorization passed');

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

    console.log('✅ Case updated successfully');

    res.status(200).json({
      status: 'success',
      message: 'Case updated successfully',
      data: {
        case: updatedCase
      }
    });

  } catch (error: any) {
    console.error('❌ Update case error:', error);
    
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