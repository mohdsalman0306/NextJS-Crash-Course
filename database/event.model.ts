import mongoose, { Document, Model, Schema } from 'mongoose';

// TypeScript interface for Event document
export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // ISO format: YYYY-MM-DD
  time: string; // 24-hour format: HH:mm
  mode: 'online' | 'offline' | 'hybrid';
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generates URL-friendly slug from title
 * Handles special characters and normalizes to lowercase with hyphens
 */
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Normalizes date string to ISO format (YYYY-MM-DD)
 * Uses UTC to avoid timezone drift
 */
const normalizeDate = (date: string): string => {
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw new Error('Invalid date format. Please provide a valid date.');
  }
  
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Normalizes time to 24-hour format (HH:mm)
 * Accepts both 24-hour (HH:mm) and 12-hour (h:mm AM/PM) formats
 */
const normalizeTime = (time: string): string => {
  const trimmed = time.trim();

  // Already in 24-hour format (HH:mm)
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) {
    return trimmed;
  }

  // Convert 12-hour format to 24-hour
  const match = /^(1[0-2]|0?\d):([0-5]\d)\s*([AaPp][Mm])$/.exec(trimmed);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toLowerCase();

    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  throw new Error('Invalid time format. Use HH:mm or h:mm AM/PM format.');
};

// Mongoose schema definition
const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    overview: {
      type: String,
      required: [true, 'Overview is required'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    time: {
      type: String,
      required: [true, 'Time is required'],
    },
    mode: {
      type: String,
      required: [true, 'Mode is required'],
      enum: {
        values: ['online', 'offline', 'hybrid'],
        message: 'Mode must be online, offline, or hybrid',
      },
      lowercase: true,
    },
    audience: {
      type: String,
      required: [true, 'Audience is required'],
      trim: true,
    },
    agenda: {
      type: [String],
      required: [true, 'Agenda is required'],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'Agenda must contain at least one item',
      },
    },
    organizer: {
      type: String,
      required: [true, 'Organizer is required'],
      trim: true,
    },
    tags: {
      type: [String],
      required: [true, 'Tags are required'],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'Tags must contain at least one item',
      },
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Unique index on slug for efficient lookups and duplicate prevention
EventSchema.index({ slug: 1 }, { unique: true });

// Optional: Index on date for chronological queries
EventSchema.index({ date: 1 });

/**
 * Pre-save hook for slug generation and date/time normalization
 * Only processes fields that have been modified to optimize performance
 */
EventSchema.pre('save', function (next) {
  try {
    // Generate slug only when title is modified or new
    if (this.isModified('title')) {
      this.slug = generateSlug(this.title);
    }

    // Normalize date only when modified
    if (this.isModified('date')) {
      this.date = normalizeDate(this.date);
    }

    // Normalize time only when modified
    if (this.isModified('time')) {
      this.time = normalizeTime(this.time);
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Create and export the model (supports Next.js hot reloading)
const Event: Model<IEvent> = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

export default Event;