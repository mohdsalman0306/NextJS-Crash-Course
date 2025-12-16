'use server';

import Event from "@/database/event.model";
import connectDB from "../mongodb";

export const getSimilarEventsBySlug = async (slug: string) => {
    try {
        await connectDB();
        const event = await Event.findOne({ slug }).lean();
        const similarEvents = await Event.find({ _id: { $ne: event?._id }, tags: { $in: event.tags } }).lean();
        return similarEvents;
    } catch (error) {
        return [];
    }
}