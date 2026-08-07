export interface BankInfo {
  code: string;
  shortName: string;
  fullName: string;
  logo: string;
  logoUrl?: string;
}

export const VIETNAM_BANKS: BankInfo[] = [
  {
    code: "VCB",
    shortName: "Vietcombank",
    fullName: "Ngân hàng TMCP Ngoại Thương Việt Nam",
    logo: "https://api.vietqr.io/img/VCB.png"
  },
  {
    code: "MB",
    shortName: "MB Bank",
    fullName: "Ngân hàng TMCP Quân Đội",
    logo: "https://api.vietqr.io/img/MB.png"
  },
  {
    code: "TCB",
    shortName: "Techcombank",
    fullName: "Ngân hàng TMCP Kỹ Thương Việt Nam",
    logo: "https://api.vietqr.io/img/TCB.png"
  },
  {
    code: "VPB",
    shortName: "VPBank",
    fullName: "Ngân hàng TMCP Việt Nam Thịnh Vượng",
    logo: "https://api.vietqr.io/img/VPB.png"
  },
  {
    code: "ACB",
    shortName: "ACB",
    fullName: "Ngân hàng TMCP Á Châu",
    logo: "https://api.vietqr.io/img/ACB.png"
  },
  {
    code: "BIDV",
    shortName: "BIDV",
    fullName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam",
    logo: "https://api.vietqr.io/img/BIDV.png"
  },
  {
    code: "VBA",
    shortName: "Agribank",
    fullName: "Ngân hàng Nông nghiệp và Phát triển Nông thôn VN",
    logo: "https://api.vietqr.io/img/VBA.png"
  },
  {
    code: "TPB",
    shortName: "TPBank",
    fullName: "Ngân hàng TMCP Tiên Phong",
    logo: "https://api.vietqr.io/img/TPB.png"
  },
  {
    code: "CTG",
    shortName: "VietinBank",
    fullName: "Ngân hàng TMCP Công Thương Việt Nam",
    logo: "https://api.vietqr.io/img/CTG.png"
  },
  {
    code: "STB",
    shortName: "Sacombank",
    fullName: "Ngân hàng TMCP Sài Gòn Thương Tín",
    logo: "https://api.vietqr.io/img/STB.png"
  },
  {
    code: "HDB",
    shortName: "HDBank",
    fullName: "Ngân hàng TMCP Phát triển TP.HCM",
    logo: "https://api.vietqr.io/img/HDB.png"
  },
  {
    code: "VIB",
    shortName: "VIB",
    fullName: "Ngân hàng TMCP Quốc Tế Việt Nam",
    logo: "https://api.vietqr.io/img/VIB.png"
  },
  {
    code: "SEAB",
    shortName: "SeABank",
    fullName: "Ngân hàng TMCP Đông Nam Á",
    logo: "https://api.vietqr.io/img/SEAB.png"
  },
  {
    code: "MSB",
    shortName: "MSB",
    fullName: "Ngân hàng TMCP Hàng Hải Việt Nam",
    logo: "https://api.vietqr.io/img/MSB.png"
  },
  {
    code: "SHB",
    shortName: "SHB",
    fullName: "Ngân hàng TMCP Sài Gòn - Hà Nội",
    logo: "https://api.vietqr.io/img/SHB.png"
  },
  {
    code: "OCB",
    shortName: "OCB",
    fullName: "Ngân hàng TMCP Phương Đông",
    logo: "https://api.vietqr.io/img/OCB.png"
  },
  {
    code: "LPB",
    shortName: "LPBank",
    fullName: "Ngân hàng TMCP Lộc Phát Việt Nam",
    logo: "https://api.vietqr.io/img/LPB.png"
  },
  {
    code: "EIB",
    shortName: "Eximbank",
    fullName: "Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam",
    logo: "https://api.vietqr.io/img/EIB.png"
  }
];

export const getBankLogo = (bankNameOrCode: string): string => {
  if (!bankNameOrCode) return "https://api.vietqr.io/img/VCB.png";
  const clean = bankNameOrCode.toLowerCase();
  const found = VIETNAM_BANKS.find(
    (b) =>
      clean.includes(b.code.toLowerCase()) ||
      clean.includes(b.shortName.toLowerCase()) ||
      clean.includes(b.fullName.toLowerCase())
  );
  return found ? found.logo : "https://api.vietqr.io/img/VCB.png";
};

export const generateVietQRUrl = (
  bankCode: string = "MB",
  accountNumber: string = "888899998888",
  accountName: string = "BENH VIEN THAM MY KOREAN STAR",
  amount: number = 0,
  addInfo: string = "THANH TOAN THAM MY"
): string => {
  const cleanBank = (bankCode || "MB").toUpperCase();
  const cleanAcc = encodeURIComponent((accountNumber || "888899998888").trim());
  const cleanName = encodeURIComponent((accountName || "BENH VIEN THAM MY KOREAN STAR").trim());
  const cleanInfo = encodeURIComponent((addInfo || "THANH TOAN THAM MY").trim());

  return `https://img.vietqr.io/image/${cleanBank}-${cleanAcc}-compact2.png?amount=${amount}&addInfo=${cleanInfo}&accountName=${cleanName}`;
};
