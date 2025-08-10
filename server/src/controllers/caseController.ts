import { Request, Response } from 'express';
import { Case, User, Panel } from '../models';
import { Types } from 'mongoose';

import { signConsentToken, verifyConsentToken } from '../utils/token';
import { sendOppositePartyInvite } from '../utils/notify';



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

// POST /api/cases/:caseId/notify-opposite-party   (admin-only)
export const notifyOppositeParty = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const doc = await Case.findById(caseId);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Case not found' });

    // must have contact
    const contactEmail = (doc as any).oppositeParty?.email;
    const contactPhone = (doc as any).oppositeParty?.phone;
    if (!contactEmail && !contactPhone) {
      return res.status(400).json({ status: 'error', message: 'Opposite party contact missing' });
    }

    // create token (7 days)
    const token = signConsentToken(doc.id, 7);
    doc.consent = {
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      respondedAt: null,
      response: null,
    };

    // move to awaiting_response if not already there
    if (doc.status === 'registered' || doc.status === 'under_review') {
      doc.status = 'awaiting_response';
    }

    await doc.save();

    const base = (process.env.CLIENT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const url = `${base}/consent/${encodeURIComponent(token)}`;
    await sendOppositePartyInvite({
      email: contactEmail,
      phone: contactPhone,
      url,
      caseNumber: (doc as any).caseNumber,
      name: (doc as any).oppositeParty?.name,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Invitation sent',
      data: { status: doc.status, consent: { expiresAt: doc.consent?.expiresAt } },
    });
  } catch (err: any) {
    console.error('notifyOppositeParty error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to send invite', error: err.message });
  }
};

// GET /api/public/consent/:token  (no auth)
export const getConsentByToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const v = verifyConsentToken(token);
    if (!v.ok) return res.status(400).json({ status: 'error', message: `Invalid token (${v.reason})` });

    const doc = await Case.findById(v.caseId).select('caseNumber caseType description oppositeParty consent status');
    if (!doc || doc.consent?.token !== token) {
      return res.status(404).json({ status: 'error', message: 'Consent not found' });
    }
    if (doc.consent?.expiresAt && doc.consent.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ status: 'error', message: 'Link expired' });
    }
    if (doc.consent?.respondedAt) {
      return res.status(400).json({ status: 'error', message: 'Already responded' });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        caseNumber: (doc as any).caseNumber,
        caseType: (doc as any).caseType,
        description: (doc as any).description,
        oppositeParty: (doc as any).oppositeParty,
        status: doc.status,
      },
    });
  } catch (err: any) {
    console.error('getConsentByToken error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to load consent', error: err.message });
  }
};

// POST /api/public/consent/:token { action: 'accept' | 'decline' }  (no auth)
export const postConsentResponse = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { action } = req.body as { action: 'accept' | 'decline' };

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ status: 'error', message: 'Invalid action' });
    }

    const v = verifyConsentToken(token);
    if (!v.ok) return res.status(400).json({ status: 'error', message: `Invalid token (${v.reason})` });

    const doc = await Case.findById(v.caseId);
    if (!doc || doc.consent?.token !== token) {
      return res.status(404).json({ status: 'error', message: 'Consent not found' });
    }
    if (doc.consent?.expiresAt && doc.consent.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ status: 'error', message: 'Link expired' });
    }
    if (doc.consent?.respondedAt) {
      return res.status(400).json({ status: 'error', message: 'Already responded' });
    }

    // record response + status
    doc.consent = {
      ...(doc.consent || { token: null, expiresAt: null }),
      respondedAt: new Date(),
      response: action === 'accept' ? 'accepted' : 'declined',
      token: null, // one-time use
    };

    if (action === 'accept') {
      // only move if we were awaiting_response
      if (doc.status === 'awaiting_response') doc.status = 'accepted';
    } else {
      // decline → unresolved
      if (doc.status !== 'resolved') doc.status = 'unresolved';
    }

    await doc.save();

    return res.status(200).json({
      status: 'success',
      message: `Response recorded: ${action}`,
      data: { status: doc.status },
    });
  } catch (err: any) {
    console.error('postConsentResponse error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to record response', error: err.message });
  }
};


type CaseStatus =
  | 'registered' | 'under_review' | 'awaiting_response' | 'accepted'
  | 'witness_nomination' | 'panel_formation' | 'mediation_in_progress'
  | 'resolved' | 'unresolved' | 'cancelled';

