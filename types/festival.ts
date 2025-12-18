export interface DonationData {
    messageId: string;
    createDate: string;
    relativeTime?: string; // 방송 시작 대비 상대 시간 (HH:MM:SS)
    ballonUserName: string;
    ballonCount: number;
    message: string;
    messageDate: string;
    targetBjName: string;
    targetBjGroup: string;
}

export interface BjStats {
    bjName: string;
    totalBalloons: number;
    donationCount: number;
    topDonor: string;
    topDonorAmount: number;
    lastUpdate: string;
}

export interface UserStats {
    userName: string;
    totalBalloons: number;
    donationCount: number;
    targetBjs: string[];
}

export interface RealtimeStats {
    totalBalloons: number;
    totalDonations: number;
    uniqueDonors: number;
    uniqueBjs: number;
    lastUpdate: string;
}

export interface BjKeywordMapping {
    bjName: string;
    keywords: string[]; // 해당 BJ로 식별될 수 있는 키워드들 (예: "다냥", "다냥이")
}
