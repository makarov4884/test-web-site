"use server";

import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'streamers.json');

export interface Streamer {
    id: string;
    bjId: string;
    name: string;
}

async function ensureDB() {
    try {
        await fs.access(DB_PATH);
    } catch {
        await fs.writeFile(DB_PATH, '[]', 'utf-8');
    }
}

export async function getStreamers(): Promise<Streamer[]> {
    await ensureDB();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

export async function addStreamer(bjId: string, name: string): Promise<Streamer> {
    await ensureDB();
    const streamers = await getStreamers();

    if (streamers.find(s => s.bjId === bjId)) {
        throw new Error("Already exists");
    }

    const newStreamer = {
        id: Date.now().toString(),
        bjId,
        name
    };

    streamers.push(newStreamer);
    await fs.writeFile(DB_PATH, JSON.stringify(streamers, null, 2), 'utf-8');
    return newStreamer;
}

export async function removeStreamer(id: string): Promise<void> {
    await ensureDB();
    const streamers = await getStreamers();
    const filtered = streamers.filter(s => s.id !== id);
    await fs.writeFile(DB_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
}

const SCHEDULE_DB_PATH = path.join(process.cwd(), 'data', 'schedules.json');

export interface ScheduleItem {
    id: string;
    date: string; // YYYY-MM-DD
    content: string;
    type: 'normal' | 'event' | 'rest';
    authorId: string; // ID of the person who wrote it
}

async function ensureScheduleDB() {
    try {
        await fs.access(SCHEDULE_DB_PATH);
    } catch {
        await fs.writeFile(SCHEDULE_DB_PATH, '[]', 'utf-8');
    }
}

export async function getSchedules(): Promise<ScheduleItem[]> {
    await ensureScheduleDB();
    const data = await fs.readFile(SCHEDULE_DB_PATH, 'utf-8');
    try {
        return JSON.parse(data);
    } catch {
        return [];
    }
}

export async function addSchedule(schedule: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
    await ensureScheduleDB();
    const schedules = await getSchedules();

    // Logic: Only one schedule per day? Or multiple?
    // Let's allow multiple but typically one main one per streamer. 
    // For the weekly view, we might just pick the first one or merge them.

    const newItem = { ...schedule, id: Date.now().toString() };
    schedules.push(newItem);

    // Sort by date maybe?
    schedules.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    await fs.writeFile(SCHEDULE_DB_PATH, JSON.stringify(schedules, null, 2), 'utf-8');
    return newItem;
}

export async function deleteSchedule(id: string): Promise<void> {
    await ensureScheduleDB();
    const schedules = await getSchedules();
    const filtered = schedules.filter(s => s.id !== id);
    await fs.writeFile(SCHEDULE_DB_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
}

const POSTS_DB_PATH = path.join(process.cwd(), 'data', 'posts.json');

export interface Comment {
    id: string;
    author: string;
    content: string;
    date: string;
}

export interface Post {
    id: string;
    title: string;
    author: string;
    content: string;
    image?: string; // Base64 encoded image or URL
    date: string; // YYYY.MM.DD
    views: number;
    likes: string[]; // Array of user IDs who liked
    comments: Comment[];
    isHot: boolean;
    hasImage: boolean;
}

async function ensurePostsDB() {
    try {
        await fs.access(POSTS_DB_PATH);
    } catch {
        await fs.writeFile(POSTS_DB_PATH, '[]', 'utf-8');
    }
}

export async function getPosts(): Promise<Post[]> {
    await ensurePostsDB();
    const data = await fs.readFile(POSTS_DB_PATH, 'utf-8');
    try {
        return JSON.parse(data);
    } catch {
        return [];
    }
}

export async function addPost(post: Omit<Post, 'id' | 'date' | 'views' | 'isHot' | 'hasImage' | 'likes' | 'comments'>): Promise<Post> {
    await ensurePostsDB();
    const posts = await getPosts();

    const now = new Date();

    const newPost: Post = {
        ...post,
        id: Date.now().toString(),
        date: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        views: 0,
        likes: [],
        comments: [],
        isHot: false,
        hasImage: !!post.image
    };

    posts.unshift(newPost);
    await fs.writeFile(POSTS_DB_PATH, JSON.stringify(posts, null, 2), 'utf-8');
    return newPost;
}

export async function deletePost(id: string): Promise<void> {
    await ensurePostsDB();
    const posts = await getPosts();
    const filtered = posts.filter(p => p.id !== id);
    await fs.writeFile(POSTS_DB_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
}
