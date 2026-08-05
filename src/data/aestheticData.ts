import { ServiceItem, CTVUser, ReferralLead, Appointment, Promotion, VideoGuide, RealtimeNotification, ServiceFeedback, PayoutRequest } from "../types";

export const INITIAL_CTV: CTVUser = {
  id: "ctv-001",
  name: "Cộng Tác Viên",
  code: "SAOHAN-CTV",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  tier: "Bạc",
  totalRevenue: 0,
  totalCommission: 0,
  availableBalance: 0,
  pendingBalance: 0,
  totalReferrals: 0,
  successfulReferrals: 0,
  conversionRate: 0,
  phone: "",
  bankAccount: {
    bankName: "",
    accountNumber: "",
    accountHolder: ""
  }
};

export const SERVICES_DATA: ServiceItem[] = [
  {
    id: "srv-nang-nguc-3d",
    name: "Nâng Ngực Nội Soi Ergonomix Nano 6D",
    category: "phau-thuat",
    categoryName: "Phẫu Thuật Vòng 1",
    price: 65000000,
    originalPrice: 85000000,
    commissionRate: 15,
    commissionAmount: 9750000,
    duration: "60 - 90 phút",
    recoveryTime: "3 - 5 ngày",
    description: "Công nghệ nâng ngực không đau với túi Motiva Ergonomix 2 thông minh cảm ứng chip, giọt nước linh hoạt theo tư thế đứng nằm.",
    image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
    beforeAfter: {
      before: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80",
      after: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
      customerAge: "Chị Thanh Vân (29 tuổi, Hà Nội)",
      treatmentDetails: "Nâng ngực Ergonomix 315cc, đường chân ngực giấu sẹo 99%"
    },
    features: [
      "Túi độn Nano chip kiểm tra thông số an toàn chuẩn FDA",
      "Kỹ thuật khâu vi phẫu đường giấu sẹo trùng nếp gấp",
      "Bảo hành túi độn trọn đời toàn cầu",
      "Nâng ngực không cần đặt ống dẫn lưu"
    ],
    isPopular: true
  },
  {
    id: "srv-nang-mui-nanoform",
    name: "Nâng Mũi Bán Cấu Trúc NanoForm S-Line",
    category: "phau-thuat",
    categoryName: "Thẩm Mỹ Khuôn Mặt",
    price: 32000000,
    originalPrice: 42000000,
    commissionRate: 18,
    commissionAmount: 5760000,
    duration: "45 phút",
    recoveryTime: "5 - 7 ngày",
    description: "Dáng mũi S-Line mềm mại tự nhiên chuẩn tỷ lệ vàng Đông Á, sụn sinh học Nanoform siêu nhẹ bám bọc đầu mũi sụn tự thân.",
    image: "https://images.unsplash.com/photo-1512290900673-4554c2596489?auto=format&fit=crop&w=800&q=80",
    beforeAfter: {
      before: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
      after: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80",
      customerAge: "Chị Ngọc Trinh (26 tuổi, TPHCM)",
      treatmentDetails: "Nâng mũi S-line sụn NanoForm kết hợp bọc đệm Megaderm"
    },
    features: [
      "Sụn NanoForm sinh học mô phỏng sụn thật 99%",
      "Tạo dáng S-Line cao tây hoặc tự nhiên theo mong muốn",
      "Không bóng đỏ, không lộ sóng sụn trọn đời",
      "Tặng gói chiếu tia Plasma sưng đau nhanh gấp 3 lần"
    ],
    isPopular: true
  },
  {
    id: "srv-cat-mi-deep-layer",
    name: "Cắt Mí Mở Rộng Góc Mắt Deep Layer 8D",
    category: "phau-thuat",
    categoryName: "Thẩm Mỹ Khuôn Mặt",
    price: 15000000,
    originalPrice: 20000000,
    commissionRate: 20,
    commissionAmount: 3000000,
    duration: "35 phút",
    recoveryTime: "3 - 5 ngày",
    description: "Loại bỏ nếp da chùng, mỡ thừa mí mắt, tạo đường nếp mí sâu tự nhiên quyến rũ không bóc tách rầm rộ.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
    beforeAfter: {
      before: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
      after: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80",
      customerAge: "Chị Thảo My (31 tuổi, Đà Nẵng)",
      treatmentDetails: "Cắt mí 8D giấu chỉ nội soi kết hợp lấy mỡ mí trên"
    },
    features: [
      "Đường khâu chỉ vi phẫu mảnh như tơ không để lại sẹo",
      "Triệt tiêu hoàn toàn mỡ chùng tuổi 30+",
      "Nếp mí sâu hút ánh nhìn tự nhiên như mí bẩm sinh"
    ],
    isPopular: true
  },
  {
    id: "srv-pico-laser",
    name: "Laser PicoSuites Trẻ Hóa & Điều Trị Nám Tận Gốc",
    category: "da-lieu",
    categoryName: "Trị Liệu Da Chuyên Sâu",
    price: 4500000,
    originalPrice: 7000000,
    commissionRate: 22,
    commissionAmount: 990000,
    duration: "40 phút",
    recoveryTime: "Không nghỉ dưỡng",
    description: "Bước sóng Pico giây phá tan hắc tố tàn nhang, đốm nâu tầng sâu, kích thích tăng sinh Collagen làm da căng mịn.",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80",
    beforeAfter: {
      before: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
      after: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
      customerAge: "Chị Lan Hương (38 tuổi, Hải Phòng)",
      treatmentDetails: "Liệu trình 5 buổi Laser PicoSuites kết hợp tiêm Meso HA"
    },
    features: [
      "Công nghệ laser bước sóng cực ngắn Pico giây chuẩn Y Khoa",
      "Không đỏ rát, không thâm bong da",
      "Bảo hành sạch nám đốm nâu theo hợp đồng cam kết"
    ]
  },
  {
    id: "srv-profhilo-meso",
    name: "Tiêm Vi Điểm Profhilo Trẻ Hóa Tế Bào Tầng Sâu",
    category: "tre-hoa",
    categoryName: "Trẻ Hóa Nội Nguồn",
    price: 18000000,
    originalPrice: 24000000,
    commissionRate: 20,
    commissionAmount: 3600000,
    duration: "30 phút",
    recoveryTime: "1 ngày",
    description: "Axit Hyaluronic tinh khiết nồng độ 64mg/2ml tái cấu trúc mô da lỏng lẻo, tạo độ căng bóng nâng cơ mặt chỉ sau 24 giờ.",
    image: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=800&q=80",
    beforeAfter: {
      before: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80",
      after: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
      customerAge: "Chị Minh Thùy (42 tuổi, TPHCM)",
      treatmentDetails: "Tiêm 5 điểm BAP Profhilo Ý cải thiện nếp nhăn & sụp má"
    },
    features: [
      "Nhập khẩu chính ngạch IBSA Italy",
      "Kỹ thuật tiêm BAP 5 điểm không đau không bầm",
      "Tăng sinh Collagen & Elastin gấp 12 lần"
    ],
    isPopular: true
  },
  {
    id: "srv-vaser-lipo",
    name: "Hút Mỡ Siêu Âm Vaser Lipo Tạo Hình Vòng 2 S-Line",
    category: "voc-dang",
    categoryName: "Thẩm Mỹ Vóc Dáng",
    price: 48000000,
    originalPrice: 65000000,
    commissionRate: 16,
    commissionAmount: 7680000,
    duration: "90 phút",
    recoveryTime: "3 - 5 ngày",
    description: "Hút mỡ bằng sóng siêu âm đa tần hóa lỏng mỡ nhẹ nhàng, siết eo thon gọn và làm săn chắc da bụng không nhăn nheo.",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
    beforeAfter: {
      before: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
      after: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80",
      customerAge: "Chị Hoàng Hà (35 tuổi, Cần Thơ)",
      treatmentDetails: "Hút mỡ bụng eo hông Vaser Lipo giảm 14cm vòng eo"
    },
    features: [
      "Hóa lỏng mỡ bằng sóng siêu âm không xâm lấn mô cơ",
      "Thu hẹp vòng eo từ 8 - 18cm ngay sau khi thực hiện",
      "Định hình cơ bụng căng mịn"
    ]
  }
];

