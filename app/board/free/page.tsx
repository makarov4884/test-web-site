"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getPosts, addPost, deletePost, type Post } from "../../actions";
import { getSession, type UserSession } from "../../auth-actions";
import { FaCommentAlt, FaPen, FaTrash, FaFire, FaImage, FaSearch, FaTimes, FaHeart, FaEye } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function FreeBoardPage() {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isWriting, setIsWriting] = useState(false);
    const [user, setUser] = useState<UserSession | null>(null);

    // Write Form State
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [content, setContent] = useState("");
    const [image, setImage] = useState<string | undefined>(undefined);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const fetchPosts = async () => {
        const data = await getPosts();
        setPosts(data);
    };

    useEffect(() => {
        fetchPosts();
        // Fetch user session
        getSession().then(session => {
            setUser(session);
            if (session?.nickname) {
                setAuthor(session.nickname);
            }
        });
    }, []);

    const handleSubmit = async () => {
        if (!title.trim() || !author.trim() || !content.trim()) {
            alert("모든 필드를 입력해 주세요.");
            return;
        }

        await addPost({
            title,
            author,
            content,
            image,
        });

        setIsWriting(false);
        setTitle("");
        setAuthor("");
        setContent("");
        setImage(undefined);
        fetchPosts();
    };

    const handleDelete = async (id: string) => {
        if (confirm("정말 삭제하시겠습니까?")) {
            await deletePost(id);
            fetchPosts();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 flex flex-col font-sans">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-800">
                            <FaCommentAlt className="text-pink-500" />
                            자유 게시판
                        </h1>
                        <p className="text-gray-600 mt-2">자유롭게 이야기를 나누는 공간입니다.</p>
                    </div>
                    <button
                        onClick={() => setIsWriting(!isWriting)}
                        className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg text-white rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <FaPen /> 글쓰기
                    </button>
                </div>

                {/* Write Area */}
                {isWriting && (
                    <div className="mb-10 p-6 rounded-2xl bg-white border border-pink-300 shadow-2xl animate-in slide-in-from-top-4">
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-700 mb-1">제목</label>
                            <input
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
                                placeholder="제목을 입력하세요"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-700 mb-1">작성자</label>
                            {user ? (
                                <div className="w-full md:w-1/3 bg-pink-50 border border-pink-300 rounded-lg px-4 py-3 flex items-center gap-3">
                                    {user.profile_image ? (
                                        <img src={user.profile_image} alt="Profile" className="w-6 h-6 rounded-full" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                            {(user.nickname || user.id).charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="text-pink-700 font-bold">{user.nickname || user.id}</span>
                                    <span className="text-xs text-gray-500">(로그인됨)</span>
                                </div>
                            ) : (
                                <input
                                    className="w-full md:w-1/3 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
                                    placeholder="닉네임"
                                    value={author}
                                    onChange={e => setAuthor(e.target.value)}
                                />
                            )}
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-700 mb-1">이미지 업로드</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-pink-400 text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-pink-500 file:text-white file:cursor-pointer hover:file:bg-pink-600"
                            />
                            {image && (
                                <div className="mt-3 relative">
                                    <img src={image} alt="Preview" className="max-h-40 rounded-lg border border-gray-300" />
                                    <button
                                        onClick={() => setImage(undefined)}
                                        className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white text-xs"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-700 mb-1">내용</label>
                            <textarea
                                className="w-full h-40 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200 resize-none"
                                placeholder="내용을 입력하세요..."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsWriting(false)}
                                className="px-6 py-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-8 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-lg hover:shadow-lg transition-all"
                            >
                                등록
                            </button>
                        </div>
                    </div>
                )}



                {/* Posts List */}
                <div className="space-y-4">
                    {posts.length > 0 ? posts.map((post) => (
                        <Link key={post.id} href={`/board/free/${post.id}`}>
                            <div className="group p-5 rounded-2xl border border-pink-200 bg-white/80 hover:bg-pink-50 hover:border-pink-400 transition-all cursor-pointer hover:shadow-md">
                                <div className="flex items-start gap-4 flex-1">
                                    {post.image && (
                                        <img src={post.image} alt="Post" className="w-20 h-20 object-cover rounded-lg border border-gray-300 shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-lg text-gray-800 group-hover:text-pink-600 transition-colors truncate">
                                                {post.title}
                                            </h3>
                                            {post.isHot && <FaFire className="text-red-500 w-4 h-4" />}
                                            {post.hasImage && <FaImage className="text-pink-500 w-4 h-4" />}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                            <span className="text-gray-700 font-medium">{post.author}</span>
                                            <span>•</span>
                                            <span>{post.date}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <FaEye className="w-3 h-3" />
                                                {post.views}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1 text-red-500">
                                                <FaHeart className="w-3 h-3" />
                                                {post.likes?.length || 0}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1 text-blue-500">
                                                <FaCommentAlt className="w-3 h-3" />
                                                {post.comments?.length || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )) : (
                        <div className="py-20 text-center text-gray-500 border border-dashed border-gray-300 rounded-2xl bg-white/60">
                            아직 작성된 글이 없습니다. 첫 번째 글을 작성해보세요!
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
