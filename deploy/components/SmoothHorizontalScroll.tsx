'use client';

import { useEffect } from 'react';

export default function SmoothHorizontalScroll() {
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.shiftKey) return; // Shift + Wheel은 브라우저 기본 동작 따름

            // 이벤트 타겟에서 시작하여 상위로 올라가며 가로 스크롤 가능한 요소 찾기
            let target = e.target as HTMLElement | null;

            while (target && target !== document.body) {
                // 가로 스크롤이 내용보다 작아서 스크롤이 가능한지 확인
                if (target.scrollWidth > target.clientWidth) {
                    const style = window.getComputedStyle(target);
                    // overflow-x가 auto나 scroll인지 확인
                    if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
                        // 세로 스크롤(deltaY)이 가로 스크롤(deltaX)보다 클 때만 개입
                        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                            // 스크롤이 끝에 도달했는지 확인
                            const atLeft = target.scrollLeft === 0;
                            const atRight = Math.ceil(target.scrollLeft + target.clientWidth) >= target.scrollWidth;

                            // 왼쪽으로 가려는데 이미 왼쪽 끝이거나, 오른쪽으로 가려는데 이미 오른쪽 끝이면
                            // 이벤트를 가로채지 않고 상위로 보냄 (페이지 세로 스크롤 되도록)
                            if ((e.deltaY < 0 && atLeft) || (e.deltaY > 0 && atRight)) {
                                // 부모 중에 또 다른 가로 스크롤 영역이 있을 수 있으므로 계속 탐색
                                // 하지만 보통은 여기서 끝나서 수직 스크롤이 됨
                            } else {
                                // 가로 스크롤 실행
                                e.preventDefault();
                                target.scrollLeft += e.deltaY;
                                return; // 처리했으면 종료
                            }
                        }
                    }
                }
                target = target.parentElement;
            }
        };

        // passive: false는 preventDefault()를 호출하기 위해 필수
        window.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            window.removeEventListener('wheel', handleWheel);
        };
    }, []);

    return null;
}