export const INITIAL_LEADS: ReferralLead[] = [];

export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const INITIAL_PAYOUT_REQUESTS: PayoutRequest[] = [];

export const PROMOTIONS: Promotion[] = [
  {
    id: "promo-01",
    title: "Đại Tiệc Nâng Ngực Ergonomix 6D - Tặng Gói Chiếu Plasma Trị Giá 10Tr",
    code: "DELUXE-BOOB-2026",
    discount: "Giảm ngay 20.000.000đ",
    validUntil: "2026-08-15",
    serviceId: "srv-nang-nguc-3d",
    bannerImage: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
    description: "Chương trình ưu đãi vàng dành cho CTV giới thiệu khách nâng ngực tháng 8. Nhân đôi điểm thưởng tích lũy Kim Cương.",
    ctvBonusCommission: 5 // +5% extra
  },
  {
    id: "promo-02",
    title: "Combo Nâng Mũi NanoForm + Cắt Mí Deep Layer Giảm 35%",
    code: "COMBO-FACE-8D",
    discount: "Ưu đãi Combo -35%",
    validUntil: "2026-08-10",
    bannerImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
    description: "Tái sinh diện mạo toàn diện. Khách hàng được nhận voucher 2.000.000đ chăm sóc da sau phẫu thuật.",
    ctvBonusCommission: 3
  },
  {
    id: "promo-03",
    title: "Tiêm Profhilo Trẻ Hóa Mua 2 Tặng 1 Liệu Trình Hydro-Facial",
    code: "PROFHILO-GLOW",
    discount: "Tặng 1 Buổi Hydro-Facial",
    validUntil: "2026-08-20",
    serviceId: "srv-profhilo-meso",
    bannerImage: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=800&q=80",
    description: "Dành riêng cho khách hàng trẻ hóa đón mùa thu. Nhận diện căng bóng chỉ sau 48h.",
    ctvBonusCommission: 2
  }
];