// POST /api/admin/cases/:id/witnesses
export const addWitnesses = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as {
      witnesses: Array<{ name: string; email?: string; phone?: string; relation?: string; side: 'complainant' | 'opposite' }>;
    };

    if (!body?.witnesses?.length) {
      return res.status(400).json({ status: 'error', message: 'No witnesses provided' });
    }

    const doc = await Case.findById(id);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Case not found' });

    // Only allow from accepted or witness_nomination
    if (!['accepted', 'witness_nomination'].includes(doc.status as CaseStatus)) {
      return res.status(400).json({ status: 'error', message: `Cannot add witnesses in status "${doc.status}"` });
    }

    doc.witnesses = [...(doc.witnesses || []), ...body.witnesses.map(w => ({ ...w }))];

    // Move to witness_nomination if coming from accepted
    if (doc.status === 'accepted') {
      doc.status = 'witness_nomination';
    }

    await doc.save();
    return res.status(200).json({ status: 'success', data: { witnesses: doc.witnesses, status: doc.status } });
  } catch (err: any) {
    console.error('addWitnesses error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to add witnesses', error: err.message });
  }
};

// DELETE /api/admin/cases/:id/witnesses/:wid
export const removeWitness = async (req: Request, res: Response) => {
  try {
    const { id, wid } = req.params;
    const doc = await Case.findById(id);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Case not found' });

    if (!doc.witnesses?.length) {
      return res.status(404).json({ status: 'error', message: 'No witnesses found' });
    }

    const before = doc.witnesses.length;
    doc.witnesses = doc.witnesses.filter((w: any) => w._id?.toString() !== wid);
    if (doc.witnesses.length === before) {
      return res.status(404).json({ status: 'error', message: 'Witness not found' });
    }

    await doc.save();
    return res.status(200).json({ status: 'success', data: { witnesses: doc.witnesses } });
  } catch (err: any) {
    console.error('removeWitness error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to remove witness', error: err.message });
  }
};

// POST /api/admin/cases/:id/panel
export const createPanel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as {
      members: Array<{ user: string; role: string }>;
    };

    if (!body?.members || body.members.length !== 3) {
      return res.status(400).json({ status: 'error', message: 'Provide exactly 3 members (lawyer, scholar, community)' });
    }

    const allowedRoles = ['lawyer', 'scholar', 'community'] as const;
    type PanelRole = (typeof allowedRoles)[number];

    // normalize roles and verify presence of all three
    const normalized = body.members.map(m => ({ user: m.user, role: (m.role || '').toLowerCase().trim() }));
    const hasAll = allowedRoles.every(r => normalized.some(m => m.role === r));
    if (!hasAll) {
      return res.status(400).json({ status: 'error', message: 'Panel must include roles: lawyer, scholar, community' });
    }

    const doc = await Case.findById(id);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Case not found' });

    if (!['witness_nomination', 'panel_formation'].includes(doc.status as any)) {
      return res.status(400).json({ status: 'error', message: `Cannot create panel in status "${doc.status}"` });
    }

    if (doc.panelId) {
      return res.status(409).json({ status: 'error', message: 'Panel already exists for this case' });
    }

    // verify users exist and are panel_member
    const userIds = normalized.map(m => m.user);
    const users = await User.find({ _id: { $in: userIds }, role: 'panel_member' }).select('_id role');
    if (users.length !== 3) {
      return res.status(400).json({ status: 'error', message: 'All members must be valid users with role panel_member' });
    }

    const members = normalized.map(m => {
      if (!allowedRoles.includes(m.role as PanelRole)) {
        throw new Error(`Invalid role: ${m.role}`);
      }
      return { user: new Types.ObjectId(m.user), role: m.role as PanelRole };
    });

    const newPanel = await Panel.create({
      case: doc._id,
      members,
      status: 'created',
    });

    // 👇 cast _id to satisfy TS where Panel._id is typed as unknown
    doc.panelId = newPanel._id as unknown as Types.ObjectId;
    doc.status = 'panel_formation' as any;
    await doc.save();

    return res.status(201).json({ status: 'success', data: { panel: newPanel, caseStatus: doc.status } });
  } catch (err: any) {
    console.error('createPanel error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to create panel', error: err.message });
  }
};


// PUT /api/admin/panels/:panelId/activate
export const activatePanel = async (req: Request, res: Response) => {
  try {
    const { panelId } = req.params;
    const panel = await Panel.findById(panelId);
    if (!panel) return res.status(404).json({ status: 'error', message: 'Panel not found' });

    const doc = await Case.findById(panel.case);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Case not found' });

    panel.status = 'active';
    await panel.save();

    // Move case forward
    if (doc.status === 'panel_formation') {
      doc.status = 'mediation_in_progress';
      await doc.save();
    }

    return res.status(200).json({ status: 'success', data: { panel, caseStatus: doc.status } });
  } catch (err: any) {
    console.error('activatePanel error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to activate panel', error: err.message });
  }
};



