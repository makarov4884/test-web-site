"use server";

import fs from 'fs/promises';
import path from 'path';
import { Post, Comment } from './actions';

const POSTS_DB_PATH = path.join(process.cwd(), 'data', 'posts.json');

async function getPosts(): Promise<Post[]> {
    try {
        const data = await fs.readFile(POSTS_DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function savePosts(posts: Post[]): Promise<void> {
    await fs.writeFile(POSTS_DB_PATH, JSON.stringify(posts, null, 2), 'utf-8');
}

// Toggle like on a post
export async function toggleLike(postId: string, userId: string): Promise<{ success: boolean; likesCount: number }> {
    const posts = await getPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) {
        return { success: false, likesCount: 0 };
    }

    const likeIndex = post.likes.indexOf(userId);

    if (likeIndex > -1) {
        // Unlike
        post.likes.splice(likeIndex, 1);
    } else {
        // Like
        post.likes.push(userId);
    }

    await savePosts(posts);
    return { success: true, likesCount: post.likes.length };
}

// Add comment to a post
export async function addComment(postId: string, author: string, content: string, authorProfileImage?: string, authorId?: string): Promise<{ success: boolean; comment?: Comment }> {
    if (!content.trim()) {
        return { success: false };
    }

    const posts = await getPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) {
        return { success: false };
    }

    const now = new Date();
    const newComment: Comment = {
        id: Date.now().toString(),
        author,
        authorId,
        authorProfileImage, // 추가
        content,
        date: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    };

    post.comments.push(newComment);
    await savePosts(posts);

    return { success: true, comment: newComment };
}

// Increment view count
export async function incrementViews(postId: string): Promise<{ success: boolean; views: number }> {
    const posts = await getPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) {
        return { success: false, views: 0 };
    }

    post.views += 1;
    await savePosts(posts);

    return { success: true, views: post.views };
}

// Delete comment
export async function deleteComment(postId: string, commentId: string): Promise<{ success: boolean }> {
    const posts = await getPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) {
        return { success: false };
    }

    post.comments = post.comments.filter(c => c.id !== commentId);
    await savePosts(posts);

    return { success: true };
}

// Update post
export async function updatePost(postId: string, title: string, content: string, image?: string): Promise<{ success: boolean }> {
    if (!title.trim() || !content.trim()) {
        return { success: false };
    }

    const posts = await getPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) {
        return { success: false };
    }

    post.title = title;
    post.content = content;
    if (image !== undefined) {
        post.image = image;
    }
    post.hasImage = !!post.image;

    await savePosts(posts);
    return { success: true };
}

// Update comment
export async function updateComment(postId: string, commentId: string, content: string): Promise<{ success: boolean }> {
    if (!content.trim()) {
        return { success: false };
    }

    const posts = await getPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) {
        return { success: false };
    }

    const comment = post.comments.find(c => c.id === commentId);
    if (!comment) {
        return { success: false };
    }

    comment.content = content;
    await savePosts(posts);

    return { success: true };
}