export const VIDEO_GUIDES: VideoGuide[] = [
  {
    id: "vid-01",
    title: "Bí quyết tư vấn khách hàng nâng ngực 3D tỷ lệ chốt sale 85%",
    category: "Kỹ Năng Tư Vấn",
    duration: "12:45",
    thumbnail: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80",
    targetAudience: "Khách hàng nữ 25 - 45 tuổi muốn cải thiện vòng 1 sau sinh",
    scriptHighlights: [
      "Bước 1: Lắng nghe mong muốn của khách (tự nhiên hay sexy nhô cao).",
      "Bước 2: Sử dụng công cụ 3D KOREAN STAR cho khách xem mô phỏng số đo thực tế.",
      "Bước 3: Giải thích tính năng bảo hành túi chíp trọn đời toàn cầu.",
      "Bước 4: Đăng ký lịch hẹn thử túi thực tế với Bác sĩ Trưởng Khoa."
    ]
  },
  {
    id: "vid-02",
    title: "Giải đáp 10 câu hỏi FAQ phổ biến về Nâng mũi S-Line NanoForm",
    category: "Kiến Thức Dịch Vụ",
    duration: "08:30",
    thumbnail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
    targetAudience: "Khách hàng lo sợ đau, sợ bầm tím, sợ lệch sóng mũi",
    scriptHighlights: [
      "Sụn NanoForm có độ tương thích sinh học 99.9%, không bị cơ thể đào thải.",
      "Công nghệ chiếu tia Plasma lạnh giúp vết thương khô nhanh chỉ sau 48h.",
      "Thực hiện trực tiếp trong phòng phẫu thuật vô trùng chuẩn Quốc tế."
    ]
  },
  {
    id: "vid-03",
    title: "Hướng dẫn cài đặt & chia sẻ Link/QR Code CTV tăng tương tác Facebook/Zalo",
    category: "Công Cụ CTV",
    duration: "05:15",
    thumbnail: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=600&q=80",
    targetAudience: "Cộng tác viên mới tham gia mạng lưới KOREAN STAR",
    scriptHighlights: [
      "Cách tùy chỉnh mã giới thiệu mang dấu ấn cá nhân.",
      "Cách nhúng mã QR vào hình ảnh feedback Trước/Sau.",
      "Cách theo dõi hoa hồng biến động thời gian thực trên App."
    ]
  }
];

