// server/src/models/Case.ts
import mongoose, { Schema, model, Document, Types } from 'mongoose';

export type CaseStatus =
  | 'registered'
  | 'under_review'
  | 'awaiting_response'
  | 'accepted'
  | 'witness_nomination'
  | 'panel_formation'
  | 'mediation_in_progress'
  | 'resolved'
  | 'unresolved'
  | 'cancelled';

export type CasePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IOppositePartyAddress {
  street?: string;
  city?: string;
  zipCode?: string;
}

export interface IOppositeParty {
  name: string;
  email?: string;
  phone?: string;
  address?: IOppositePartyAddress;
}

export interface IDocumentItem {
  fileName: string;
  originalName: string;
  fileType: 'image' | 'video' | 'audio' | 'document';
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId; // ref: User
}

export interface IMediationSession {
  scheduledAt: Date;
  duration: number; // minutes
  attendees: Types.ObjectId[]; // ref: User[]
  notes?: string;
  outcome?: string;
}

export interface IResolution {
  agreement?: string;
  agreedAt?: Date;
  agreedBy?: Types.ObjectId[]; // ref: User[]
  document?: string; // path to signed agreement
}

export interface ISimpleWitness {
  _id?: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  relation?: string;
  side: 'complainant' | 'opposite';
}

export interface IConsent {
  token: string | null;
  expiresAt: Date | null;
  respondedAt: Date | null;
  response: 'accepted' | 'declined' | null;
}

export interface ICase extends Document {
  caseNumber: string;
  caseType: 'family' | 'business' | 'criminal' | 'civil' | 'other';
  title: string;
  description: string;

  // Parties
  complainant: Types.ObjectId; // ref: User
  oppositeParty: IOppositeParty;

  // Legal
  isInCourt: boolean;
  courtDetails?: {
    caseNumber?: string;
    courtName?: string;
    firNumber?: string;
    policeStation?: string;
  };

  // Lifecycle
  status: CaseStatus;

  // Files
  documents: IDocumentItem[];

  // ✅ Witnesses (simple nomination shape)
  witnesses?: ISimpleWitness[];

  // ✅ Panel link (separate Panel model)
  panelId?: Types.ObjectId | null; // ref: Panel

  // Sessions / Resolution
  mediationSessions: IMediationSession[];
  resolution?: IResolution;

  // Communication
  oppositePartyNotified: boolean;
  oppositePartyResponse?: 'accepted' | 'declined';
  oppositePartyResponseAt?: Date;

  // Meta
  priority: CasePriority;
  tags: string[];
  notes: string;

  // ✅ Consent link data
  consent?: IConsent;

  createdAt: Date;
  updatedAt: Date;
}

const WitnessSchema = new Schema<ISimpleWitness>(
  {
    _id: { type: Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    relation: { type: String, trim: true },
    side: { type: String, enum: ['complainant', 'opposite'], required: true },
  },
  { _id: true }
);

const caseSchema = new Schema<ICase>(
  {
    caseNumber: { type: String, unique: true, index: true },

    caseType: {
      type: String,
      required: [true, 'Case type is required'],
      enum: ['family', 'business', 'criminal', 'civil', 'other'],
      index: true,
    },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },

    complainant: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    oppositeParty: {
      name: { type: String, required: true, trim: true },
      email: { type: String, lowercase: true, match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'] },
      phone: { type: String, match: [/^[+]?[\d\s\-\(\)]{10,}$/, 'Invalid phone number'] },
      address: {
        street: String,
        city: String,
        zipCode: String,
      },
    },

    isInCourt: { type: Boolean, default: false },

    courtDetails: {
      caseNumber: String,
      courtName: String,
      firNumber: String,
      policeStation: String,
    },

    status: {
      type: String,
      enum: [
        'registered',
        'under_review',
        'awaiting_response',
        'accepted',
        'witness_nomination',
        'panel_formation',
        'mediation_in_progress',
        'resolved',
        'unresolved',
        'cancelled',
      ],
      default: 'registered',
      index: true,
      required: true,
    },

    documents: [
      {
        fileName: { type: String, required: true },
        originalName: { type: String, required: true },
        fileType: { type: String, enum: ['image', 'video', 'audio', 'document'], required: true },
        fileSize: { type: Number, required: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      },
    ],

    // ✅ Simple witnesses (matches our endpoints)
    witnesses: [WitnessSchema],

    // ✅ Link to Panel model
    panelId: { type: Schema.Types.ObjectId, ref: 'Panel', default: null },

    mediationSessions: [
      {
        scheduledAt: { type: Date, required: true },
        duration: { type: Number, default: 0 },
        attendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        notes: String,
        outcome: String,
      },
    ],

    resolution: {
      agreement: String,
      agreedAt: Date,
      agreedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      document: String,
    },

    oppositePartyNotified: { type: Boolean, default: false },

    oppositePartyResponse: { type: String, enum: ['accepted', 'declined'] },

    oppositePartyResponseAt: Date,

    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },

    tags: [String],

    notes: { type: String, maxlength: 1000 },

    // ✅ Consent (one-time link data)
    consent: {
      token: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      respondedAt: { type: Date, default: null },
      response: { type: String, enum: ['accepted', 'declined', null], default: null },
    },
  },
  { timestamps: true }
);

// Generate sequential yearly case number like RIT-2025-000123
caseSchema.pre('save', async function (next) {
  if (!this.caseNumber) {
    const currentYear = new Date().getFullYear();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Find latest case for current year
      const latest = await mongoose
        .model<ICase>('Case')
        .findOne({ caseNumber: { $regex: `^RIT-${currentYear}-` } }, { caseNumber: 1 })
        .sort({ caseNumber: -1 })
        .lean();

      let nextNumber = 1;
      if (latest?.caseNumber) {
        const m = latest.caseNumber.match(/RIT-\d{4}-(\d{6})/);
        if (m) nextNumber = parseInt(m[1], 10) + 1;
      }

      const candidate = `RIT-${currentYear}-${String(nextNumber).padStart(6, '0')}`;

      const exists = await mongoose.model<ICase>('Case').findOne({ caseNumber: candidate }).lean();
      if (!exists) {
        this.caseNumber = candidate;
        break;
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        return next(new Error('Unable to generate unique case number'));
      }
    }
  }

  next();
});

export default mongoose.model<ICase>('Case', caseSchema);
