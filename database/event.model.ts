import mongoose, { Document, Model, Schema } from 'mongoose';

// Strongly typed Event document interface
export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // Stored as ISO date string (YYYY-MM-DD)
  time: string; // Stored as HH:mm (24h)
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Helper to generate a URL-friendly slug from title
const generateSlug = (title: string): string => {
  return title
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non alphanumeric with dashes
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing dashes
};

// Helper to normalize date to ISO (YYYY-MM-DD)
const normalizeDate = (date: string): string => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid event date');
  }
  // Use UTC components to avoid TZ drift
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to normalize time to HH:mm (24h)
const normalizeTime = (time: string): string => {
  const trimmed = time.trim();

  // Accept already normalized HH:mm
  const hhmmMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (hhmmMatch) {
    return trimmed;
  }

  // Accept 12h format like `3:30 pm` or `03:30PM`
  const twelveHourMatch = /^\s*(1[0-2]|0?\d):([0-5]\d)\s*([AaPp][Mm])\s*$/.exec(trimmed);
  if (twelveHourMatch) {
    let hours = parseInt(twelveHourMatch[1], 10);
    const minutes = twelveHourMatch[2];
    const period = twelveHourMatch[3].toLowerCase();

    if (period === 'pm' && hours !== 12) {
      hours += 12;
    }
    if (period === 'am' && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  throw new Error('Invalid event time format');
};

// Basic non-empty string validation for required fields
const assertNonEmpty = (field: string, value: unknown): void => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Field "${field}" is required and must be a non-empty string`);
  }
};

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: { type: [String], required: true, default: [] },
    organizer: { type: String, required: true, trim: true },
    tags: { type: [String], required: true, default: [] },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

// Pre-save hook for slug generation, date/time normalization, and validation
EventSchema.pre<IEvent>('save', function preSave(next) {
  try {
    // Validate required string fields are non-empty
    assertNonEmpty('title', this.title);
    assertNonEmpty('description', this.description);
    assertNonEmpty('overview', this.overview);
    assertNonEmpty('image', this.image);
    assertNonEmpty('venue', this.venue);
    assertNonEmpty('location', this.location);
    assertNonEmpty('mode', this.mode);
    assertNonEmpty('audience', this.audience);
    assertNonEmpty('organizer', this.organizer);

    if (!Array.isArray(this.agenda) || this.agenda.length === 0) {
      throw new Error('Field "agenda" is required and must be a non-empty array');
    }

    if (!Array.isArray(this.tags) || this.tags.length === 0) {
      throw new Error('Field "tags" is required and must be a non-empty array');
    }

    // Only regenerate slug when the title changes
    if (this.isModified('title') || !this.slug) {
      this.slug = generateSlug(this.title);
    }

    // Normalize date and time values before persistence
    if (this.isModified('date')) {
      this.date = normalizeDate(this.date);
    }

    if (this.isModified('time')) {
      this.time = normalizeTime(this.time);
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Use existing model if already compiled (important for Next.js hot reloading)
export const Event: Model<IEvent> =
  (mongoose.models.Event as Model<IEvent>) || mongoose.model<IEvent>('Event', EventSchema);

export default Event;
