export default function Footer() {
    return (
        <footer className="w-full border-t border-pink-200/30 bg-white/50 backdrop-blur-sm py-12 mt-20">
            <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-500 to-pink-500 bg-clip-text text-transparent">Team Jinu</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Team Jinu 커뮤니티는 방송인과 팬들을 위한 소통 공간입니다.
                    </p>
                </div>

                <div>
                    <h4 className="font-semibold mb-4 text-gray-800">메인 메뉴</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li><a href="/" className="hover:text-pink-600 transition-colors">홈</a></li>
                        <li><a href="/schedule" className="hover:text-pink-600 transition-colors">일정</a></li>
                        <li><a href="/live" className="hover:text-pink-600 transition-colors">라이브</a></li>
                        <li><a href="/member" className="hover:text-pink-600 transition-colors">멤버</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-semibold mb-4 text-gray-800">커뮤니티</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li><a href="/notice" className="hover:text-pink-600 transition-colors">공지</a></li>
                        <li><a href="/board/free" className="hover:text-pink-600 transition-colors">게시판</a></li>
                        <li><a href="/signature" className="hover:text-pink-600 transition-colors">서명</a></li>
                    </ul>
                </div>
            </div>
            <div className="container mx-auto px-4 mt-12 pt-8 border-t border-pink-200/30 text-center text-sm text-gray-500">
                &copy; 2024 Team Jinu. All rights reserved.
            </div>
        </footer>
    );
}
