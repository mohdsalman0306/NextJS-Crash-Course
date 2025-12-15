import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import Event, { IEvent } from './event.model';

// Strongly typed Booking document interface
export interface IBooking extends Document {
  eventId: Types.ObjectId | IEvent['_id'];
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// Simple email regex for basic validation (not exhaustive but practical)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true, // Index for faster lookups by event
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

// Pre-save hook to validate email and referenced event existence
BookingSchema.pre<IBooking>('save', async function preSave(next) {
  try {
    // Validate email format before persisting booking
    if (typeof this.email !== 'string' || !EMAIL_REGEX.test(this.email)) {
      throw new Error('Invalid email address');
    }

    // Ensure the referenced event exists before creating the booking
    const eventExists = await Event.exists({ _id: this.eventId });
    if (!eventExists) {
      throw new Error('Referenced event does not exist');
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Use existing model if already compiled (supports Next.js hot reloading)
export const Booking: Model<IBooking> =
  (mongoose.models.Booking as Model<IBooking>) ||
  mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
