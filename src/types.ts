export type UserRole = "ctv" | "admin" | "editor" | "accountant" | "customer" | "team_leader";
export interface ServiceFeedback {
  id: string;
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerAge: string;
  doctorName: string;
  rating: number;
  beforeImage: string;
  afterImage: string;
  reviewText: string;
  treatmentDetails: string;
  recoveryDays: string;
  date: string;
  images?: string[];
}

export interface QuickFeatureItem {
  id: string;
  title: string;
  sub: string;
  iconName: string;
  color: string;
  isActive?: boolean;
}
export interface ServiceItem {
  id: string;
  name: string;
  category: "phau-thuat" | "da-lieu" | "tre-hoa" | "voc-dang";
  categoryName: string;
  price: number;
  originalPrice: number;
  commissionRate: number; // e.g. 15 for 15%
  commissionAmount: number;
  duration: string;
  recoveryTime: string;
  description: string;
  image: string;
  beforeAfter: {
    before: string;
    after: string;
    customerAge: string;
    treatmentDetails: string;
  };
  features: string[];
  isPopular?: boolean;
}

export interface CTVUser {
  id: string;
  uid?: string;
  name: string;
  code: string;
  avatar: string;
  tier: "Bạc" | "Vàng" | "Bạch Kim" | "Kim Cương";
  totalRevenue: number;
  totalCommission: number;
  availableBalance: number;
  pendingBalance: number;
  totalReferrals: number;
  successfulReferrals: number;
  conversionRate: number;
  phone: string;
  zaloChatId?: string;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  // Trường dành riêng cho Trưởng nhóm CTV & Trạng thái tài khoản
  role?: string;
  teamLeaderId?: string;    // Mã Trưởng nhóm quản lý CTV này
  teamMemberCodes?: string[]; // Danh sách Mã CTV thuộc nhóm (chỉ dành cho team_leader)
  teamName?: string;          // Tên nhóm CTV
  status?: "active" | "suspended";
  isSuspended?: boolean;
}

export interface TeamRevenueTransfer {
  id: string;
  fromCtvCode: string;
  fromCtvName: string;
  toLeaderCode: string;
  toLeaderName: string;
  amount: number;
  commission: number;
  serviceName: string;
  note?: string;
  transferredAt: string;
  status: "pending" | "accepted" | "rejected";
}

export interface ReferralLead {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  ctvCode: string;
  ctvName: string;
  createdAt: string;
  status: "Mới" | "Chờ xác nhận" | "Đã đặt lịch" | "Đã xác nhận" | "Đã tư vấn" | "Đang điều trị" | "Đã hoàn thành" | "Hủy" | "Đã hủy";
  estimatedValue: number;
  commission: number;
  doctorAssigned?: string;
  appointmentDate?: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  doctorName: string;
  date: string;
  time: string;
  status: "Chờ xác nhận" | "Đã xác nhận" | "Đang điều trị" | "Hoàn thành" | "Đã hủy";
  appointmentType?: "Lịch tư vấn" | "Lịch tái khám";
  notes?: string;
  ctvCode?: string;
  ctvName?: string;
  ctvPhone?: string;
  customerMedia?: string;
  customerMediaType?: "image" | "video";
  isCommissionWithdrawn?: boolean;
  withdrawnAt?: string;
  payoutRequestId?: string;
}

export interface SkinAnalysisResult {
  skinType: string;
  overallScore: number;
  scores: {
    pore: number;
    pigmentation: number;
    moisture: number;
    wrinkle: number;
    elasticity: number;
    acne: number;
  };
  summary: string;
  keyConcerns: string[];
  treatmentPlan: {
    step: number;
    name: string;
    frequency: string;
    purpose: string;
    estimatedCost: string;
  }[];
  homecareRoutine: string[];
}

export interface ImplantConfig {
  volumeCc: number;
  profile: "Low" | "Moderate Plus" | "High" | "Extra High";
  shape: "Round" | "Ergonomix" | "Anatomical";
  gelType: "ProgressiveGel" | "UltimaGel" | "CohesiveIII";
  surface: "NanoSurface" | "Smooth" | "Microthane";
}

export interface PostOpCheckin {
  id: string;
  date: string;
  dayPostOp: number;
  serviceName: string;
  painLevel: number; // 1-10
  swellingLevel: "Nhẹ" | "Vừa" | "Sưng nhiều";
  temperature: number;
  photoUrl?: string;
  symptoms: string[];
  aiHealthStatus: "An toàn" | "Cần theo dõi" | "Cảnh báo bác sĩ";
  doctorNotes?: string;
}

export interface Promotion {
  id: string;
  title: string;
  code: string;
  discount: string;
  validUntil: string;
  serviceId?: string;
  bannerImage: string;
  description: string;
  ctvBonusCommission: number; // extra commission %
}

export interface VideoGuide {
  id: string;
  title: string;
  category: string;
  duration: string;
  thumbnail: string;
  videoUrl?: string;
  targetAudience: string;
  scriptHighlights: string[];
}

export interface RealtimeNotification {
  id: string;
  title?: string;
  time: string;
  text: string;
  type: "commission" | "lead" | "postop" | "promo" | "system";
  isRead?: boolean;
  targetCtvCode?: string;
}

export type PayoutStatus = 
  | "Chờ kế toán kiểm tra"
  | "Kế toán đã kiểm tra - Chờ Admin duyệt"
  | "Admin đã phê duyệt - Chờ kế toán chi tiền"
  | "Hoàn thành - Đã chi tiền VietQR"
  | "Từ chối yêu cầu";

export interface PayoutAuditLog {
  id: string;
  payoutId: string;
  timestamp: string;
  actorRole: "ctv" | "accountant" | "admin" | "system";
  actorName: string;
  action: string;
  previousStatus?: string;
  newStatus: string;
  notes?: string;
  transactionRef?: string;
  proofImage?: string;
}

export interface PayoutRequest {
  id: string;
  ctvUserId?: string;
  ctvCode: string;
  ctvName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  requestedAt: string;
  status: PayoutStatus;
  transactionRef?: string;
  proofImage?: string;
  verifiedByAccountantAt?: string;
  approvedByAdminAt?: string;
  completedAt?: string;
  rejectedReason?: string;
  selectedAppointmentIds?: string[];
  selectedInvoiceIds?: string[];
  deductedRevenueAmount?: number;
  logs?: PayoutAuditLog[];
}

export interface AppointmentInvoice {
  id: string;
  appointmentId: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  ctvCode?: string;
  ctvName?: string;
  doctorName?: string;
  totalAmount: number;
  depositAmount: number;
  depositPaidAt?: string;
  remainingAmount: number;
  remainingPaidAt?: string;
  paymentStatus: "Chờ cọc" | "Đã cọc" | "Đã thu đủ (Hoàn thành)" | "Đã hủy";
  paymentMethod: "VietQR / Chuyển khoản" | "Tiền mặt" | "Thẻ ATM/Visa";
  commissionRate: number;
  commissionAmount: number;
  createdAt: string;
  notes?: string;
  transferProofImage?: string;
  isCommissionWithdrawn?: boolean;
  withdrawnAt?: string;
  payoutRequestId?: string;
}
