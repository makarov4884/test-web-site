const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'streamers.json');
const streamers = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Define color palette (Tailwind classes for bg and text)
const palette = [
    { bg: 'bg-red-100', text: 'text-red-700' },
    { bg: 'bg-orange-100', text: 'text-orange-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-green-100', text: 'text-green-700' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-teal-100', text: 'text-teal-700' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    { bg: 'bg-sky-100', text: 'text-sky-700' },
    { bg: 'bg-blue-100', text: 'text-blue-700' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-violet-100', text: 'text-violet-700' },
    { bg: 'bg-purple-100', text: 'text-purple-700' },
    { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700' },
    { bg: 'bg-pink-100', text: 'text-pink-700' },
    { bg: 'bg-rose-100', text: 'text-rose-700' },
];

// Specific assignments
const specificColors = {
    'pyh3646': { bg: 'bg-blue-100', text: 'text-blue-700' }, // Park Jin-woo (Blue)
    'danang1004': { bg: 'bg-sky-100', text: 'text-sky-700' }, // Danyang (Sky Blue)
    'kkimkin0326': { bg: 'bg-zinc-800', text: 'text-white border-zinc-600' }, // Kkamang (Black/Dark) - Optional
};

const updatedStreamers = streamers.map((s, index) => {
    let color = specificColors[s.bjId];
    if (!color) {
        // Assign distinct color from palette based on index
        color = palette[index % palette.length];
    }
    return { ...s, color };
});

fs.writeFileSync(filePath, JSON.stringify(updatedStreamers, null, 2), 'utf-8');
console.log('Updated streamers.json with colors.');
