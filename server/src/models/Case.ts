import mongoose, { Document, Schema } from 'mongoose';

export interface ICase extends Document {
  caseNumber: string;
  caseType: 'family' | 'business' | 'criminal' | 'civil' | 'other';
  title: string;
  description: string;
  
  // Parties involved
  complainant: mongoose.Types.ObjectId;
  oppositeParty: {
    name: string;
    email?: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      zipCode: string;
    };
  };
  
  // Legal status
  isInCourt: boolean;
  courtDetails?: {
    caseNumber: string;
    courtName: string;
    firNumber?: string;
    policeStation?: string;
  };
  
  // Case lifecycle
  status: 'registered' | 'under_review' | 'awaiting_response' | 'accepted' | 
          'witness_nomination' | 'panel_formation' | 'mediation_in_progress' | 
          'resolved' | 'unresolved' | 'cancelled';
  
  // Documents and evidence
  documents: [{
    fileName: string;
    originalName: string;
    fileType: 'image' | 'video' | 'audio' | 'document';
    fileSize: number;
    uploadedAt: Date;
    uploadedBy: mongoose.Types.ObjectId;
  }];
  
  // Mediation details
  witnesses: [{
    user: mongoose.Types.ObjectId;
    nominatedBy: mongoose.Types.ObjectId;
    status: 'nominated' | 'accepted' | 'declined';
    nominatedAt: Date;
  }];
  
  panelMembers: [{
    user: mongoose.Types.ObjectId;
    role: 'lawyer' | 'religious_scholar' | 'society_member';
    invitedAt: Date;
    status: 'pending' | 'accepted' | 'declined';
  }];
  
  // Mediation sessions
  mediationSessions: [{
    scheduledAt: Date;
    duration: number; // in minutes
    attendees: [mongoose.Types.ObjectId];
    notes?: string;
    outcome?: string;
  }];
  
  // Final resolution
  resolution?: {
    agreement: string;
    agreedAt: Date;
    agreedBy: [mongoose.Types.ObjectId];
    document?: string; // path to signed agreement
  };
  
  // Communication
  oppositePartyNotified: boolean;
  oppositePartyResponse?: 'accepted' | 'declined';
  oppositePartyResponseAt?: Date;
  
  // Metadata
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: [string];
  notes: string;
  
  createdAt: Date;
  updatedAt: Date;

  consent?: {
    token: string | null;
    expiresAt: Date | null;
    respondedAt: Date | null;
    response: 'accepted' | 'declined' | null;
};


}

const caseSchema = new Schema<ICase>({
  caseNumber: {
    type: String,
    unique: true,
    index: true
  },
  caseType: {
    type: String,
    required: [true, 'Case type is required'],
    enum: ['family', 'business', 'criminal', 'civil', 'other'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Case title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Case description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  complainant: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  oppositeParty: {
    name: {
      type: String,
      required: [true, 'Opposite party name is required'],
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      match: [/^[+]?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
    },
    address: {
      street: String,
      city: String,
      zipCode: String
    }
  },
  
  isInCourt: {
    type: Boolean,
    default: false
  },
  
  courtDetails: {
    caseNumber: String,
    courtName: String,
    firNumber: String,
    policeStation: String
  },
  
  status: {
    type: String,
    enum: ['registered', 'under_review', 'awaiting_response', 'accepted', 
           'witness_nomination', 'panel_formation', 'mediation_in_progress', 
           'resolved', 'unresolved', 'cancelled'],
    default: 'registered',
    index: true
  },
  
  documents: [{
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { 
      type: String, 
      enum: ['image', 'video', 'audio', 'document'],
      required: true 
    },
    fileSize: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  }],
  
  witnesses: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nominatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
      type: String, 
      enum: ['nominated', 'accepted', 'declined'],
      default: 'nominated'
    },
    nominatedAt: { type: Date, default: Date.now }
  }],
  
  panelMembers: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { 
      type: String, 
      enum: ['lawyer', 'religious_scholar', 'society_member'],
      required: true 
    },
    invitedAt: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    }
  }],
  
  mediationSessions: [{
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 0 },
    attendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    notes: String,
    outcome: String
  }],
  
  resolution: {
    agreement: String,
    agreedAt: Date,
    agreedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    document: String
  },
  
  oppositePartyNotified: {
    type: Boolean,
    default: false
  },
  
  oppositePartyResponse: {
    type: String,
    enum: ['accepted', 'declined']
  },
  
  oppositePartyResponseAt: Date,
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  tags: [String],
  
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },

  consent: {
    token: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    respondedAt: { type: Date, default: null },
    response: { type: String, enum: ['accepted', 'declined', null], default: null },
  },

  
}, {
  timestamps: true
});

// Improved case number generation with conflict resolution
caseSchema.pre('save', async function(next) {
  if (!this.caseNumber) {
    const currentYear = new Date().getFullYear();
    let caseNumber = '';
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      try {
        // Find the highest existing case number for this year
        const latestCase = await mongoose.model('Case').findOne(
          { caseNumber: { $regex: `^RIT-${currentYear}-` } },
          { caseNumber: 1 }
        ).sort({ caseNumber: -1 });
        
        let nextNumber = 1;
        if (latestCase && latestCase.caseNumber) {
          // Extract number from case number like "RIT-2025-000123"
          const match = latestCase.caseNumber.match(/RIT-\d{4}-(\d{6})/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        
        caseNumber = `RIT-${currentYear}-${String(nextNumber).padStart(6, '0')}`;
        
        // Check if this case number already exists
        const existingCase = await mongoose.model('Case').findOne({ caseNumber });
        if (!existingCase) {
          this.caseNumber = caseNumber;
          break;
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Unable to generate unique case number after multiple attempts');
        }
      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        attempts++;
      }
    }
  }
  next();
});

export default mongoose.model<ICase>('Case', caseSchema);