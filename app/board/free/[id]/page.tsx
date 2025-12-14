"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getPosts, deletePost, type Post } from "../../../actions";
import { getSession, type UserSession } from "../../../auth-actions";
import { toggleLike, addComment, incrementViews, deleteComment, updatePost, updateComment } from "../../../post-actions";
import { FaHeart, FaRegHeart, FaEye, FaCommentAlt, FaArrowLeft, FaTrash, FaEdit, FaTimes } from "react-icons/fa";

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [post, setPost] = useState<Post | null>(null);
    const [user, setUser] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [commentText, setCommentText] = useState("");
    const [isLiked, setIsLiked] = useState(false);

    // Edit states
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editImage, setEditImage] = useState<string | undefined>(undefined);

    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            // Get user session
            const session = await getSession();
            setUser(session);

            // Get post
            const posts = await getPosts();
            const foundPost = posts.find(p => p.id === id);

            if (foundPost) {
                setPost(foundPost);
                // Increment views
                await incrementViews(id);
                // Check if user liked
                if (session) {
                    setIsLiked(foundPost.likes?.includes(session.id) || false);
                }
            }
            setIsLoading(false);
        };

        fetchData();
    }, [id]);

    const handleLike = async () => {
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        const result = await toggleLike(id, user.id);
        if (result.success && post) {
            setIsLiked(!isLiked);
            setPost({
                ...post, likes: isLiked
                    ? post.likes.filter(id => id !== user.id)
                    : [...post.likes, user.id]
            });
        }
    };

    const handleAddComment = async () => {
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        if (!commentText.trim()) {
            alert("댓글 내용을 입력해주세요.");
            return;
        }

        const result = await addComment(id, user.nickname || user.id, commentText, user.profile_image, user.id);
        if (result.success && result.comment && post) {
            setPost({ ...post, comments: [...post.comments, result.comment] });
            setCommentText("");
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("댓글을 삭제하시겠습니까?")) return;

        const result = await deleteComment(id, commentId);
        if (result.success && post) {
            setPost({ ...post, comments: post.comments.filter(c => c.id !== commentId) });
        }
    };

    const handleDeletePost = async () => {
        if (!confirm("게시글을 삭제하시겠습니까?")) return;

        await deletePost(id);
        router.push("/board/free");
    };

    const handleEditPost = () => {
        if (!post) return;
        setEditTitle(post.title);
        setEditContent(post.content);
        setEditImage(post.image);
        setIsEditingPost(true);
    };

    const handleSavePost = async () => {
        if (!editTitle.trim() || !editContent.trim()) {
            alert("제목과 내용을 입력해주세요.");
            return;
        }

        const result = await updatePost(id, editTitle, editContent, editImage);
        if (result.success && post) {
            setPost({ ...post, title: editTitle, content: editContent, image: editImage, hasImage: !!editImage });
            setIsEditingPost(false);
        }
    };

    const handleEditComment = (commentId: string, currentContent: string) => {
        setEditingCommentId(commentId);
        setEditCommentText(currentContent);
    };

    const handleSaveComment = async (commentId: string) => {
        if (!editCommentText.trim()) {
            alert("댓글 내용을 입력해주세요.");
            return;
        }

        const result = await updateComment(id, commentId, editCommentText);
        if (result.success && post) {
            const updatedComments = post.comments.map(c =>
                c.id === commentId ? { ...c, content: editCommentText } : c
            );
            setPost({ ...post, comments: updatedComments });
            setEditingCommentId(null);
            setEditCommentText("");
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 flex flex-col font-sans">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
                        <div className="text-pink-500 font-bold">로딩 중...</div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 flex flex-col font-sans">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl flex items-center justify-center">
                    <div className="text-center p-10 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-200 animate-in zoom-in-95 duration-300 max-w-md w-full">
                        <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FaCommentAlt className="text-pink-500 w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">로그인이 필요한 공간이에요!</h2>
                        <p className="text-gray-600 mb-8 leading-relaxed">
                            이 게시글을 확인하려면<br />
                            로그인이 필요합니다.
                        </p>
                        <div className="text-sm text-pink-500 font-medium bg-pink-50 px-4 py-3 rounded-xl border border-pink-100 inline-block">
                            ↗️ 우측 상단 <b>로그인</b> 버튼을 눌러주세요
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 flex flex-col font-sans">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl text-center">
                    <p className="text-gray-500">게시글을 찾을 수 없습니다.</p>
                </main>
                <Footer />
            </div>
        );
    }

    // Check if current user is author
    const isAuthor = user && post && (
        (post.authorId ? user.id === post.authorId : (user.nickname === post.author || user.id === post.author))
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-pink-50 to-purple-50 flex flex-col font-sans">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
                >
                    <FaArrowLeft /> 목록으로
                </button>

                {/* Post Content */}
                <div className="bg-white rounded-2xl border border-pink-200 overflow-hidden shadow-lg">
                    {/* Header */}
                    <div className="p-6 border-b border-pink-200">
                        {isEditingPost ? (
                            <div className="space-y-4">
                                <input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full text-3xl font-bold bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
                                    placeholder="제목"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="flex items-start justify-between mb-4">
                                    <h1 className="text-3xl font-bold flex-1 text-gray-800">{post.title}</h1>
                                    {isAuthor && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleEditPost}
                                                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                                title="수정"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={handleDeletePost}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                title="삭제"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        {post.authorProfileImage ? (
                                            <img src={post.authorProfileImage} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                                        ) : (isAuthor && user?.profile_image) ? (
                                            <img src={user.profile_image} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                                                {post.author.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="text-gray-700 font-medium">{post.author}</span>
                                    </div>
                                    <span>•</span>
                                    <span>{post.date}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <FaEye className="w-3 h-3" />
                                        {post.views}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {isEditingPost ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2">이미지</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-pink-500 file:text-white file:cursor-pointer hover:file:bg-pink-600"
                                    />
                                    {editImage && (
                                        <div className="mt-3 relative">
                                            <img src={editImage} alt="Preview" className="max-h-60 rounded-lg border border-gray-300" />
                                            <button
                                                onClick={() => setEditImage(undefined)}
                                                className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white"
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full h-60 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200 resize-none"
                                    placeholder="내용"
                                />
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setIsEditingPost(false)}
                                        className="px-6 py-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleSavePost}
                                        className="px-8 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-lg hover:shadow-lg transition-all"
                                    >
                                        저장
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {post.image && (
                                    <img src={post.image} alt="Post" className="max-w-full rounded-lg mb-6 border border-gray-300" />
                                )}
                                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {post.content}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Like Button */}
                    <div className="p-6 border-t border-pink-200 flex justify-center">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${isLiked
                                ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white hover:shadow-lg'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {isLiked ? <FaHeart /> : <FaRegHeart />}
                            좋아요 {post.likes.length}
                        </button>
                    </div>
                </div>

                {/* Comments Section */}
                <div className="mt-8 bg-white rounded-2xl border border-pink-200 p-6 shadow-lg">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                        <FaCommentAlt className="text-pink-500" />
                        댓글 {post.comments.length}
                    </h3>

                    {/* Comment Input */}
                    {user ? (
                        <div className="mb-6">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="댓글을 입력하세요..."
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200 resize-none"
                                rows={3}
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={handleAddComment}
                                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                                >
                                    댓글 작성
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6 p-4 bg-gray-100 rounded-lg text-center text-gray-600">
                            로그인 후 댓글을 작성할 수 있습니다.
                        </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-4">
                        {post.comments.length > 0 ? (
                            post.comments.map((comment) => (
                                <div key={comment.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 group">
                                    {editingCommentId === comment.id ? (
                                        <div className="space-y-3">
                                            <textarea
                                                value={editCommentText}
                                                onChange={(e) => setEditCommentText(e.target.value)}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200 resize-none"
                                                rows={3}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingCommentId(null);
                                                        setEditCommentText("");
                                                    }}
                                                    className="px-4 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600 text-sm transition-colors"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={() => handleSaveComment(comment.id)}
                                                    className="px-6 py-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:shadow-lg transition-all"
                                                >
                                                    저장
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-3">
                                            <div className="shrink-0">
                                                {comment.authorProfileImage ? (
                                                    <img src={comment.authorProfileImage} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                                ) : (user && (user.nickname === comment.author || user.id === comment.author) && user.profile_image) ? (
                                                    <img src={user.profile_image} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold">
                                                        {comment.author.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-bold text-pink-600">{comment.author}</span>
                                                    <span className="text-xs text-gray-500">{comment.date}</span>
                                                </div>
                                                <p className="text-gray-700 leading-relaxed">{comment.content}</p>
                                            </div>
                                            {user && ((comment.authorId && user.id === comment.authorId) || (!comment.authorId && (user.nickname === comment.author || user.id === comment.author))) && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => handleEditComment(comment.id, comment.content)}
                                                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                                        title="수정"
                                                    >
                                                        <FaEdit size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                        title="삭제"
                                                    >
                                                        <FaTrash size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-500">
                                첫 번째 댓글을 작성해보세요!
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
