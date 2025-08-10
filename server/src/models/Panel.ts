import { Schema, model, Types, Document } from 'mongoose';

export type PanelRole = 'lawyer' | 'scholar' | 'community';

export interface IPanelMember {
  user: Types.ObjectId;       // ref User
  role: PanelRole;
}

export interface IPanel extends Document {
  case: Types.ObjectId;       // ref Case (unique per case)
  members: IPanelMember[];    // exactly 3: lawyer, scholar, community
  status: 'created' | 'active';
  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<IPanelMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['lawyer', 'scholar', 'community'], required: true },
  },
  { _id: true }
);

const panelSchema = new Schema<IPanel>(
  {
    case: { type: Schema.Types.ObjectId, ref: 'Case', required: true, unique: true },
    members: {
      type: [memberSchema],
      validate: {
        validator: (v: IPanelMember[]) => v.length === 3,
        message: 'Panel requires exactly 3 members.',
      },
      required: true,
    },
    status: { type: String, enum: ['created', 'active'], default: 'created' },
  },
  { timestamps: true }
);

export default model<IPanel>('Panel', panelSchema);