export const REALTIME_NOTIFICATIONS_SEED: RealtimeNotification[] = [
  {
    id: "notif-01",
    title: "Giải Ngân Hoa Hồng VietQR",
    text: "Hệ thống vừa giải ngân 4.500.000 VNĐ hoa hồng dịch vụ Nâng Ngực Ergonomix Nano qua VietQR.",
    time: "Vừa xong",
    type: "commission",
    isRead: false
  },
  {
    id: "notif-02",
    title: "Lịch Hẹn Khám CRM Mới",
    text: "Khách hàng Trần Thanh Mai đã đặt lịch dịch vụ Căng Da Mặt Deep-SMAS vào 14:30 chiều nay.",
    time: "15 phút trước",
    type: "lead",
    isRead: false
  },
  {
    id: "notif-03",
    title: "Khuyến Mãi Tri Ơn CTV VIP",
    text: "Tặng thưởng thêm +5% hoa hồng cho tất cả lịch hẹn phẫu thuật hoàn tất trong tuần này!",
    time: "1 giờ trước",
    type: "promo",
    isRead: false
  },
  {
    id: "notif-04",
    title: "Cảnh Báo Hậu Phẫu AI",
    text: "Khách hàng Lê Thu Trâm đã gửi hình ảnh checkin ngày 3 hậu phẫu - Chỉ số an toàn 100%.",
    time: "3 giờ trước",
    type: "postop",
    isRead: true
  },
  {
    id: "notif-05",
    title: "Kết Nối Zalo Bot & OneSignal",
    text: "Hệ thống thông báo Realtime Zalo Bot API & OneSignal Web Push đã kích hoạt thành công.",
    time: "5 giờ trước",
    type: "system",
    isRead: true
  }
];

export const INITIAL_FEEDBACKS: ServiceFeedback[] = [
  {
    id: "fb-01",
    serviceId: "srv-nang-nguc-3d",
    serviceName: "Nâng Ngực Nội Soi Ergonomix Nano 6D",
    customerName: "Chị Thanh Vân",
    customerAge: "29 tuổi (Hà Nội)",
    doctorName: "Bs. CKII Nguyễn Văn Hùng",
    rating: 5,
    beforeImage: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80",
    afterImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
    reviewText: "Kết quả nâng ngực Ergonomix quá tuyệt vời, túi mềm mại tự nhiên như thật, phẫu thuật đường chân ngực giấu sẹo 99%, phục hồi cực kỳ nhanh!",
    treatmentDetails: "Nâng ngực Ergonomix 315cc, đường chân ngực giấu sẹo 99%",
    recoveryDays: "3 - 5 ngày",
    date: "2026-07-28",
    images: [
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80"
    ]
  },
  {
    id: "fb-02",
    serviceId: "srv-nang-mui-nanoform",
    serviceName: "Nâng Mũi Bán Cấu Trúc NanoForm S-Line",
    customerName: "Chị Ngọc Trinh",
    customerAge: "26 tuổi (TPHCM)",
    doctorName: "Bs. CKI Trần Thị Mai",
    rating: 5,
    beforeImage: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
    afterImage: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80",
    reviewText: "Dáng mũi S-line mềm mại thanh thoát chuẩn tỷ lệ vàng Đông Á. Chiếu Plasma giúp vết thương khô siêu nhanh không bầm đỏ.",
    treatmentDetails: "Nâng mũi S-line sụn NanoForm kết hợp bọc đệm Megaderm",
    recoveryDays: "5 - 7 ngày",
    date: "2026-07-30",
    images: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80"
    ]
  },
  {
    id: "fb-03",
    serviceId: "srv-cat-mi-deep-layer",
    serviceName: "Cắt Mí Mở Rộng Góc Mắt Deep Layer 8D",
    customerName: "Chị Thảo My",
    customerAge: "31 tuổi (Đà Nẵng)",
    doctorName: "Bs. CKII Nguyễn Văn Hùng",
    rating: 5,
    beforeImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
    afterImage: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80",
    reviewText: "Nếp mí mới sâu hút, tự nhiên như mí bẩm sinh, không bóc tách rầm rộ nên mắt hết sưng chỉ sau 3 ngày.",
    treatmentDetails: "Cắt mí 8D giấu chỉ nội soi kết hợp lấy mỡ mí trên",
    recoveryDays: "3 - 5 ngày",
    date: "2026-08-01",
    images: [
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80"
    ]
  }
];

