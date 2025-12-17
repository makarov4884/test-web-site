'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaSearch, FaTimes, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { IoIosArrowBack } from 'react-icons/io';

interface Signature {
    id: number;
    title: string;
    isNew: boolean;
    category: string;
    videoUrl?: string;
    thumbnailUrl?: string;
}

interface CatchVideo {
    id: string;
    title: string;
    thumbnailUrl: string;
    videoUrl: string;
    member: string;
    date: string;
}

const FILTERS = [
    { id: 'all', label: 'ALL' },
    { id: 'new', label: 'NEW' },
    { id: '1000', label: '1000' },
    { id: '2000-4000', label: '2000-4000' },
    { id: '3000-9000', label: '3000-9000' },
    { id: '10000', label: '10000' },
    { id: '20000-30000', label: '20000-30000' },
    { id: '30000', label: '30000+' },
];

export default function SignaturePage() {
    const router = useRouter();
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedItem, setSelectedItem] = useState<Signature | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<Signature> | null>(null);
    const [catchVideos, setCatchVideos] = useState<CatchVideo[]>([]);
    const [selectedMember, setSelectedMember] = useState<string>('');
    const [loadingCatch, setLoadingCatch] = useState(false);
    const [selectedCatchVideo, setSelectedCatchVideo] = useState<CatchVideo | null>(null);

    useEffect(() => {
        fetch('/api/signatures')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setSignatures(data);
            })
            .catch(err => console.error("Failed to load signatures:", err));
    }, []);

    useEffect(() => {
        if (selectedItem) {
            setLoadingCatch(true);
            setSelectedCatchVideo(null);
            fetch('/api/catch-videos')
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setCatchVideos(data.videos);
                        const members = Array.from(new Set(data.videos.map((v: CatchVideo) => v.member)))
                            .filter(m => m !== '기타');
                        if (members.length > 0) {
                            setSelectedMember(members[0] as string);
                        }
                    }
                })
                .catch(err => console.error("Failed to load catch videos:", err))
                .finally(() => setLoadingCatch(false));
        }
    }, [selectedItem]);

    const saveSignatures = async (newSignatures: Signature[]) => {
        setSignatures(newSignatures);
        try {
            await fetch('/api/signatures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSignatures)
            });
        } catch (e) {
            console.error("Failed to save:", e);
            alert("저장에 실패했습니다.");
        }
    };

    const handleSaveItem = () => {
        if (!editingItem) return;
        const newItem: Signature = {
            id: Number(editingItem.id) || 0,
            title: editingItem.title || '',
            isNew: editingItem.isNew || false,
            category: editingItem.category || 'All',
            videoUrl: editingItem.videoUrl || '',
            thumbnailUrl: editingItem.thumbnailUrl || ''
        };
        let newSignatures = [...signatures];
        if ((editingItem as any)._isEditing) {
            const originalId = (editingItem as any)._originalId;
            const updateIndex = signatures.findIndex(s => s.id === originalId);
            if (updateIndex >= 0) {
                newSignatures[updateIndex] = newItem;
            }
        } else {
            newSignatures = [newItem, ...newSignatures];
        }
        saveSignatures(newSignatures);
        setEditingItem(null);
    };

    const deleteSignature = (id: number) => {
        if (confirm('삭제하시겠습니까?')) {
            const newSignatures = signatures.filter(s => s.id !== id);
            saveSignatures(newSignatures);
        }
    };

    const filteredItems = useMemo(() => {
        return signatures.filter(item => {
            if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && !item.id.toString().includes(searchQuery)) {
                return false;
            }
            if (activeFilter === 'all') return true;
            if (activeFilter === 'new') return item.isNew;
            const id = item.id;
            if (activeFilter === '1000') return id >= 1000 && id < 2000;
            if (activeFilter === '2000-4000') return id >= 2000 && id < 4000;
            if (activeFilter === '3000-9000') return id >= 3000 && id < 9000;
            if (activeFilter === '10000') return id >= 10000 && id < 20000;
            if (activeFilter === '20000-30000') return id >= 20000 && id < 30000;
            if (activeFilter === '30000') return id >= 30000;
            return true;
        }).sort((a, b) => b.id - a.id);
    }, [signatures, searchQuery, activeFilter]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 text-gray-800 font-sans pb-20">
            <div className="max-w-7xl mx-auto px-4 pt-6">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                        <IoIosArrowBack className="text-2xl" />
                    </button>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">Signature Gallery</h1>
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditMode(!isEditMode)} className={`p-2 rounded-full transition-colors ${isEditMode ? 'bg-pink-100 text-pink-600' : 'hover:bg-white/50 text-gray-600'}`}>
                            <FaEdit className="text-xl" />
                        </button>
                        {isEditMode && (
                            <button onClick={() => setEditingItem({ isNew: true, category: 'All' })} className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 shadow-lg transition-transform hover:scale-105">
                                <FaPlus className="text-xl" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative max-w-md mx-auto mb-10">
                    <input type="text" placeholder="Search by title or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 shadow-sm transition-all" />
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>

                <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-2">
                    {FILTERS.map((filter) => (
                        <button key={filter.id} onClick={() => setActiveFilter(filter.id)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeFilter === filter.id ? 'bg-pink-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-pink-50'}`}>
                            {filter.label}
                        </button>
                    ))}
                </div>

                <motion.div layout className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    <AnimatePresence mode='popLayout'>
                        {filteredItems.map((item) => (
                            <motion.div layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} key={item.id} onClick={() => { if (isEditMode) return; setSelectedItem(item); }} className="cursor-pointer group">
                                <div className="relative aspect-[16/9] rounded-3xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300">
                                    {item.thumbnailUrl ? (
                                        <img src={item.thumbnailUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 bg-black flex items-center justify-center">
                                            <FaPlay className="text-white text-4xl opacity-30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                                    {item.isNew && (
                                        <div className="absolute top-2 left-2 z-10">
                                            <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-1 rounded-full animate-pulse">NEW</span>
                                        </div>
                                    )}
                                    {isEditMode && (
                                        <div className="absolute top-2 right-2 flex gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={(e) => { e.stopPropagation(); setEditingItem({ ...item, _isEditing: true, _originalId: item.id } as any); }} className="p-2 bg-white/90 text-blue-500 rounded-full hover:bg-white shadow-lg">
                                                <FaEdit size={14} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteSignature(item.id); }} className="p-2 bg-white/90 text-red-500 rounded-full hover:bg-white shadow-lg">
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    )}
                                    {item.id ? (
                                        <div className="absolute bottom-2 left-2 z-10">
                                            <div className="text-xs font-mono text-white bg-black/50 px-2 py-1 rounded backdrop-blur-sm">{item.id}</div>
                                        </div>
                                    ) : null}
                                    {!isEditMode && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-50 group-hover:scale-100">
                                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                                <FaPlay className="text-white ml-1 text-xl" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingItem && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                            <h3 className="text-xl font-bold mb-4">{(editingItem as any)._isEditing ? 'Edit Item' : 'Add New Item'}</h3>
                            <div className="space-y-3">
                                <input type="number" placeholder="ID" className="w-full border p-2 rounded" value={editingItem.id || ''} onChange={e => setEditingItem({ ...editingItem, id: parseInt(e.target.value) })} />
                                <input type="text" placeholder="Title" className="w-full border p-2 rounded" value={editingItem.title || ''} onChange={e => setEditingItem({ ...editingItem, title: e.target.value })} />
                                <input type="text" placeholder="Video URL" className="w-full border p-2 rounded" value={editingItem.videoUrl || ''} onChange={e => setEditingItem({ ...editingItem, videoUrl: e.target.value })} />
                                <input type="text" placeholder="Thumbnail URL" className="w-full border p-2 rounded" value={editingItem.thumbnailUrl || ''} onChange={e => setEditingItem({ ...editingItem, thumbnailUrl: e.target.value })} />
                                <select className="w-full border p-2 rounded" value={editingItem.category || 'All'} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}>
                                    <option value="All">All</option>
                                    <option value="Alive">Alive</option>
                                </select>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="isNew" checked={editingItem.isNew || false} onChange={e => setEditingItem({ ...editingItem, isNew: e.target.checked })} />
                                    <label htmlFor="isNew">Mark as New</label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={handleSaveItem} className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600">Save</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Video Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-gradient-to-br from-cyan-50/98 via-pink-50/98 to-purple-50/98 backdrop-blur-md flex items-center justify-center p-4" onClick={() => { setSelectedItem(null); setSelectedCatchVideo(null); }}>
                        <button onClick={() => { setSelectedItem(null); setSelectedCatchVideo(null); }} className="absolute top-4 right-4 p-3 text-gray-700 hover:text-pink-600 transition-colors z-50 bg-white/80 rounded-full backdrop-blur-sm shadow-lg">
                            <FaTimes size={24} />
                        </button>

                        <div className="w-full max-w-6xl max-h-[90vh] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                            {/* Video Player */}
                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video relative">
                                {(selectedCatchVideo?.videoUrl || selectedItem.videoUrl) ? (
                                    <iframe
                                        key={selectedCatchVideo?.id || selectedItem.id}
                                        className="absolute"
                                        style={{
                                            width: '104%',
                                            height: '100%',
                                            left: '-40px',
                                            top: '0',
                                            border: 'none'
                                        }}
                                        src={(function () {
                                            let url = selectedCatchVideo?.videoUrl || selectedItem.videoUrl!;
                                            const isYoutube = url.includes('youtube') || url.includes('youtu.be');
                                            const isSoop = url.includes('sooplive.co.kr');
                                            const addParam = (u: string, p: string) => u.includes('?') ? `${u}&${p}` : `${u}?${p}`;
                                            if (isYoutube) {
                                                if (!url.includes('autoplay=')) url = addParam(url, 'autoplay=1');
                                            } else if (isSoop) {
                                                if (!url.includes('autoPlay=')) url = addParam(url, 'autoPlay=true');
                                                if (!url.includes('mutePlay=')) url = addParam(url, 'mutePlay=false');
                                            }
                                            return url;
                                        })()}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        title={selectedCatchVideo?.title || selectedItem.title}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full">
                                        <FaPlay className="text-white/30 text-6xl" />
                                    </div>
                                )}
                            </motion.div>

                            {/* Catch Videos */}
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl max-h-[250px] overflow-y-auto">
                                <h3 className="text-sm font-bold text-gray-800 mb-3">관련 캐치 영상</h3>

                                {loadingCatch ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                                    </div>
                                ) : catchVideos.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        캐치 영상 데이터를 불러오는 중이거나 없습니다.
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-2">
                                            {Array.from(new Set(catchVideos.map(v => v.member))).filter(m => m !== '기타').map(member => (
                                                <button key={member} onClick={() => setSelectedMember(member)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedMember === member ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                                    {member}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                            {catchVideos.filter(v => v.member === selectedMember).slice(0, 8).map((video) => (
                                                <div key={video.id} className="cursor-pointer group" onClick={() => setSelectedCatchVideo(video)}>
                                                    <div className={`relative aspect-video rounded-lg overflow-hidden transition-all ${selectedCatchVideo?.id === video.id ? 'ring-2 ring-pink-500 shadow-lg' : 'hover:ring-2 hover:ring-pink-300'}`}>
                                                        {video.thumbnailUrl ? (
                                                            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                                                                <FaPlay className="text-white/50 text-xs" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <FaPlay className="text-white text-xs" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {catchVideos.filter(v => v.member === selectedMember).length === 0 && selectedMember && (
                                                <div className="col-span-full text-center py-4 text-gray-500 text-xs">
                                                    선택한 멤버의 영상이 없습니다.
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
